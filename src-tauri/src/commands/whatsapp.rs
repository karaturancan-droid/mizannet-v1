use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::{AppHandle, State};
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

lazy_static::lazy_static! {
    static ref WHATSAPP_POLLER_RUNNING: AtomicBool = AtomicBool::new(false);
}

pub struct WhatsAppProcess(pub Mutex<Option<Child>>);

#[derive(Serialize, Deserialize)]
pub struct WhatsAppStatus {
    pub connected: bool,
    pub qr: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct SendMessagePayload {
    pub number: String,
    pub message: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct WorkerMessage {
    pub id: String,
    pub sender_number: String,
    pub sender_name: String,
    pub original_message: String,
    pub timestamp: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct WhatsAppApproval {
    pub id: String,
    pub sender_number: String,
    pub sender_name: Option<String>,
    pub original_message: String,
    pub suggested_action: Option<String>,
    pub status: String,
    pub created_at: String,
}

use tauri::{Manager, Emitter};
use crate::db::DbPool;
use crate::ai::ChatMessage;

pub fn get_worker_path(app: &AppHandle) -> std::path::PathBuf {
    // 1. App resource directory (production bundle)
    if let Ok(res_dir) = app.path().resource_dir() {
        let p = res_dir.join("whatsapp-worker").join("index.js");
        if p.exists() {
            return p;
        }
        let p_sub = res_dir.join("_up_").join("whatsapp-worker").join("index.js");
        if p_sub.exists() {
            return p_sub;
        }
    }

    // 2. Executable parent directory
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let p = exe_dir.join("whatsapp-worker").join("index.js");
            if p.exists() {
                return p;
            }
        }
    }

    // 3. Current working directory (development inside src-tauri)
    if let Ok(current_dir) = std::env::current_dir() {
        let p = current_dir.join("whatsapp-worker").join("index.js");
        if p.exists() {
            return p;
        }
        
        // If we are in src-tauri, check the parent dir
        if let Some(parent) = current_dir.parent() {
            let p_parent = parent.join("whatsapp-worker").join("index.js");
            if p_parent.exists() {
                return p_parent;
            }
        }
    }

    // 4. Fallback: app data dir
    let data_dir = crate::commands::data_location::resolve_data_dir(app)
        .unwrap_or_else(|_| std::path::PathBuf::from("."));
    data_dir.join("whatsapp-worker").join("index.js")
}

#[tauri::command]
pub fn start_whatsapp_worker(app: AppHandle, state: State<'_, WhatsAppProcess>, pool: State<'_, DbPool>) -> Result<bool, String> {
    let mut process_guard = state.0.lock().unwrap();

    if let Some(child) = process_guard.as_mut() {
        if child.try_wait().ok().flatten().is_none() {
            return Ok(true); // Still running
        }
    }

    let worker_path = get_worker_path(&app);
    let worker_dir = worker_path.parent().unwrap_or_else(|| std::path::Path::new("."));

    // Ensure worker_dir exists on disk before running .current_dir() (prevents OS error 267)
    if let Err(e) = std::fs::create_dir_all(worker_dir) {
        return Err(format!("Worker klasörü oluşturulamadı: {}", e));
    }

    if !worker_path.exists() {
        return Err(format!(
            "WhatsApp altyapı scripti bulunamadı (Aranan yol: {}). Lütfen Node.js ve whatsapp-worker klasörünün yüklü olduğunu kontrol edin.",
            worker_path.display()
        ));
    }

    let log_path = worker_dir.join("worker.log");
    let log_file = std::fs::OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(true)
        .open(&log_path)
        .map_err(|e| format!("Log dosyası oluşturulamadı: {}", e))?;
    let err_file = log_file.try_clone().map_err(|e| format!("Log dosyası klonlanamadı: {}", e))?;

    let mut cmd = Command::new("node");
    cmd.arg(&worker_path)
       .current_dir(worker_dir)
       .stdout(Stdio::from(log_file))
       .stderr(Stdio::from(err_file));

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW: prevent terminal popup
    }

    let child = cmd
        .spawn()
        .map_err(|e| format!("Node.js worker başlatılamadı: {}. Sistemde Node.js kurulu mu?", e))?;

    *process_guard = Some(child);

    Ok(true)
}

#[tauri::command]
pub fn stop_whatsapp_worker(state: State<'_, WhatsAppProcess>) -> Result<bool, String> {
    WHATSAPP_POLLER_RUNNING.store(false, Ordering::SeqCst);
    let mut process_guard = state.0.lock().unwrap();
    if let Some(mut child) = process_guard.take() {
        let _ = child.kill();
    }
    Ok(true)
}

#[tauri::command]
pub fn get_whatsapp_status() -> Result<WhatsAppStatus, String> {
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client
        .get("http://localhost:3001/status")
        .send()
        .map_err(|e| format!("Worker ile bağlantı kurulamadı: {}", e))?;

    let status = resp
        .json::<WhatsAppStatus>()
        .map_err(|e| format!("Status parse hatası: {}", e))?;

    Ok(status)
}

#[tauri::command]
pub fn send_whatsapp_message(payload: SendMessagePayload) -> Result<bool, String> {
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client
        .post("http://localhost:3001/send-message")
        .json(&payload)
        .send()
        .map_err(|e| format!("Worker ile bağlantı kurulamadı: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("Mesaj gönderimi başarısız: {}", resp.status()));
    }

    Ok(true)
}

#[tauri::command]
pub fn logout_whatsapp() -> Result<bool, String> {
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let _ = client
        .post("http://localhost:3001/logout")
        .send()
        .map_err(|e| format!("Worker ile bağlantı kurulamadı: {}", e))?;

    Ok(true)
}

#[tauri::command]
pub fn sync_whatsapp_messages(app: tauri::AppHandle, pool: State<'_, DbPool>) -> Result<usize, String> {
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client
        .get("http://localhost:3001/messages")
        .send()
        .map_err(|e| format!("Worker ile bağlantı kurulamadı: {}", e))?;

    let new_messages = resp
        .json::<Vec<WorkerMessage>>()
        .map_err(|e| format!("Mesajları parse etme hatası: {}", e))?;
        
    if new_messages.is_empty() {
        return Ok(0);
    }

    let count = new_messages.len();
    let app_clone = app.clone();
    
    let pool_inner = pool.0.read().unwrap().clone();
    let bg_pool = DbPool(std::sync::RwLock::new(pool_inner));

    std::thread::spawn(move || {
        for msg in new_messages {
            let conn = match bg_pool.get_conn() {
                Ok(c) => c,
                Err(_) => continue,
            };
            
            
                                let is_allowed: bool = conn.query_row(
                                    "SELECT COUNT(*) FROM whatsapp_allowlist WHERE phone_number = ?1 AND status = 'approved'",
                                    [&msg.sender_number],
                                    |row| row.get::<_, i64>(0)
                                ).map(|c| c > 0).unwrap_or(false);
                                
                                if !is_allowed {
                                    continue;
                                }

                                let id = uuid::Uuid::new_v4().to_string();
            let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
            
            let system_prompt = "Gelen WhatsApp mesajını analiz et. Eğer kullanıcı faturadan, ödemeden, cari hesaba borç/alacak kaydından ya da stok ekleme/çıkarmadan bahsediyorsa, sadece ve sadece şu JSON formatında bir öneri dön (başka açıklama yazma):
```json
{
  \"type\": \"import_data\",
  \"description\": \"(Örn: Cari hesaba 1000 TL tahsilat işlenecek)\",
  \"payload\": { ... }
}
```
Eğer anlaşılamayan bir sohbet ise hiçbir şey dönme.";

            let messages = vec![
                ChatMessage { role: "system".to_string(), content: system_prompt.to_string() },
                ChatMessage { role: "user".to_string(), content: msg.original_message.clone() }
            ];
            
            let ai_res = crate::ai::ai_chat(&bg_pool, &messages).unwrap_or_else(|_| "".to_string());
            
            let mut suggested_action = None;
            if let Some(start) = ai_res.find("```json") {
                if let Some(end) = ai_res[start + 7..].find("```") {
                    let json_str = &ai_res[start + 7..start + 7 + end];
                    if serde_json::from_str::<serde_json::Value>(json_str).is_ok() {
                        suggested_action = Some(json_str.trim().to_string());
                    }
                }
            }

            let _ = conn.execute(
                "INSERT INTO whatsapp_approvals (id, sender_number, sender_name, original_message, suggested_action, status, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                rusqlite::params![&id, &msg.sender_number, &msg.sender_name, &msg.original_message, suggested_action, "pending", &now],
            );
            
            // Notify frontend that an approval is ready
            use tauri::{Manager, Emitter};
            let _ = app_clone.emit("whatsapp_approval_ready", ());
        }
    });

    Ok(count)
}

#[tauri::command]
pub fn get_whatsapp_approvals(pool: State<DbPool>) -> Result<Vec<WhatsAppApproval>, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, sender_number, sender_name, original_message, suggested_action, status, created_at FROM whatsapp_approvals ORDER BY created_at DESC").map_err(|e| e.to_string())?;
    
    let approvals = stmt.query_map([], |row| {
        Ok(WhatsAppApproval {
            id: row.get(0)?,
            sender_number: row.get(1)?,
            sender_name: row.get(2).ok(),
            original_message: row.get(3)?,
            suggested_action: row.get(4).ok(),
            status: row.get(5)?,
            created_at: row.get(6)?,
        })
    }).map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    
    Ok(approvals)
}

#[tauri::command]
pub fn update_whatsapp_approval(id: String, status: String, pool: State<DbPool>) -> Result<(), String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    conn.execute("UPDATE whatsapp_approvals SET status = ?1 WHERE id = ?2", [&status, &id]).map_err(|e| e.to_string())?;
    Ok(())
}
