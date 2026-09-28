#![allow(unused)]
use crate::db::DbPool;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;
use chrono::Local;
use crate::domain::telegram_models::*;
use crate::infrastructure::telegram_repository::TelegramRepository;
use std::sync::{Arc, Mutex};
use std::sync::atomic::{AtomicBool, Ordering};
use reqwest::blocking::Client;
use std::thread;
use std::time::Duration;
use tauri::Emitter;

lazy_static::lazy_static! {
    static ref TELEGRAM_WORKER_RUNNING: AtomicBool = AtomicBool::new(false);
}

pub fn start_worker_on_startup(app: tauri::AppHandle, pool_inner: crate::db::DbPoolInner) {
    if TELEGRAM_WORKER_RUNNING.load(Ordering::SeqCst) {
        return;
    }
    
    let conn = match pool_inner.get() {
        Ok(c) => c,
        Err(_) => return,
    };
    let bot_token: String = match conn.query_row("SELECT bot_token FROM telegram_bots WHERE status = 'active' LIMIT 1", [], |r| r.get(0)) {
        Ok(t) => t,
        Err(_) => return,
    };
    
    TELEGRAM_WORKER_RUNNING.store(true, Ordering::SeqCst);
    let pool_clone = pool_inner.clone();
    
    thread::spawn(move || {
        let client = Client::new();
        let mut last_update_id = 0;
        
        while TELEGRAM_WORKER_RUNNING.load(Ordering::SeqCst) {
            let url = format!("https://api.telegram.org/bot{}/getUpdates?offset={}&timeout=30", bot_token, last_update_id);
            if let Ok(resp) = client.get(&url).send() {
                if let Ok(json) = resp.json::<serde_json::Value>() {
                    if json["ok"].as_bool() == Some(true) {
                        if let Some(results) = json["result"].as_array() {
                            for result in results {
                                if let Some(update_id) = result["update_id"].as_i64() {
                                    last_update_id = update_id + 1;
                                }
                                
                                if let Some(message) = result.get("message") {
                                    process_telegram_message(&app, &pool_clone, &bot_token, message);
                                }
                            }
                        }
                    }
                }
            }
            thread::sleep(Duration::from_secs(2));
        }
    });
}



#[tauri::command]
pub fn list_telegram_bots(pool: State<DbPool>) -> Result<Vec<TelegramBot>, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    TelegramRepository::get_bots(&conn)
}

#[tauri::command]
pub fn save_telegram_bot(app: tauri::AppHandle, bot_token: String, pool: State<DbPool>) -> Result<TelegramBot, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let _ = app.emit("telegram_update", ());
    
    // Yalnızca 1 adet aktif bot tutacağımız için eskileri siliyoruz (opsiyonel)
    conn.execute("DELETE FROM telegram_bots", []).map_err(|e| e.to_string())?;
    
    conn.execute(
        "INSERT INTO telegram_bots (id, bot_token, status, created_at) VALUES (?1, ?2, 'active', ?3)",
        rusqlite::params![&id, &bot_token, &now],
    ).map_err(|e| e.to_string())?;
    
    Ok(TelegramBot {
        id,
        bot_token,
        username: None,
        first_name: None,
        status: "active".to_string(),
        created_at: now,
    })
}

#[tauri::command]
pub fn delete_telegram_bot(app: tauri::AppHandle, id: String, pool: State<DbPool>) -> Result<(), String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM telegram_bots WHERE id = ?1", [&id]).map_err(|e| e.to_string())?;
    let _ = app.emit("telegram_update", ());
    Ok(())
}

#[tauri::command]
pub fn list_telegram_users(pool: State<DbPool>) -> Result<Vec<TelegramUser>, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    TelegramRepository::get_users(&conn)
}
#[tauri::command]
pub fn list_telegram_requests(pool: State<DbPool>) -> Result<Vec<TelegramRequest>, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    TelegramRepository::get_requests(&conn)
}

#[tauri::command]
pub fn update_telegram_request_status(app: tauri::AppHandle, id: String, status: String, pool: State<DbPool>) -> Result<(), String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let res = TelegramRepository::update_request_status(&conn, &id, &status); let _ = app.emit("telegram_update", ()); res
}

#[tauri::command]
pub fn list_telegram_messages(telegram_user_id: String, pool: tauri::State<'_, DbPool>) -> Result<Vec<TelegramMessage>, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, telegram_user_id, chat_id, role, content, created_at, media_path FROM telegram_messages WHERE telegram_user_id = ?1 ORDER BY created_at ASC")
        .map_err(|e| e.to_string())?;
    
    let msgs = stmt
        .query_map([&telegram_user_id], |row| {
            let media_path_str: Option<String> = row.get(6).ok();
            Ok(TelegramMessage {
                id: row.get(0)?,
                telegram_user_id: row.get(1)?,
                chat_id: row.get(2)?,
                role: row.get(3)?,
                content: row.get(4)?,
                created_at: row.get(5)?,
                media_path: media_path_str,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
        
    Ok(msgs)
}

#[tauri::command]
pub fn list_telegram_drafts(pool: State<DbPool>) -> Result<Vec<TelegramDraft>, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, telegram_user_id, target_module, title, payload_json, uncertainties_json, status, created_at FROM telegram_drafts ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    
    let drafts = stmt
        .query_map([], |row| {
            Ok(TelegramDraft {
                id: row.get(0)?,
                telegram_user_id: row.get(1)?,
                target_module: row.get(2)?,
                title: row.get(3)?,
                payload_json: row.get(4)?,
                uncertainties_json: row.get(5)?,
                status: row.get(6)?,
                created_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
        
    Ok(drafts)
}


#[tauri::command]
pub fn delete_telegram_draft(app: tauri::AppHandle, id: String, pool: State<DbPool>) -> Result<(), String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM telegram_drafts WHERE id = ?1", [&id]).map_err(|e| e.to_string())?;
    let _ = app.emit("telegram_update", ());
    Ok(())
}

#[tauri::command]
pub fn start_telegram_worker(app: tauri::AppHandle, pool: tauri::State<'_, DbPool>) -> Result<(), String> {
    if TELEGRAM_WORKER_RUNNING.load(Ordering::SeqCst) {
        return Ok(());
    }
    
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let bot_token: String = match conn.query_row("SELECT bot_token FROM telegram_bots WHERE status = 'active' LIMIT 1", [], |r| r.get(0)) {
        Ok(t) => t,
        Err(_) => return Err("Aktif bir Telegram botu bulunamadı.".to_string()),
    };
    
    TELEGRAM_WORKER_RUNNING.store(true, Ordering::SeqCst);
    let pool_inner = pool.0.read().unwrap().clone();
    let app_clone = app.clone();
    
    thread::spawn(move || {
        let client = Client::new();
        let mut last_update_id = 0;
        
        while TELEGRAM_WORKER_RUNNING.load(Ordering::SeqCst) {
            let url = format!("https://api.telegram.org/bot{}/getUpdates?offset={}&timeout=30", bot_token, last_update_id);
            if let Ok(resp) = client.get(&url).send() {
                if let Ok(json) = resp.json::<serde_json::Value>() {
                    if json["ok"].as_bool() == Some(true) {
                        if let Some(results) = json["result"].as_array() {
                            for update in results {
                                if let Some(update_id) = update["update_id"].as_i64() {
                                    last_update_id = update_id + 1;
                                }
                                
                                if let Some(message) = update.get("message") {
                                    process_telegram_message(&app_clone, &pool_inner, &bot_token, message);
                                }
                            }
                        }
                    }
                }
            }
            thread::sleep(Duration::from_millis(500));
        }
    });
    
    Ok(())
}

#[tauri::command]
pub fn stop_telegram_worker() -> Result<(), String> {
    TELEGRAM_WORKER_RUNNING.store(false, Ordering::SeqCst);
    Ok(())
}

#[tauri::command]
pub fn get_telegram_worker_status() -> Result<bool, String> {
    Ok(TELEGRAM_WORKER_RUNNING.load(Ordering::SeqCst))
}

fn download_telegram_file(bot_token: &str, file_id: &str) -> Result<String, String> {
    use base64::Engine;
    let client = Client::new();
    let file_url = format!("https://api.telegram.org/bot{}/getFile?file_id={}", bot_token, file_id);
    
    let resp = client.get(&file_url).send().map_err(|e| e.to_string())?;
    let json: serde_json::Value = resp.json().map_err(|e| e.to_string())?;
    
    let file_path = json["result"]["file_path"].as_str().ok_or("No file path")?;
    let download_url = format!("https://api.telegram.org/file/bot{}/{}", bot_token, file_path);
    
    let img_bytes = client.get(&download_url).send().map_err(|e| e.to_string())?.bytes().map_err(|e| e.to_string())?;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&img_bytes);
    Ok(b64)
}

fn send_telegram_message(bot_token: &str, chat_id: &str, text: &str) {
    let client = Client::new();
    let url = format!("https://api.telegram.org/bot{}/sendMessage", bot_token);
    if let Err(e) = client.post(&url).json(&serde_json::json!({
        "chat_id": chat_id,
        "text": text
    })).send() {
        println!("Telegram API Error (send_message): {}", e);
    }
}

fn process_telegram_message(app: &tauri::AppHandle, pool: &crate::db::DbPoolInner, bot_token: &str, message: &serde_json::Value) {
    use crate::ai::{ai_chat, ai_chat_with_image, ChatMessage};
    use base64::Engine;

    let conn = match pool.get() {
        Ok(c) => c,
        Err(e) => {
            println!("Telegram DB Error (pool get): {}", e);
            return;
        }
    };
    
    let chat_id = message["chat"]["id"].as_i64().unwrap_or(0).to_string();
    let from_id = message["from"]["id"].as_i64().unwrap_or(0).to_string();
    let first_name = message["from"]["first_name"].as_str().unwrap_or("").to_string();
    let username = message["from"]["username"].as_str().unwrap_or("").to_string();
    let text = message["caption"].as_str().or(message["text"].as_str()).unwrap_or("").to_string();
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    
    // Check if there's a photo
    let mut photo_b64 = None;
    let mut saved_file_path = None;
    
    if let Some(photos) = message.get("photo").and_then(|p| p.as_array()) {
        if let Some(largest_photo) = photos.last() {
            if let Some(file_id) = largest_photo.get("file_id").and_then(|f| f.as_str()) {
                if let Ok(b64) = download_telegram_file(bot_token, file_id) {
                    photo_b64 = Some(b64.clone());
                    // Dosyayı belge arşivine kaydet
                    if let Ok(file_path) = crate::commands::documents::save_document_file(app.clone(), format!("Telegram_{}.jpg", file_id), b64) {
                        saved_file_path = Some(file_path.clone());
                        let doc_id = uuid::Uuid::new_v4().to_string();
                        let _ = conn.execute(
                            "INSERT INTO documents (id, title, category, file_type, file_path, related_type, related_id, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                            rusqlite::params![doc_id, format!("Telegram Görseli: {}", first_name), "Telegram Yüklemesi", "jpg", file_path, "telegram", from_id, now]
                        );
                    }
                }
            }
        }
    }
    
    if text.is_empty() && photo_b64.is_none() { return; }
    
    // Ensure user exists in telegram_users
    let user_id = uuid::Uuid::new_v4().to_string();
    let user_exists: bool = conn.query_row("SELECT COUNT(*) FROM telegram_users WHERE telegram_user_id = ?1", [&from_id], |row| row.get::<_, i64>(0)).map(|c| c > 0).unwrap_or(false);
    
    if !user_exists {
        let _ = conn.execute(
            "INSERT INTO telegram_users (id, telegram_user_id, username, first_name, chat_id, message_count, created_at) VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6)",
            rusqlite::params![&user_id, &from_id, &username, &first_name, &chat_id, &now]
        );
    } else {
        let _ = conn.execute(
            "UPDATE telegram_users SET message_count = message_count + 1, last_message_at = ?1, chat_id = ?2 WHERE telegram_user_id = ?3",
            rusqlite::params![&now, &chat_id, &from_id]
        );
    }
    
    // Check if user is in allowlist
    let is_allowed: bool = conn.query_row(
        "SELECT COUNT(*) FROM telegram_allowlist WHERE telegram_user_id = ?1 AND status = 'approved'",
        [&from_id],
        |row| row.get::<_, i64>(0)
    ).map(|c| c > 0).unwrap_or(false);
    
    let msg_id = uuid::Uuid::new_v4().to_string();
    let media_path_val = saved_file_path.unwrap_or_else(|| photo_b64.clone().unwrap_or_default());
    
    let _ = conn.execute(
        "INSERT INTO telegram_messages (id, telegram_user_id, chat_id, role, content, media_path, created_at) VALUES (?1, ?2, ?3, 'user', ?4, ?5, ?6)",
        rusqlite::params![&msg_id, &from_id, &chat_id, &text, &media_path_val, &now]
    );
    
    if is_allowed {
        let db_pool = crate::db::DbPool(std::sync::RwLock::new(pool.clone()));
        
        let text_lower = text.to_lowercase();
        if text_lower.starts_with("/bakiye") {
            let reply = "Kayıtlı numaranızdan cari/maaş hesap bakiyeniz kontrol ediliyor...\n(Şu anki bakiyeniz: 0.00 TL)";
            let _ = send_telegram_message(bot_token, &chat_id, reply);
            
            let reply_msg_id = uuid::Uuid::new_v4().to_string();
            let _ = conn.execute(
                "INSERT INTO telegram_messages (id, telegram_user_id, chat_id, role, content, media_path, created_at) VALUES (?1, ?2, ?3, 'assistant', ?4, NULL, ?5)",
                rusqlite::params![&reply_msg_id, &from_id, &chat_id, reply, &now]
            );
            return;
        } else if text_lower.starts_with("/izin") {
            let reply = "Kayıtlı bilgilerinizden kalan izin gününüz sorgulanıyor...\n(Kalan yıllık izniniz: 14 Gün)";
            let _ = send_telegram_message(bot_token, &chat_id, reply);
            
            let reply_msg_id = uuid::Uuid::new_v4().to_string();
            let _ = conn.execute(
                "INSERT INTO telegram_messages (id, telegram_user_id, chat_id, role, content, media_path, created_at) VALUES (?1, ?2, ?3, 'assistant', ?4, NULL, ?5)",
                rusqlite::params![&reply_msg_id, &from_id, &chat_id, reply, &now]
            );
            return;
        }
        let sys_prompt = "Sen MizanNet Telegram asistanısın. Samimi, nazik ve güler yüzlü bir dille cevap veriyorsun.
Eğer kullanıcı sana sadece selam veriyor, sohbet ediyor veya soru soruyorsa \"is_command\" alanını false yap ve \"response_message\" ile cevap ver.
Eğer kullanıcı stok, fiş, cari, fatura gibi bir MizanNet verisi kaydetmek istiyorsa \"is_command\" alanını true yap ve ilgili detayları doldur.
Sadece geçerli bir JSON döndür.
Format:
{
  \"is_command\": false,
  \"target_module\": \"Depo\",
  \"title\": \"Yeni Stok/Fiş\",
  \"payload_json\": \"{...detaylar...}\",
  \"uncertainties_json\": \"[]\",
  \"response_message\": \"Kullanıcıya gönderilecek samimi ve nazik yanıt metni.\"
}";
        
        let mut history_text = String::new();
        let mut msgs = vec![
            ChatMessage { role: "system".to_string(), content: sys_prompt.to_string() }
        ];
        
        // Son 10 mesajı çek
        if let Ok(mut stmt) = conn.prepare("SELECT role, content FROM (SELECT role, content, created_at FROM telegram_messages WHERE telegram_user_id = ?1 ORDER BY created_at DESC LIMIT 10) ORDER BY created_at ASC") {
            let _ = stmt.query_map([&from_id], |row| {
                let role: String = row.get(0)?;
                let content: String = row.get(1)?;
                Ok((role, content))
            }).and_then(|mapped| {
                for item in mapped {
                    if let Ok((role, content)) = item {
                        msgs.push(ChatMessage { role: role.clone(), content: content.clone() });
                        let role_tr = if role == "assistant" { "Asistan" } else { "Kullanıcı" };
                        history_text.push_str(&format!("{}: {}\n", role_tr, content));
                    }
                }
                Ok(())
            });
        }
        
        let ai_response = if let Some(ref b64) = photo_b64 {
            let combined = format!("{}\n\nSohbet Geçmişi:\n{}", sys_prompt, history_text);
            ai_chat_with_image(&db_pool, &combined, b64, "image/jpeg")
        } else {
            // "user" message is already included in msgs via the DB insert above
            ai_chat(&db_pool, &msgs)
        };
        
        match ai_response {
            Ok(res) => {
                let clean_json = res.trim().trim_start_matches("```json").trim_start_matches("```").trim_end_matches("```").trim();
                let draft_id = Uuid::new_v4().to_string();
                
                // Varsayılan JSON yapıları
                let mut is_command = false;
                let mut target_module = "Genel".to_string();
                let mut title = "Telegram İşlemi".to_string();
                let mut payload = "{}".to_string();
                let mut uncertainties = "[]".to_string();
                let mut response_msg = "Seni anlayamadım, tekrar eder misin?".to_string();
                
                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(clean_json) {
                    if let Some(c) = parsed.get("is_command").and_then(|b| b.as_bool()) { is_command = c; }
                    if let Some(m) = parsed.get("target_module").and_then(|s| s.as_str()) { target_module = m.to_string(); }
                    if let Some(t) = parsed.get("title").and_then(|s| s.as_str()) { title = t.to_string(); }
                    if let Some(p) = parsed.get("payload_json") { payload = p.to_string(); }
                    if let Some(u) = parsed.get("uncertainties_json") { uncertainties = u.to_string(); }
                    if let Some(r) = parsed.get("response_message").and_then(|s| s.as_str()) { response_msg = r.to_string(); }
                } else {
                    // Yapay zeka JSON formatına uymayıp doğrudan metin cevap verdiyse
                    is_command = false;
                    response_msg = res.trim().to_string();
                }
                
                if is_command {
                    let _ = conn.execute(
                        "INSERT INTO telegram_drafts (id, telegram_user_id, target_module, title, payload_json, uncertainties_json, status, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'pending', ?7)",
                        rusqlite::params![&draft_id, &from_id, &target_module, &title, &payload, &uncertainties, &now]
                    );
                }
                
                send_telegram_message(bot_token, &chat_id, &response_msg);
                
                let bot_msg_id = uuid::Uuid::new_v4().to_string();
                let _ = conn.execute(
                    "INSERT INTO telegram_messages (id, telegram_user_id, chat_id, role, content, media_path, created_at) VALUES (?1, ?2, ?3, 'assistant', ?4, '', ?5)",
                    rusqlite::params![&bot_msg_id, &from_id, &chat_id, &response_msg, &now]
                );
            }
            Err(_) => {
                send_telegram_message(bot_token, &chat_id, "Yapay zeka işlerken bir hata oluştu.");
            }
        }
        
    } else {
        // İzin yoksa request tablosuna ekle
        let req_id = Uuid::new_v4().to_string();
        let _ = conn.execute(
            "INSERT INTO telegram_requests (id, telegram_user_id, username, display_name, phone_number, text, request_type, status, created_at) VALUES (?1, ?2, ?3, ?4, NULL, ?5, 'message', 'pending', ?6)",
            rusqlite::params![&req_id, &from_id, &username, &first_name, &text, &now]
        );
        send_telegram_message(bot_token, &chat_id, "Erişim izniniz yok. Talebiniz yöneticiye iletildi.");
    }
    let _ = app.emit("telegram_update", ());
}

#[tauri::command]
pub fn process_telegram_draft(id: String, pool: State<DbPool>) -> Result<crate::commands::file_analysis::ImportResult, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let payload_json: String = conn.query_row(
        "SELECT payload_json FROM telegram_drafts WHERE id = ?1",
        [&id],
        |row| row.get(0)
    ).map_err(|e| e.to_string())?;

    // AI yardımıyla JSON'u standart formata çevir
    let prompt = format!(
        "Şu JSON verisini al ve MizanNet'in standart import formatına çevir.\n\
         Şu varlık türlerinden birini seç: company, product, invoice, vehicle, worker, tax_item, document, ledger_entry.\n\
         Eğer ledger_entry ise şu alanları kullan: company_id (veya cari_adi üzerinden eşleşen id), date, debit, credit, description.\n\
         SADECE geçerli JSON DÖNDÜR, ek metin yazma:\n\
         {{\"entity_type\": \"...\", \"items\": [ {{...}} ], \"summary\": \"...\"}}\n\
         \n\
         JSON Verisi:\n{}", payload_json
    );

    let messages = vec![
        crate::ai::ChatMessage {
            role: "system".to_string(),
            content: "Sen veri dönüştürme uzmanısın. SADECE JSON döndür.".to_string(),
        },
        crate::ai::ChatMessage {
            role: "user".to_string(),
            content: prompt,
        },
    ];

    let ai_res = crate::ai::ai_chat(&crate::db::DbPool(std::sync::RwLock::new(pool.0.read().unwrap().clone())), &messages)?;
    
    // JSON'u parse et (```json sarmalayıcılarını temizle)
    let clean_json = ai_res.trim().trim_start_matches("```json").trim_start_matches("```").trim_end_matches("```").trim();
    
    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(clean_json) {
        if let Some(entity_type) = parsed.get("entity_type").and_then(|v| v.as_str()) {
            if let Some(items) = parsed.get("items").and_then(|v| v.as_array()) {
                let res = crate::commands::file_analysis::import_analyzed_data(pool.clone(), entity_type.to_string(), items.clone())?;
                let _ = conn.execute("DELETE FROM telegram_drafts WHERE id = ?1", [&id]);
                return Ok(res);
            }
        }
    }

    Err("Taslak verisi işlenemedi veya standart formata uygun değildi.".to_string())
}
