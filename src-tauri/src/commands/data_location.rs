use crate::db::DbPool;
use serde::Serialize;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager, State};

const CONFIG_FILE_NAME: &str = "data_location.json";
const DB_FILE_NAME: &str = "mizannet.db";

#[derive(Serialize)]
pub struct DataLocationInfo {
    pub current_dir: String,
    pub is_default: bool,
}

fn config_file_path(app: &AppHandle) -> Result<PathBuf, String> {
    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Uygulama yapılandırma dizini alınamadı: {}", e))?;
    Ok(config_dir.join(CONFIG_FILE_NAME))
}

/// Veri dizinini yapılandırma dosyasından okur; yoksa varsayılan uygulama veri dizinini döner.
pub fn resolve_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let default = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Uygulama veri dizini alınamadı: {}", e))?;

    let config_path = config_file_path(app)?;
    if let Ok(content) = std::fs::read_to_string(&config_path) {
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
            if let Some(dir) = json.get("data_dir").and_then(|v| v.as_str()) {
                let custom = PathBuf::from(dir);
                if custom.is_absolute() {
                    return Ok(custom);
                }
            }
        }
    }
    Ok(default)
}

fn write_data_dir_config(app: &AppHandle, data_dir: Option<&Path>) -> Result<(), String> {
    let config_path = config_file_path(app)?;
    if let Some(parent) = config_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = match data_dir {
        Some(dir) => serde_json::json!({ "data_dir": dir.to_string_lossy().to_string() }),
        None => serde_json::json!({}),
    };
    std::fs::write(
        &config_path,
        serde_json::to_string_pretty(&json).map_err(|e| e.to_string())?,
    )
    .map_err(|e| format!("Yapılandırma dosyası yazılamadı: {}", e))?;
    Ok(())
}

/// Mevcut veritabanını hedef dizine kopyalar (VACUUM INTO ile tutarlı bir anlık görüntü).
fn copy_db_to(pool: &DbPool, target_dir: &Path) -> Result<(), String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(target_dir).map_err(|e| e.to_string())?;

    let target_file = target_dir.join(DB_FILE_NAME);
    if target_file.exists() {
        std::fs::remove_file(&target_file).map_err(|e| e.to_string())?;
    }
    conn.execute("VACUUM INTO ?1", [target_file.to_string_lossy().to_string()])
        .map_err(|e| format!("Veritabanı kopyalanamadı: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn get_data_location(app: AppHandle) -> Result<DataLocationInfo, String> {
    let current = resolve_data_dir(&app)?;
    let default = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Uygulama veri dizini alınamadı: {}", e))?;
    Ok(DataLocationInfo {
        current_dir: current.to_string_lossy().to_string(),
        is_default: current == default,
    })
}

#[tauri::command]
pub fn set_data_location(pool: State<DbPool>, app: AppHandle, path: String) -> Result<(), String> {
    let new_dir = PathBuf::from(&path);
    if !new_dir.is_absolute() {
        return Err("Lütfen geçerli bir klasör seçin.".to_string());
    }

    let current = resolve_data_dir(&app)?;
    if current != new_dir {
        copy_db_to(&pool, &new_dir)?;
        write_data_dir_config(&app, Some(&new_dir))?;
    }

    app.restart();
}

#[tauri::command]
pub fn reset_data_location(pool: State<DbPool>, app: AppHandle) -> Result<(), String> {
    let default = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Uygulama veri dizini alınamadı: {}", e))?;
    let current = resolve_data_dir(&app)?;

    if current != default {
        copy_db_to(&pool, &default)?;
        write_data_dir_config(&app, None)?;
    }

    app.restart();
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db;

    #[test]
    fn copy_db_to_copies_all_data() {
        let temp = std::env::temp_dir().join(format!("mizannet_test_{}", std::process::id()));
        let src = temp.join("src");
        let dst = temp.join("dst");
        std::fs::create_dir_all(&src).unwrap();

        let pool = DbPool(db::create_pool(&src).into());
        {
            let conn = pool.get_conn().unwrap();
            crate::db_migrations::run_migrations(&conn).unwrap();
            conn.execute(
                "INSERT INTO companies (id, name, created_at) VALUES ('c1', 'Test AÅ', '2026-01-01T00:00:00Z')",
                [],
            )
            .unwrap();
        }

        copy_db_to(&pool, &dst).unwrap();

        let dst_conn = rusqlite::Connection::open(dst.join("mizannet.db")).unwrap();
        let count: i64 = dst_conn
            .query_row("SELECT COUNT(*) FROM companies", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 1);
        let name: String = dst_conn
            .query_row("SELECT name FROM companies WHERE id = 'c1'", [], |r| r.get(0))
            .unwrap();
        assert_eq!(name, "Test AÅ");

        std::fs::remove_dir_all(&temp).ok();
    }
}
