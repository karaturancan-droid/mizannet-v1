#![allow(unused)]
use crate::ai::{self, ChatMessage};
use crate::db::DbPool;
use serde::{Deserialize, Serialize};
use tauri::{State, Manager, Emitter};

use futures_util::StreamExt;
use std::fs;
use std::path::PathBuf;

const HISTORY_LIMIT: usize = 20;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Message {
    pub id: String,
    pub role: String, // "user" or "assistant"
    pub content: String,
    pub timestamp: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub suggested_action: Option<SuggestedAction>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub media_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SuggestedAction {
    #[serde(rename = "type")]
    pub action_type: String,
    pub description: String,
    pub payload: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatSession {
    pub id: String,
    pub title: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatHistory {
    pub messages: Vec<Message>,
}

#[tauri::command]
pub fn get_chat_sessions(pool: State<DbPool>) -> Result<Vec<ChatSession>, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    
    let mut stmt = conn
        .prepare("SELECT id, title, created_at, updated_at FROM chat_sessions ORDER BY updated_at DESC")
        .map_err(|e| e.to_string())?;
        
    let sessions = stmt
        .query_map([], |row| {
            Ok(ChatSession {
                id: row.get(0)?,
                title: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
        
    Ok(sessions)
}

#[tauri::command]
pub fn create_chat_session(title: String, pool: State<DbPool>) -> Result<ChatSession, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    
    conn.execute(
        "INSERT INTO chat_sessions (id, title, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![&id, &title, &now, &now],
    ).map_err(|e| e.to_string())?;
    
    Ok(ChatSession {
        id,
        title,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn update_chat_session_title(id: String, title: String, pool: State<DbPool>) -> Result<(), String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "UPDATE chat_sessions SET title = ?1, updated_at = ?2 WHERE id = ?3",
        rusqlite::params![&title, &now, &id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_chat_session(id: String, pool: State<DbPool>) -> Result<(), String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM asistan_messages WHERE session_id = ?1", [&id]).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM chat_sessions WHERE id = ?1", [&id]).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn asistan_get_history(session_id: String, pool: State<DbPool>) -> Result<ChatHistory, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, role, content, timestamp, suggested_action, media_path 
             FROM asistan_messages 
             WHERE session_id = ?1
             ORDER BY timestamp ASC",
        )
        .map_err(|e| e.to_string())?;

    let messages = stmt
        .query_map([&session_id], |row| {
            let suggested_action_str: Option<String> = row.get(4).ok();
            let suggested_action = suggested_action_str.and_then(|s| {
                serde_json::from_str(&s).ok()
            });

            let media_path_str: Option<String> = row.get(5).ok();
            Ok(Message {
                id: row.get(0)?,
                role: row.get(1)?,
                content: row.get(2)?,
                timestamp: row.get(3)?,
                suggested_action,
                media_path: media_path_str,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(ChatHistory { messages })
}

#[tauri::command]
pub fn asistan_mesaj_gonder(
    app: tauri::AppHandle,
    session_id: String,
    mesaj: String,
    image_base64: Option<String>,
    pool: State<DbPool>,
) -> Result<Message, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let user_id = uuid::Uuid::new_v4().to_string();

    let mut media_path = None;
    if let Some(ref b64) = image_base64 {
        if let Ok(file_path) = crate::commands::documents::save_document_file(app.clone(), "Asistan_Gorsel.jpg".to_string(), b64.clone()) {
            media_path = Some(file_path.clone());
            let doc_id = uuid::Uuid::new_v4().to_string();
            let _ = conn.execute(
                "INSERT INTO documents (id, title, category, file_type, file_path, related_type, related_id, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                rusqlite::params![doc_id, "Asistan Görseli", "Asistan Yüklemesi", "jpg", file_path, "asistan", session_id, now]
            );
        }
    }

    // Kullanıcı mesajını kaydet
    conn.execute(
        "INSERT INTO asistan_messages (id, role, content, timestamp, session_id, media_path) 
         VALUES (?, ?, ?, ?, ?, ?)",
        rusqlite::params![&user_id, "user", &mesaj, &now, &session_id, media_path.as_deref()],
    )
    .map_err(|e| e.to_string())?;
    
    // Oturumu güncelle
    let _ = conn.execute(
        "UPDATE chat_sessions SET updated_at = ?1 WHERE id = ?2",
        [&now, &session_id],
    );

    let user_msg_ack = Message {
        id: user_id,
        role: "user".to_string(),
        content: mesaj.clone(),
        timestamp: now,
        suggested_action: None,
        media_path: media_path.clone(),
    };

    // Arka plan iş parçacığına (thread) devret:
    let app_handle = app.clone();
    let session_id_clone = session_id.clone();
    let mesaj_clone = mesaj.clone();
    let image_base64_clone = image_base64.clone();
    
    // Yeni thread için pool klonu
    let pool_inner = pool.0.read().unwrap().clone();
    let new_pool = DbPool(std::sync::RwLock::new(pool_inner));

    std::thread::spawn(move || {
        // AI yanıtı üret (hafıza + işletme bağlamı ile)
        let assistant_response = generate_ai_response(&new_pool, &session_id_clone, &mesaj_clone, image_base64_clone.as_deref());

        let assistant_id = uuid::Uuid::new_v4().to_string();
        let assistant_timestamp = chrono::Local::now()
            .format("%Y-%m-%d %H:%M:%S")
            .to_string();

        let suggested_action_json = assistant_response
            .suggested_action
            .as_ref()
            .map(|sa| serde_json::to_string(sa).unwrap_or_default());

        if let Ok(conn) = new_pool.get_conn() {
            let _ = conn.execute(
                "INSERT INTO asistan_messages (id, role, content, timestamp, suggested_action, session_id) 
                 VALUES (?, ?, ?, ?, ?, ?)",
                rusqlite::params![
                    &assistant_id,
                    "assistant",
                    &assistant_response.content,
                    &assistant_timestamp,
                    suggested_action_json,
                    &session_id_clone
                ],
            );
        }

        let msg = Message {
            id: assistant_id,
            role: "assistant".to_string(),
            content: assistant_response.content,
            timestamp: assistant_timestamp,
            suggested_action: assistant_response.suggested_action,
            media_path: None,
        };

        // Frontend'e event gönder
        let _ = app_handle.emit("ai_response", msg);
    });

    // Kullanıcı mesajı onayı (anında döner, UI kilitlenmez)
    Ok(user_msg_ack)
}

/// Sohbet geçmişini temizler (yeni sohbet başlatma).
#[tauri::command]
pub fn asistan_clear_history(session_id: String, pool: State<DbPool>) -> Result<(), String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM asistan_messages WHERE session_id = ?1", [&session_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

fn generate_ai_response(pool: &DbPool, session_id: &str, user_message: &str, image_base64: Option<&str>) -> Message {
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // 1) Sohbet geçmişini oku (hafıza)
    let history = load_recent_history(pool, session_id);

    // 2) İşletme verileri bağlamını al
    let business = ai::business_context(pool)
        .unwrap_or_else(|e| format!("Veri özeti alınamadı: {}", e));

    // Bilgi Bankası (Knowledge Base) araması
    let knowledge_context = search_knowledge_base(user_message);

    // 3) AI'a gönderilecek mesajları kur
    let mut messages: Vec<ChatMessage> = Vec::new();
    messages.push(ChatMessage {
        role: "system".to_string(),
        content: format!(
            "Sen MizanNet işletme yönetim uygulamasının yapay zeka asistanısın. \
             Kullanıcıya Türkçe yanıt ver. Aşağıdaki işletme verilerini soruları yanıtlarken ve \
             rapor hazırlarken kullan. Verilerde olmayan bir bilgiyi uydurma, 'veritabanında bu bilgi yok' de.\n\
             \n\
             Eğer kullanıcı muhasebe kodları, vergi usul kanunu, iş kanunu vb. bir hukuki soru sorarsa, \
             aşağıdaki Bilgi Bankası özetini kullanarak cevap ver (kullanıcının sorusuyla eşleşen maddeler getirilmiştir):\n\
             BİLGİ BANKASI İÇERİĞİ:\n\
             {}\n\
             \n\
             Eğer kullanıcı sisteme veri eklemek (örneğin cari hesap, fatura, stok VEYA borç/alacak cari hareket) isterse veya bir fotoğraftaki verileri \
             sisteme kaydetmeni isterse, metin yanıtının EN SONUNA şu formatta bir JSON bloğu ekle (```json ile başlat):\n\
             ```json\n\
             {{\n\
               \"suggested_action\": {{\n\
                 \"type\": \"import_data\",\n\
                 \"description\": \"(Örn: 2 yeni cari kart eklenecek veya Cari hesaba borç işlenecek)\",\n\
                 \"payload\": {{\n\
                   \"entity_type\": \"(company veya product veya invoice veya ledger_entry)\",\n\
                   \"items\": [\n\
                      {{ \"name\": \"...\" }} \n\
                      // EĞER invoice VEYA ledger_entry EKLİYORSAN ŞU ALANLARI KULLAN: \n\
                      // {{\"company_name\": \"Firma Adı (Örn: TECHTO Enerji)\", \"date\": \"YYYY-MM-DD\", \"debit\": 0.0, \"credit\": 1000.0, \"description\": \"açıklama\", \"subtotal\": 800.0, \"vat_amount\": 160.0, \"total\": 960.0, \"items\": [{{ \"name\": \"Ürün\", \"quantity\": 1, \"unit_price\": 800.0 }}]}} \n\
                   ]\n\
                 }}\n\
               }}\n\
             }}\n\
             ```\n\
             Bu JSON bloğu sayesinde uygulama verileri otomatik olarak kaydedebilecektir.\n\n{}",
            knowledge_context, business
        ),
    });

    for msg in history {
        messages.push(ChatMessage {
            role: msg.role,
            content: msg.content,
        });
    }

    messages.push(ChatMessage {
        role: "user".to_string(),
        content: user_message.to_string(),
    });

    // 4) AI çağrısı; başarısız olursa yedek yanıt
    let ai_result = if let Some(b64) = image_base64 {
        let combined_msg = format!("{}\n\nKullanıcı: {}", business, user_message);
        crate::ai::ai_chat_with_image(pool, &combined_msg, b64, "image/jpeg")
    } else {
        ai::ai_chat(pool, &messages)
    };

    match ai_result {
        Ok(mut content) => {
            let mut suggested_action = None;
            if let Some(start) = content.find("```json") {
                if let Some(end) = content[start + 7..].find("```") {
                    let json_str = &content[start + 7..start + 7 + end];
                    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(json_str) {
                        if let Some(sa) = parsed.get("suggested_action") {
                            suggested_action = serde_json::from_value(sa.clone()).ok();
                            
                            // Remove the json block from the content
                            let mut new_text = String::new();
                            new_text.push_str(&content[..start]);
                            new_text.push_str(&content[start + 7 + end + 3..]);
                            content = new_text.trim().to_string();
                        }
                    }
                }
            }

            Message {
                id: uuid::Uuid::new_v4().to_string(),
                role: "assistant".to_string(),
                content,
                timestamp: now,
                suggested_action,
                media_path: None,
            }
        },
        Err(err) => Message {
            id: uuid::Uuid::new_v4().to_string(),
            role: "assistant".to_string(),
            content: if err.contains("503") {
                format!(
                    "⏳ Yerel yapay zeka modeli şu anda yükleniyor, lütfen biraz bekleyip tekrar deneyin...\n\n(Hata Detayı: {})",
                    err
                )
            } else {
                format!(
                    "⚠️ Yapay zeka yanıtı alınamadı: {}\n\n\
                     Yapay zeka modelinin arka planda çalıştığından veya indirme işleminin tamamlandığından emin olun.",
                    err
                )
            },
            timestamp: now,
            suggested_action: None,
            media_path: None,
        },
    }
}

fn load_recent_history(pool: &DbPool, session_id: &str) -> Vec<ChatMessage> {
    let conn = match pool.get_conn() {
        Ok(c) => c,
        Err(_) => return Vec::new(),
    };

    let mut stmt = match conn.prepare(
        "SELECT role, content FROM asistan_messages WHERE session_id = ?1 ORDER BY timestamp DESC LIMIT ?2",
    ) {
        Ok(s) => s,
        Err(_) => return Vec::new(),
    };

    let rows: Vec<(String, String)> = stmt
        .query_map(rusqlite::params![session_id, HISTORY_LIMIT as i64], |row| {
            Ok((row.get(0)?, row.get(1)?))
        })
        .map(|iter| iter.filter_map(|r| r.ok()).collect())
        .unwrap_or_default();

    // Kronolojik sıraya çevir
    rows.into_iter()
        .rev()
        .map(|(role, content)| ChatMessage { role, content })
        .collect()
}

#[derive(Deserialize)]
struct KnowledgeItem {
    title: String,
    content: String,
}

fn search_knowledge_base(query: &str) -> String {
    let mut context = String::new();
    let query_lower = query.to_lowercase();
    let query_words: Vec<&str> = query_lower.split_whitespace().collect();
    
    // Ignore very short or generic queries
    if query_words.len() < 1 || (query_words.len() == 1 && query_words[0].len() < 3) {
        return context;
    }

    let public_dir = PathBuf::from("public/data");
    let files = ["vuk.json", "tekduzen.json", "is_kanunu.json", "kilavuz.json"];
    
    let mut all_matches: Vec<(usize, String, String)> = Vec::new(); // score, title, content
    
    for file in files.iter() {
        let path = public_dir.join(file);
        if let Ok(data) = fs::read_to_string(path) {
            if let Ok(items) = serde_json::from_str::<Vec<KnowledgeItem>>(&data) {
                for item in items {
                    let item_content_lower = item.content.to_lowercase();
                    let item_title_lower = item.title.to_lowercase();
                    
                    let mut score = 0;
                    for word in &query_words {
                        if word.len() > 3 {
                            if item_title_lower.contains(word) { score += 3; }
                            if item_content_lower.contains(word) { score += 1; }
                        }
                    }
                    
                    if score > 0 {
                        all_matches.push((score, item.title, item.content));
                    }
                }
            }
        }
    }
    
    // Sort by score descending
    all_matches.sort_by(|a, b| b.0.cmp(&a.0));
    
    // Take top 3 matches to avoid huge context
    for (i, (_, title, content)) in all_matches.iter().take(3).enumerate() {
        context.push_str(&format!("--- Madde {} ---\nBaşlık: {}\nİçerik: {}\n\n", i+1, title, content));
    }
    
    context
}
