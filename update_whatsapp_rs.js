const fs = require('fs');
const path = 'src-tauri/src/commands/whatsapp.rs';
let c = fs.readFileSync(path, 'utf8');

if (!c.includes('lazy_static::lazy_static!')) {
  c = c.replace('use serde::{Deserialize, Serialize};', 
`use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

lazy_static::lazy_static! {
    static ref WHATSAPP_POLLER_RUNNING: AtomicBool = AtomicBool::new(false);
}`);
}

const startWorkerSig = 'pub fn start_whatsapp_worker(app: AppHandle, state: State<\'_, WhatsAppProcess>';
if (c.includes(startWorkerSig) && !c.includes('WHATSAPP_POLLER_RUNNING.store(true')) {
  // We need to add DbPool to start_whatsapp_worker to pass it to the thread
  c = c.replace(
    'pub fn start_whatsapp_worker(app: AppHandle, state: State<\'_, WhatsAppProcess>) -> Result<bool, String> {',
    'pub fn start_whatsapp_worker(app: AppHandle, state: State<\'_, WhatsAppProcess>, pool: State<\'_, DbPool>) -> Result<bool, String> {'
  );

  // Inject the thread spawning logic before Ok(true)
  const threadLogic = `
    if !WHATSAPP_POLLER_RUNNING.load(Ordering::SeqCst) {
        WHATSAPP_POLLER_RUNNING.store(true, Ordering::SeqCst);
        let app_clone = app.clone();
        let pool_inner = pool.0.read().unwrap().clone();
        
        std::thread::spawn(move || {
            let bg_pool = DbPool(std::sync::RwLock::new(pool_inner));
            let client = reqwest::blocking::Client::builder()
                .timeout(std::time::Duration::from_secs(30))
                .build()
                .unwrap_or_default();
            
            while WHATSAPP_POLLER_RUNNING.load(Ordering::SeqCst) {
                std::thread::sleep(std::time::Duration::from_secs(15));
                
                if let Ok(resp) = client.get("http://localhost:3001/messages").send() {
                    if let Ok(new_messages) = resp.json::<Vec<WorkerMessage>>() {
                        if !new_messages.is_empty() {
                            for msg in new_messages {
                                let conn = match bg_pool.get_conn() {
                                    Ok(c) => c,
                                    Err(_) => continue,
                                };
                                
                                let id = uuid::Uuid::new_v4().to_string();
                                let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
                                
                                let system_prompt = "Gelen WhatsApp mesajını analiz et. Eğer kullanıcı faturadan, ödemeden, cari hesaba borç/alacak kaydından ya da stok ekleme/çıkarmadan bahsediyorsa, sadece ve sadece şu JSON formatında bir öneri dön (başka açıklama yazma):\\n\`\`\`json\\n{\\n  \\"type\\": \\"import_data\\",\\n  \\"description\\": \\"(Örn: Cari hesaba 1000 TL tahsilat işlenecek)\\",\\n  \\"payload\\": { ... }\\n}\\n\`\`\`\\nEğer anlaşılamayan bir sohbet ise hiçbir şey dönme.";
                                
                                let messages = vec![
                                    ChatMessage { role: "system".to_string(), content: system_prompt.to_string() },
                                    ChatMessage { role: "user".to_string(), content: msg.original_message.clone() }
                                ];
                                
                                let ai_res = crate::ai::ai_chat(&bg_pool, &messages).unwrap_or_else(|_| "".to_string());
                                
                                let mut suggested_action = None;
                                if let Some(start) = ai_res.find("\`\`\`json") {
                                    if let Some(end) = ai_res[start + 7..].find("\`\`\`") {
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
                                
                                let _ = app_clone.emit("whatsapp_approval_ready", ());
                            }
                        }
                    }
                }
            }
        });
    }

    Ok(true)`;
    
  c = c.replace('\n    *process_guard = Some(child);\n\n    Ok(true)', '\n    *process_guard = Some(child);\n' + threadLogic);
}

c = c.replace(
  'pub fn stop_whatsapp_worker(state: State<\'_, WhatsAppProcess>) -> Result<bool, String> {',
  'pub fn stop_whatsapp_worker(state: State<\'_, WhatsAppProcess>) -> Result<bool, String> {\n    WHATSAPP_POLLER_RUNNING.store(false, Ordering::SeqCst);'
);

fs.writeFileSync(path, c);

// Also need to update src/app/whatsapp/page.tsx or wherever start_whatsapp_worker is called
// Since we changed the signature to require pool: State<'_, DbPool>, Tauri will auto-inject it, 
// so we don't need to change frontend invoke arguments for `start_whatsapp_worker`!

// Wait, the UI uses `invoke("start_whatsapp_worker")`, which passes no arguments.
// Tauri auto-injects AppHandle and State. So it will be fine.
