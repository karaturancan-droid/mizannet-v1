use crate::db::DbPool;
use crate::helpers::restore_row_generic;
use rusqlite::types::ValueRef;
use rusqlite::Connection;
use serde_json::{Map, Value as JsonValue};
use tauri::State;

use std::thread;
use std::time::Duration;
use chrono::Local;
use std::fs;
use std::path::PathBuf;

const ALL_TABLES: &[&str] = &[
    "companies",
    "ledger_entries",
    "recycle_bin",
    "products",
    "stock_movements",
    "vehicles",
    "vehicle_expenses",
    "tires",
    "tax_items",
    "workers",
    "leaves",
    "overtimes",
    "payrolls",
    "documents",
    "worker_advances",
    "notifications",
    "invoices",
    "settings",
    "import_hashes",
    "asistan_messages",
    "chat_sessions",
    "telegram_bots",
    "telegram_allowlist",
    "telegram_users",
    "telegram_messages",
    "telegram_drafts",
    "telegram_requests",
    "hesap_plani",
    "kanuni_parametreler",
    "is_kanunu_kurallar",
];

fn sql_value_ref_to_json(v: ValueRef) -> JsonValue {
    match v {
        ValueRef::Null => JsonValue::Null,
        ValueRef::Integer(i) => JsonValue::from(i),
        ValueRef::Real(f) => JsonValue::from(f),
        ValueRef::Text(t) => JsonValue::from(String::from_utf8_lossy(t).to_string()),
        ValueRef::Blob(_) => JsonValue::Null,
    }
}

fn dump_table(conn: &Connection, table: &str) -> Result<Vec<JsonValue>, String> {
    let sql = format!("SELECT * FROM {}", table);
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let col_names: Vec<String> = stmt.column_names().iter().map(|s| s.to_string()).collect();
    let mut rows = stmt.query([]).map_err(|e| e.to_string())?;
    let mut result = Vec::new();
    while let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let mut map = Map::new();
        for (i, name) in col_names.iter().enumerate() {
            let value_ref = row.get_ref(i).map_err(|e| e.to_string())?;
            map.insert(name.clone(), sql_value_ref_to_json(value_ref));
        }
        result.push(JsonValue::Object(map));
    }
    Ok(result)
}

#[tauri::command]
pub fn export_backup(pool: State<DbPool>) -> Result<String, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let mut root = Map::new();
    for table in ALL_TABLES {
        let rows = dump_table(&conn, table)?;
        root.insert(table.to_string(), JsonValue::Array(rows));
    }
    root.insert(
        "exported_at".to_string(),
        JsonValue::from(chrono::Utc::now().to_rfc3339()),
    );
    serde_json::to_string_pretty(&JsonValue::Object(root)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn import_backup(pool: State<DbPool>, json: String) -> Result<(), String> {
    let mut conn = pool.get_conn().map_err(|e| e.to_string())?;
    let parsed: JsonValue = serde_json::from_str(&json).map_err(|e| e.to_string())?;
    let obj = parsed.as_object().ok_or_else(|| "Gecersiz yedek dosyasi".to_string())?;

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    for table in ALL_TABLES {
        if let Some(JsonValue::Array(rows)) = obj.get(*table) {
            for row in rows {
                restore_row_generic(&tx, table, row)?;
            }
        }
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

pub fn start_auto_backup_worker(data_dir: PathBuf, pool: r2d2::Pool<r2d2_sqlite::SqliteConnectionManager>) {
    thread::spawn(move || {
        let run_backup = |conn: &rusqlite::Connection| {
            let mut root = Map::new();
            let mut success = true;
            for table in ALL_TABLES {
                match dump_table(conn, table) {
                    Ok(rows) => { root.insert(table.to_string(), JsonValue::Array(rows)); }
                    Err(_) => { success = false; }
                }
            }
            
            if success {
                if let Ok(json_str) = serde_json::to_string(&JsonValue::Object(root)) {
                    let backup_dir = data_dir.join("backups");
                    let _ = fs::create_dir_all(&backup_dir);
                    
                    let now = Local::now().format("%Y%m%d_%H%M%S").to_string();
                    let file_path = backup_dir.join(format!("madenapp_otomatik_yedek_{}.json", now));
                    
                    let _ = fs::write(file_path, json_str);
                    
                    if let Ok(entries) = fs::read_dir(&backup_dir) {
                        let mut files: Vec<_> = entries
                            .filter_map(|e| e.ok())
                            .filter(|e| e.path().is_file() && e.file_name().to_string_lossy().starts_with("madenapp_otomatik_yedek_"))
                            .collect();
                            
                        files.sort_by_key(|a| std::cmp::Reverse(a.metadata().and_then(|m| m.modified()).unwrap_or(std::time::SystemTime::UNIX_EPOCH)));
                        
                        if files.len() > 7 {
                            for file in files.iter().skip(7) {
                                let _ = fs::remove_file(file.path());
                            }
                        }
                    }
                }
            }
        };

        // Run an initial backup shortly after startup
        thread::sleep(Duration::from_secs(10));
        if let Ok(conn) = pool.get() {
            run_backup(&conn);
        }

        loop {
            thread::sleep(Duration::from_secs(12 * 60 * 60)); // Every 12 hours
            if let Ok(conn) = pool.get() {
                run_backup(&conn);
            }
        }
    });
}
