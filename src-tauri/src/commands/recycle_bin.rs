use crate::db::DbPool;
use crate::helpers::{now_iso, restore_row_generic, table_for_entity_type};
use crate::models::RecycleBinItem;
use chrono::{DateTime, Utc};
use tauri::State;

#[tauri::command]
pub fn list_recycle_bin(pool: State<DbPool>) -> Result<Vec<RecycleBinItem>, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, entity_type, record_data, deleted_at, restore_deadline FROM recycle_bin ORDER BY deleted_at DESC")
        .map_err(|e| e.to_string())?;

    let now = Utc::now();
    let rows = stmt
        .query_map([], |row| {
            let id: String = row.get(0)?;
            let entity_type: String = row.get(1)?;
            let record_data: String = row.get(2)?;
            let deleted_at: String = row.get(3)?;
            let restore_deadline: String = row.get(4)?;
            Ok((id, entity_type, record_data, deleted_at, restore_deadline))
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for row in rows {
        let (id, entity_type, record_data, deleted_at, restore_deadline) = row.map_err(|e| e.to_string())?;
        let days_left = match DateTime::parse_from_rfc3339(&restore_deadline) {
            Ok(dt) => (dt.with_timezone(&Utc) - now).num_days(),
            Err(_) => 0,
        };
        result.push(RecycleBinItem {
            id,
            entity_type,
            record_data,
            deleted_at,
            restore_deadline,
            days_left,
        });
    }

    Ok(result)
}

#[tauri::command]
pub fn restore_from_recycle_bin(pool: State<DbPool>, id: String) -> Result<(), String> {
    let mut conn = pool.get_conn().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let (entity_type, record_data): (String, String) = tx
        .query_row(
            "SELECT entity_type, record_data FROM recycle_bin WHERE id = ?1",
            rusqlite::params![id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| e.to_string())?;

    let table = table_for_entity_type(&entity_type)
        .ok_or_else(|| format!("Bilinmeyen entity_type: {}", entity_type))?;

    let json: serde_json::Value = serde_json::from_str(&record_data).map_err(|e| e.to_string())?;
    restore_row_generic(&tx, table, &json)?;

    tx.execute("DELETE FROM recycle_bin WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn permanently_delete_recycle_item(pool: State<DbPool>, id: String) -> Result<(), String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM recycle_bin WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn purge_expired_recycle_bin(pool: State<DbPool>) -> Result<(), String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let now = now_iso();
    conn.execute(
        "DELETE FROM recycle_bin WHERE restore_deadline < ?1",
        rusqlite::params![now],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

/// Non-command variant usable directly from `.setup()` with a plain Connection.
pub fn purge_expired_recycle_bin_conn(conn: &rusqlite::Connection) -> Result<(), String> {
    let now = now_iso();
    conn.execute(
        "DELETE FROM recycle_bin WHERE restore_deadline < ?1",
        rusqlite::params![now],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
