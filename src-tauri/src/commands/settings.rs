use crate::db::DbPool;
use tauri::State;

#[tauri::command]
pub fn get_setting(pool: State<DbPool>, key: String) -> Result<Option<String>, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let result: Option<String> = conn
        .query_row(
            "SELECT value FROM settings WHERE key = ?1",
            rusqlite::params![key],
            |row| row.get(0),
        )
        .ok();
    Ok(result)
}

/// Upserts a setting. Note: values (e.g. API keys) are never logged/printed.
#[tauri::command]
pub fn set_setting(pool: State<DbPool>, key: String, value: String) -> Result<(), String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        rusqlite::params![key, value],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_license_status(pool: State<DbPool>) -> Result<serde_json::Value, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let key: Option<String> = conn.query_row("SELECT value FROM settings WHERE key = 'license_key'", [], |row| row.get(0)).ok();
    let status: Option<String> = conn.query_row("SELECT value FROM settings WHERE key = 'license_status'", [], |row| row.get(0)).ok();
    
    Ok(serde_json::json!({
        "key": key.unwrap_or_default(),
        "status": status.unwrap_or_else(|| "DEMO".to_string())
    }))
}

#[tauri::command]
pub fn lock_database(password: String, app: tauri::AppHandle) -> Result<(), String> {
    let data_dir = crate::commands::data_location::resolve_data_dir(&app).map_err(|e| e.to_string())?;
    for entry in std::fs::read_dir(data_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.extension().map_or(false, |ext| ext == "sqlite") {
            crate::crypto::encrypt_db_file(&path, &password)?;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn unlock_database(password: String, app: tauri::AppHandle) -> Result<(), String> {
    let data_dir = crate::commands::data_location::resolve_data_dir(&app).map_err(|e| e.to_string())?;
    for entry in std::fs::read_dir(data_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.extension().map_or(false, |ext| ext == "enc") {
            let db_path = path.with_extension("");
            crate::crypto::decrypt_db_file(&db_path, &password)?;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn activate_license(code: String, pool: State<DbPool>) -> Result<(), String> {
    if code.len() < 45 || !code.starts_with("MIZANNET-VIP-") {
        return Err("Geçersiz lisans kodu formatı.".into());
    }
    
    // Basit bir offline doğrulama. (Örn: belirli bir örüntü içeriyorsa geçerli say)
    // Gerçekte Ed25519 ile imzalı veriyi çözecek bir yapı eklenebilir.
    
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    
    conn.execute(
        "INSERT INTO settings (key, value) VALUES ('license_key', ?1) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        rusqlite::params![code],
    ).map_err(|e| e.to_string())?;
    
    conn.execute(
        "INSERT INTO settings (key, value) VALUES ('license_status', 'PREMIUM') ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        [],
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}
