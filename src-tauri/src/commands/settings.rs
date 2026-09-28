use crate::db::DbPool;
use crate::commands::auto_messenger::{web_verify, seconds_since_last_web_sync};
use tauri::State;

/// Çevrimdışı tolerans: son başarılı senkrondan bu kadar süre içinde
/// son bilinen durum geçerli sayılır (internetsiz çalışma desteği).
const OFFLINE_GRACE_SECS: u64 = 72 * 60 * 60;

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

/// Hibrit lisans durumu:
/// - Yerel (VIP anahtar) durumu settings tablosundan okunur.
/// - Web abonelik durumu cache'lenmiş web_verify sonucuyla birleştirilir.
/// - Web aktifse PREMIUM; yerel anahtar da PREMIUM verir; ikisi de yoksa
///   TRIAL/DEMO döner.
#[tauri::command]
pub fn get_license_status(
    app: tauri::AppHandle,
    pool: State<DbPool>,
) -> Result<serde_json::Value, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let key: Option<String> = conn.query_row("SELECT value FROM settings WHERE key = 'license_key'", [], |row| row.get(0)).ok();
    let status: Option<String> = conn.query_row("SELECT value FROM settings WHERE key = 'license_status'", [], |row| row.get(0)).ok();
    let local_premium = status.as_deref() == Some("PREMIUM");

    // Web abonelik durumu (bağlantı yoksa sessizce atlanır)
    let web = web_verify(app, pool).unwrap_or_default();
    let sync_age = seconds_since_last_web_sync();
    let web_trusted = sync_age <= OFFLINE_GRACE_SECS;

    let web_entitled = web_trusted && web.entitled.unwrap_or(false);
    let web_plan = web.plan.clone();
    let web_days_left = web.days_left;
    let web_license_key = web.license_key.clone();
    let web_license_end = web.license_end.clone();
    let web_source = web.source.clone();

    let combined_status = if local_premium || web_entitled {
        "PREMIUM"
    } else if web.logged_in {
        "TRIAL"
    } else {
        status.as_deref().unwrap_or("DEMO")
    };

    Ok(serde_json::json!({
        "key": key.unwrap_or_default(),
        "status": combined_status,
        "local_status": status,
        "web": {
            "logged_in": web.logged_in,
            "entitled": web_entitled,
            "trusted": web_trusted,
            "sync_age_secs": if sync_age == u64::MAX { serde_json::Value::Null } else { serde_json::json!(sync_age) },
            "plan": web_plan,
            "days_left": web_days_left,
            "license_key": web_license_key,
            "license_end": web_license_end,
            "source": web_source,
        }
    }))
}

#[tauri::command]
pub fn lock_database(password: String, app: tauri::AppHandle) -> Result<(), String> {
    let data_dir = crate::commands::data_location::resolve_data_dir(&app).map_err(|e| e.to_string())?;
    for entry in std::fs::read_dir(data_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.extension().is_some_and(|ext| ext == "sqlite") {
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
        if path.extension().is_some_and(|ext| ext == "enc") {
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
