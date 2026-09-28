//! Otomatik bildirim çalışanı: iş kolaylaştıran proaktif mesajlaşma.
//!
//! Arka planda periyodik olarak çalışır ve şunları gönderir:
//! - Vadesi yaklaşan/geçen borç-alacak cari hatırlatmaları (WhatsApp)
//! - Yaklaşan vergi/SGK ödeme uyarıları (WhatsApp + Telegram aktif bota)
//! - Kritik stok seviyesi uyarıları
//! - Günlük özet (akşam saatlerinde): bugünkü tahsilat/ödeme toplamı
//!
//! Her bildirim `settings` tablosundaki son gönderim zamanıyla koordine edilir;
//! ayarlar bölümünden kapatılabilir (auto_messenger_enabled = "false").

use crate::db::DbPool;
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use std::time::Duration;
use tauri::{State, Manager};

lazy_static::lazy_static! {
    static ref MESSENGER_RUNNING: AtomicBool = AtomicBool::new(false);
}

#[derive(serde::Serialize)]
pub struct MessengerStatus {
    pub running: bool,
    pub enabled: bool,
    pub last_run: Option<String>,
    pub sent_today: i64,
}

/// Ayar anahtarı okuma yardımcısı
fn get_setting(conn: &rusqlite::Connection, key: &str) -> Option<String> {
    conn.query_row("SELECT value FROM settings WHERE key = ?1", [key], |r| r.get(0)).ok()
}

fn set_setting(conn: &rusqlite::Connection, key: &str, value: &str) {
    let _ = conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = ?2",
        rusqlite::params![key, value],
    );
}

fn is_enabled(conn: &rusqlite::Connection) -> bool {
    get_setting(conn, "auto_messenger_enabled")
        .map(|v| v != "false")
        .unwrap_or(true)
}

/// WhatsApp'a mesaj gönderir (worker kapalıysa sessizce başarısız olur).
fn send_whatsapp(number: &str, message: &str) -> bool {
    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(8))
        .build()
        .unwrap_or_default();
    let payload = serde_json::json!({ "number": number, "message": message });
    client
        .post("http://localhost:3001/send-message")
        .json(&payload)
        .send()
        .map(|r| r.status().is_success())
        .unwrap_or(false)
}

/// Aktif Telegram botuna mesaj gönderir (bot yoksa sessizce atlar).
fn send_telegram(pool: &DbPool, chat_id: &str, message: &str) -> bool {
    let conn = match pool.get_conn() {
        Ok(c) => c,
        Err(_) => return false,
    };
    let bot_token: String = match conn.query_row(
        "SELECT bot_token FROM telegram_bots WHERE status = 'active' LIMIT 1",
        [],
        |r| r.get(0),
    ) {
        Ok(t) => t,
        Err(_) => return false,
    };
    let client = reqwest::blocking::Client::new();
    let url = format!("https://api.telegram.org/bot{}/sendMessage", bot_token);
    client
        .post(&url)
        .json(&serde_json::json!({ "chat_id": chat_id, "text": message }))
        .send()
        .map(|r| r.status().is_success())
        .unwrap_or(false)
}

/// Tüm bildirim işlerini çalıştırır; sonraki koşuya kadar sonuçları kaydeder.
fn run_jobs(pool: &DbPool) -> usize {
    let mut sent = 0usize;
    let conn = match pool.get_conn() {
        Ok(c) => c,
        Err(_) => return 0,
    };

    let now = chrono::Local::now();
    let today = now.format("%Y-%m-%d").to_string();
    let in_7_days = (now + chrono::Duration::days(7)).format("%Y-%m-%d").to_string();

    // ---- 1) Vadesi yaklaşan/geçen cari borçlar (WhatsApp) ----
    // ledger_entries'ta credit > 0 (bizim borcumuz) ve vade tarihi yaklaşan kayıtlar.
    // Not: vade alanı yoksa date esas alınır.
    {
        let mut stmt = match conn.prepare(
            "SELECT l.company_id, c.name, c.phone, SUM(l.credit) - SUM(l.debit) as net_debt, MAX(l.date) as last_date
             FROM ledger_entries l JOIN companies c ON c.id = l.company_id
             WHERE l.date <= ?1 AND l.date >= date(?1, '-90 days')
             GROUP BY l.company_id
             HAVING net_debt > 0 LIMIT 20",
        ) {
            Ok(s) => s,
            Err(_) => return 0,
        };
        let rows: Vec<(String, String, Option<String>, f64, String)> = stmt
            .query_map([&today], |r| {
                Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?))
            })
            .map(|i| i.filter_map(|x| x.ok()).collect())
            .unwrap_or_default();

        let last_sent_key = format!("debt_reminder_last_{}", today);
        if !rows.is_empty() && get_setting(&conn, "debt_reminder_last").as_deref() != Some(&today) {
            for (company_id, name, phone, debt, _last_date) in rows {
                let msg = format!(
                    "Sayın {},\n\nCari hesabınızda {} TL borç bakiyesi görünmektedir.\nÖdeme planınız için bizimle iletişime geçebilirsiniz.\n\nİyi çalışmalar,\nMizanNet",
                    name,
                    format_turkish_number(debt)
                );
                if let Some(ref tel) = phone {
                    if !tel.trim().is_empty() && send_whatsapp(tel.trim(), &msg) {
                        sent += 1;
                        // Bildirimi uygulama içine de kaydet
                        let _ = conn.execute(
                            "INSERT INTO notifications (id, title, module, related_id, due_date, status, source_type, created_at) VALUES (?1, ?2, 'cari', ?3, NULL, 'gonderildi', 'whatsapp', ?4)",
                            rusqlite::params![uuid::Uuid::new_v4().to_string(), format!("Borç hatırlatması gönderildi: {}", name), company_id, now.format("%Y-%m-%d %H:%M:%S").to_string()],
                        );
                    }
                }
            }
            set_setting(&conn, "debt_reminder_last", &last_sent_key);
        }
    }

    // ---- 2) Yaklaşan vergi/SGK ödemeleri (WhatsApp + Telegram) ----
    {
        let mut stmt = match conn.prepare(
            "SELECT type, period, amount, due_date FROM tax_items WHERE status = 'bekliyor' AND due_date <= ?1 ORDER BY due_date ASC LIMIT 10",
        ) {
            Ok(s) => s,
            Err(_) => return sent,
        };
        let rows: Vec<(String, Option<String>, f64, String)> = stmt
            .query_map([&in_7_days], |r| {
                Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?))
            })
            .map(|i| i.filter_map(|x| x.ok()).collect())
            .unwrap_or_default();

        let tax_key = format!("tax_alert_last_{}", today);
        if !rows.is_empty() && get_setting(&conn, "tax_alert_last").as_deref() != Some(&today) {
            let mut alert = String::from("⏰ YAKLAŞAN VERGİ/SGK ÖDEMELERİ\n\n");
            for (ttype, period, amount, due) in &rows {
                alert.push_str(&format!(
                    "• {} ({}) — {} TL — Son tarih: {}\n",
                    ttype,
                    period.as_deref().unwrap_or("-"),
                    format_turkish_number(*amount),
                    due
                ));
            }
            alert.push_str("\nLütfen ödemeleri planlayın. — MizanNet");

            // Telegram'a gönder (aktif bot varsa)
            if let Some(chat_id) = get_setting(&conn, "telegram_admin_chat_id") {
                if send_telegram(pool, &chat_id, &alert) {
                    sent += 1;
                }
            }
            set_setting(&conn, "tax_alert_last", &tax_key);
        }
    }

    // ---- 3) Kritik stok uyarıları ----
    {
        let mut stmt = match conn.prepare(
            "SELECT name, current_stock, min_stock FROM products WHERE current_stock <= min_stock AND min_stock > 0 LIMIT 10",
        ) {
            Ok(s) => s,
            Err(_) => return sent,
        };
        let rows: Vec<(String, f64, f64)> = stmt
            .query_map([], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)))
            .map(|i| i.filter_map(|x| x.ok()).collect())
            .unwrap_or_default();

        let stock_key = format!("stock_alert_last_{}", today);
        if !rows.is_empty() && get_setting(&conn, "stock_alert_last").as_deref() != Some(&today) {
            let mut alert = String::from("📦 KRİTİK STOK UYARISI\n\n");
            for (name, current, min) in &rows {
                alert.push_str(&format!(
                    "• {}: {} (min: {})\n",
                    name,
                    format_turkish_number(*current),
                    format_turkish_number(*min)
                ));
            }
            alert.push_str("\nSipariş vermeyi unutmayın. — MizanNet");

            if let Some(chat_id) = get_setting(&conn, "telegram_admin_chat_id") {
                if send_telegram(pool, &chat_id, &alert) {
                    sent += 1;
                }
            }
            set_setting(&conn, "stock_alert_last", &stock_key);
        }
    }

    // ---- 4) Günlük özet (hergün 18:00-23:59 arası, günde 1 kez) ----
    {
        let hour = chrono::Local::now().format("%H").to_string().parse::<i32>().unwrap_or(0);
        if hour >= 18 {
            let summary_key = format!("daily_summary_last_{}", today);
            if get_setting(&conn, "daily_summary_last").as_deref() != Some(&today) {
                let mut stmt = match conn.prepare(
                    "SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0) FROM ledger_entries WHERE date = ?1",
                ) {
                    Ok(s) => s,
                    Err(_) => return sent,
                };
                let (tahsilat, odeme): (f64, f64) = stmt
                    .query_row([&today], |r| Ok((r.get(0)?, r.get(1)?)))
                    .unwrap_or((0.0, 0.0));

                let summary = format!(
                    "📊 GÜNLÜK ÖZET — {}\n\nTahsilat: {} TL\nÖdeme: {} TL\n\nİyi akşamlar! — MizanNet",
                    today,
                    format_turkish_number(tahsilat),
                    format_turkish_number(odeme)
                );

                if let Some(chat_id) = get_setting(&conn, "telegram_admin_chat_id") {
                    if send_telegram(pool, &chat_id, &summary) {
                        sent += 1;
                    }
                }
                set_setting(&conn, "daily_summary_last", &summary_key);
            }
        }
    }

    // Son koşu zamanını kaydet
    set_setting(
        &conn,
        "auto_messenger_last_run",
        &now.format("%Y-%m-%d %H:%M:%S").to_string(),
    );

    sent
}

fn format_turkish_number(n: f64) -> String {
    let formatted = format!("{:.2}", n);
    let parts: Vec<&str> = formatted.split('.').collect();
    if parts.len() != 2 {
        return formatted;
    }
    let int_part: String = parts[0]
        .chars()
        .rev()
        .enumerate()
        .flat_map(|(i, c)| {
            if i > 0 && i % 3 == 0 {
                vec!['.', c]
            } else {
                vec![c]
            }
        })
        .collect();
    format!(",{}", parts[1]) + &int_part.chars().rev().collect::<String>().to_string()
}

/// Otomatik bildirim worker'ını başlatır (uygulama açılışında çağrılır).
pub fn start_auto_messenger(app: tauri::AppHandle, pool_inner: crate::db::DbPoolInner) {
    if MESSENGER_RUNNING.load(Ordering::SeqCst) {
        return;
    }
    MESSENGER_RUNNING.store(true, Ordering::SeqCst);

    thread::spawn(move || {
        let pool = DbPool(std::sync::RwLock::new(pool_inner));
        while MESSENGER_RUNNING.load(Ordering::SeqCst) {
            // Her 10 dakikada bir kontrol et
            thread::sleep(Duration::from_secs(600));
            if !MESSENGER_RUNNING.load(Ordering::SeqCst) {
                break;
            }

            let enabled = pool
                .get_conn()
                .ok()
                .map(|c| is_enabled(&c))
                .unwrap_or(false);
            if !enabled {
                continue;
            }

            let _ = run_jobs(&pool);
            let _ = app; // app handle ileride emit için kullanılabilir
        }
    });
}

/// Worker'ı durdurur.
pub fn stop_auto_messenger() {
    MESSENGER_RUNNING.store(false, Ordering::SeqCst);
}

// --------------------------- Tauri komutları ---------------------------

#[tauri::command]
pub fn get_messenger_status(pool: State<DbPool>) -> Result<MessengerStatus, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let enabled = is_enabled(&conn);
    let last_run = get_setting(&conn, "auto_messenger_last_run");

    // Bugün kaç bildirim gönderildi (notifications tablosundaki source_type='whatsapp')
    let sent_today: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM notifications WHERE source_type = 'whatsapp' AND created_at >= ?1",
            [chrono::Local::now().format("%Y-%m-%d 00:00:00").to_string()],
            |r| r.get(0),
        )
        .unwrap_or(0);

    Ok(MessengerStatus {
        running: MESSENGER_RUNNING.load(Ordering::SeqCst),
        enabled,
        last_run,
        sent_today,
    })
}

#[tauri::command]
pub fn set_messenger_enabled(pool: State<DbPool>, enabled: bool) -> Result<(), String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    set_setting(&conn, "auto_messenger_enabled", if enabled { "true" } else { "false" });
    Ok(())
}

/// Şimdi çalıştır (test/manual tetikleme).
#[tauri::command]
pub fn trigger_messenger_now(pool: State<DbPool>) -> Result<usize, String> {
    Ok(run_jobs(&pool))
}

// ---------------------------------------------------------------------------
// Web sitesi entegrasyonu (mizannet-web): hesap girişi + lisans senkronu
// ---------------------------------------------------------------------------
// API uçları (web_base_url() ile çözülür):
//   POST /api/desktop/login    → { email, password } → { token, user, subscription }
//   GET  /api/desktop/verify   → Bearer token → { user, subscription }
//   POST /api/desktop/activate → Bearer token + { key } → lisans etkinleştirme
// subscription alanları: plan, status, entitled, license_key, license_end, days_left, source

use std::sync::atomic::AtomicU64;

/// Son başarılı web_verify unix zaman damgası (saniye).
static LAST_WEB_SYNC: AtomicU64 = AtomicU64::new(0);

/// Son senkron üzerinden geçen süre (saniye); hiç senkron yoksa u64::MAX.
pub fn seconds_since_last_web_sync() -> u64 {
    let last = LAST_WEB_SYNC.load(Ordering::Relaxed);
    if last == 0 {
        u64::MAX
    } else {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0)
            .saturating_sub(last)
    }
}

#[derive(serde::Serialize, Clone, Default)]
pub struct WebAccountStatus {
    pub logged_in: bool,
    pub user_name: Option<String>,
    pub user_email: Option<String>,
    pub plan: Option<String>,
    pub subscription_status: Option<String>,
    pub trial_end: Option<String>,
    // Zenginleştirilmiş alanlar (web /verify yanıtından):
    pub entitled: Option<bool>,
    pub license_key: Option<String>,
    pub license_end: Option<String>,
    pub days_left: Option<i64>,
    pub source: Option<String>,
    pub error: Option<String>,
}

/// Web sunucu adresi:
/// 1. MIZANNET_WEB_URL env değişkeni (geliştirme: http://localhost:3000)
/// 2. Debug derlemelerinde varsayılan http://localhost:3000
/// 3. Release derlemelerinde https://mizannet.com
pub fn web_base_url() -> String {
    if let Ok(url) = std::env::var("MIZANNET_WEB_URL") {
        let trimmed = url.trim().trim_end_matches('/').to_string();
        if !trimmed.is_empty() {
            return trimmed;
        }
    }
    if cfg!(debug_assertions) {
        "http://localhost:3000".to_string()
    } else {
        "https://mizannet.com".to_string()
    }
}

const WEB_BASE_URL: &str = ""; // yerine her çağrıda web_base_url() kullanılır

fn web_token_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Yapılandırma dizini alınamadı: {}", e))?;
    std::fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;
    Ok(config_dir.join("web-account.json"))
}

#[derive(serde::Serialize, serde::Deserialize)]
struct WebAccountFile {
    token: String,
    email: String,
    name: String,
}

#[tauri::command]
pub fn web_login(
    app: tauri::AppHandle,
    pool: State<DbPool>,
    email: String,
    password: String,
) -> Result<WebAccountStatus, String> {
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;

    // 1) Giriş isteği
    let login_url = format!("{}/api/desktop/login", web_base_url());
    let resp = client
        .post(&login_url)
        .json(&serde_json::json!({ "email": email, "password": password }))
        .send();

    let resp = match resp {
        Ok(r) => r,
        Err(e) => {
            return Ok(WebAccountStatus {
                logged_in: false,
                error: Some(format!("Web sunucusuna ulaşılamadı: {}", e)),
                ..Default::default()
            })
        }
    };

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().unwrap_or_default();
        return Ok(WebAccountStatus {
            logged_in: false,
            error: Some(format!("Giriş başarısız ({}): {}", status, body)),
            ..Default::default()
        });
    }

    let json: serde_json::Value = resp.json().map_err(|e| format!("Yanıt okunamadı: {}", e))?;
    let token = json["token"].as_str().unwrap_or_default().to_string();
    let name = json["user"]["name"].as_str().unwrap_or("Kullanıcı").to_string();

    if token.is_empty() {
        return Ok(WebAccountStatus {
            logged_in: false,
            error: Some("Token alınamadı".to_string()),
            ..Default::default()
        });
    }

    // 2) Token'ı dosyaya kaydet
    let token_path = web_token_path(&app)?;
    let account = WebAccountFile { token, email: email.clone(), name: name.clone() };
    let json_str = serde_json::to_string(&account).map_err(|e| e.to_string())?;
    std::fs::write(&token_path, json_str).map_err(|e| e.to_string())?;

    // 3) Abonelik durumunu sorgula
    web_verify_internal(&app, &pool)
}

/// Kayıtlı token ile abonelik durumunu sorgular.
#[tauri::command]
pub fn web_verify(app: tauri::AppHandle, pool: State<DbPool>) -> Result<WebAccountStatus, String> {
    web_verify_internal(&app, &pool)
}

/// Yanıttan subscription alanlarını WebAccountStatus'a kopyalar.
fn parse_subscription(json: &serde_json::Value) -> WebAccountStatus {
    WebAccountStatus {
        logged_in: true,
        user_name: json["user"]["name"].as_str().map(|s| s.to_string()),
        user_email: json["user"]["email"].as_str().map(|s| s.to_string()),
        plan: json["subscription"]["plan"].as_str().map(|s| s.to_string()),
        subscription_status: json["subscription"]["status"].as_str().map(|s| s.to_string()),
        trial_end: json["subscription"]["license_end"]
            .as_str()
            .or_else(|| json["subscription"]["trial_end"].as_str())
            .map(|s| s.to_string()),
        entitled: json["subscription"]["entitled"].as_bool(),
        license_key: json["subscription"]["license_key"].as_str().map(|s| s.to_string()),
        license_end: json["subscription"]["license_end"].as_str().map(|s| s.to_string()),
        days_left: json["subscription"]["days_left"].as_i64(),
        source: json["subscription"]["source"].as_str().map(|s| s.to_string()),
        error: None,
    }
}

fn web_verify_internal(app: &tauri::AppHandle, _pool: &DbPool) -> Result<WebAccountStatus, String> {
    let token_path = web_token_path(app)?;
    if !token_path.exists() {
        return Ok(WebAccountStatus::default());
    }

    let content = std::fs::read_to_string(&token_path).map_err(|e| e.to_string())?;
    let account: WebAccountFile = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;

    let verify_url = format!("{}/api/desktop/verify", web_base_url());
    let resp = client
        .get(&verify_url)
        .bearer_auth(&account.token)
        .send();

    let resp = match resp {
        Ok(r) => r,
        Err(e) => {
            return Ok(WebAccountStatus {
                logged_in: true,
                user_name: Some(account.name),
                user_email: Some(account.email),
                error: Some(format!("Sunucuya ulaşılamadı (çevrimdışı mod): {}", e)),
                ..Default::default()
            })
        }
    };

    if !resp.status().is_success() {
        return Ok(WebAccountStatus {
            logged_in: false,
            error: Some(format!("Oturum doğrulanamadı ({}). Tekrar giriş yapın.", resp.status())),
            ..Default::default()
        });
    }

    let json: serde_json::Value = resp.json().map_err(|e| format!("Yanıt okunamadı: {}", e))?;
    LAST_WEB_SYNC.store(
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0),
        Ordering::Relaxed,
    );

    Ok(parse_subscription(&json))
}

/// Web sitesinden satın alınan lisans anahtarını etkinleştirir.
#[tauri::command]
pub fn web_activate_license(
    app: tauri::AppHandle,
    key: String,
) -> Result<String, String> {
    let token_path = web_token_path(&app)?;
    if !token_path.exists() {
        return Err("Önce web hesabınıza giriş yapmalısınız.".to_string());
    }
    let content = std::fs::read_to_string(&token_path).map_err(|e| e.to_string())?;
    let account: WebAccountFile = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;

    let activate_url = format!("{}/api/desktop/activate", web_base_url());
    let resp = client
        .post(&activate_url)
        .bearer_auth(&account.token)
        .json(&serde_json::json!({ "key": key.trim() }))
        .send()
        .map_err(|e| format!("Sunucuya ulaşılamadı: {}", e))?;

    let status = resp.status();
    let json: serde_json::Value = resp.json().unwrap_or_default();

    if status.is_success() {
        LAST_WEB_SYNC.store(
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_secs())
                .unwrap_or(0),
            Ordering::Relaxed,
        );
        Ok(json["message"].as_str().unwrap_or("Lisans etkinleştirildi.").to_string())
    } else {
        Err(json["error"].as_str().unwrap_or("Etkinleştirme başarısız").to_string())
    }
}

/// Web hesabından çıkış yapar.
#[tauri::command]
pub fn web_logout(app: tauri::AppHandle) -> Result<(), String> {
    let token_path = web_token_path(&app)?;
    if token_path.exists() {
        std::fs::remove_file(token_path).map_err(|e| e.to_string())?;
    }
    Ok(())
}
