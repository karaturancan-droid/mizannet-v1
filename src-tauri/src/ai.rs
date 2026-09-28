#![allow(unused)]
use crate::db::DbPool;
use serde::{Deserialize, Serialize};
use tauri::State;

pub const SETTING_AI_PROVIDER: &str = "ai_provider";
pub const SETTING_GOOGLE_API_KEY: &str = "google_api_key";
pub const SETTING_OPENAI_API_KEY: &str = "openai_api_key";
pub const SETTING_HUGGINGFACE_API_KEY: &str = "huggingface_api_key";
pub const SETTING_DEEPSEEK_API_KEY: &str = "deepseek_api_key";
pub const SETTING_NVIDIA_API_KEY: &str = "nvidia_api_key";
pub const SETTING_GROK_API_KEY: &str = "grok_api_key";
pub const SETTING_AI_MODEL: &str = "ai_model";
pub const SETTING_NVIDIA_MODEL: &str = "nvidia_model";
pub const SETTING_GOOGLE_MODEL: &str = "google_model";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum AiProvider {
    Local,
    Nvidia,
    Google,
}

impl AiProvider {
    pub fn from_str(s: &str) -> AiProvider {
        match s.to_lowercase().as_str() {
            "nvidia" => AiProvider::Nvidia,
            "google" => AiProvider::Google,
            _ => AiProvider::Local,
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            AiProvider::Local => "local",
            AiProvider::Nvidia => "nvidia",
            AiProvider::Google => "google",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiConfig {
    pub provider: AiProvider,
    pub api_key: String,
    pub model: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String, // "system" | "user" | "assistant"
    pub content: String,
}

/// Ayarlardan aktif sağlayıcıyı ve API anahtarını okur.
pub fn get_ai_config(pool: &DbPool) -> Result<AiConfig, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;

    let provider_str: String = conn
        .query_row("SELECT value FROM settings WHERE key = ?1", rusqlite::params![SETTING_AI_PROVIDER], |row| row.get(0))
        .unwrap_or_else(|_| "local".to_string());

    let provider = AiProvider::from_str(&provider_str);

    let (api_key, model) = match provider {
        AiProvider::Nvidia => {
            let key = conn.query_row("SELECT value FROM settings WHERE key = ?1", rusqlite::params![SETTING_NVIDIA_API_KEY], |row| row.get(0)).unwrap_or_default();
            let model = conn.query_row("SELECT value FROM settings WHERE key = ?1", rusqlite::params![SETTING_NVIDIA_MODEL], |row| row.get(0)).unwrap_or_else(|_| "deepseek-ai/deepseek-v4.1-flash".to_string());
            (key, model)
        }
        AiProvider::Google => {
            let key = conn.query_row("SELECT value FROM settings WHERE key = ?1", rusqlite::params![SETTING_GOOGLE_API_KEY], |row| row.get(0)).unwrap_or_default();
            let model = conn.query_row("SELECT value FROM settings WHERE key = ?1", rusqlite::params![SETTING_GOOGLE_MODEL], |row| row.get(0)).unwrap_or_else(|_| "gemini-3.8-flash".to_string());
            (key, model)
        }
        AiProvider::Local => {
            let model = conn.query_row("SELECT value FROM settings WHERE key = ?1", rusqlite::params![SETTING_AI_MODEL], |row| row.get(0)).unwrap_or_else(|_| "local-model".to_string());
            ("local".to_string(), model)
        }
    };

    Ok(AiConfig { provider, api_key, model })
}

/// Metin tabanlı sohbet tamamlama. `messages` son mesaj "user" olmalıdır.
pub fn ai_chat(pool: &DbPool, messages: &[ChatMessage]) -> Result<String, String> {
    let config = get_ai_config(pool)?;
    match config.provider {
        AiProvider::Nvidia | AiProvider::Google => chat_agentic(pool, &config, messages, None),
        AiProvider::Local => chat_local(&config, messages),
    }
}

/// Ajan oturumu için: sohbet event'leri yayınlamak üzere AppHandle ile çalışır.
pub fn ai_chat_agentic(
    pool: &DbPool,
    messages: &[ChatMessage],
    app: &tauri::AppHandle,
    session_id: &str,
) -> Result<String, String> {
    let config = get_ai_config(pool)?;
    match config.provider {
        AiProvider::Nvidia | AiProvider::Google => {
            chat_agentic(pool, &config, messages, Some((app, session_id)))
        }
        AiProvider::Local => chat_local(&config, messages),
    }
}

/// Görsel + metin analizi.
pub fn ai_chat_with_image(
    pool: &DbPool,
    prompt: &str,
    image_base64: &str,
    mime_type: &str,
) -> Result<String, String> {
    let config = get_ai_config(pool)?;
    match config.provider {
        AiProvider::Nvidia | AiProvider::Google => chat_agentic_with_image(&config, prompt, image_base64, mime_type),
        AiProvider::Local => chat_local_with_image(&config, prompt, image_base64, mime_type),
    }
}

fn chat_agentic_with_image(
    config: &AiConfig,
    prompt: &str,
    image_base64: &str,
    mime_type: &str,
) -> Result<String, String> {
    let url = match config.provider {
        AiProvider::Google => "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        _ => "https://integrate.api.nvidia.com/v1/chat/completions",
    };
    
    let data_url = format!("data:{};base64,{}", mime_type, image_base64);

    let body = serde_json::json!({
        "model": config.model,
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": data_url}}
            ]
        }],
        "max_tokens": 1024,
        "temperature": 0.7
    });

    let client = reqwest::blocking::Client::builder().timeout(std::time::Duration::from_secs(60)).build().unwrap();
    let resp = client.post(url).bearer_auth(&config.api_key).json(&body).send().map_err(|e| format!("API hatası: {}", e))?;
    let status = resp.status();
    let json: serde_json::Value = resp.json().unwrap_or_default();

    if !status.is_success() {
        let err = json["detail"].as_str().or_else(|| json["error"]["message"].as_str()).unwrap_or("Bilinmeyen hata");
        return Err(format!("Görsel analizi reddedildi ({}): {}. Lütfen modelin Vision desteklediğinden emin olun.", status, err));
    }

    json["choices"][0]["message"]["content"].as_str().map(|s| s.to_string()).ok_or_else(|| "Boş yanıt döndürüldü.".to_string())
}



fn chat_local(_config: &AiConfig, messages: &[ChatMessage]) -> Result<String, String> {
    let url = "http://127.0.0.1:8085/v1/chat/completions";

    let body = serde_json::json!({
        "messages": messages
            .iter()
            .map(|m| serde_json::json!({"role": m.role, "content": m.content}))
            .collect::<Vec<_>>()
    });

    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| format!("Client oluşturulamadı: {}", e))?;
        
    let resp = client
        .post(url)
        .json(&body)
        .send();

    let resp = match resp {
        Ok(r) => r,
        Err(_) => return Err("Yerel yapay zeka sunucusu kapalı veya yanıt vermiyor. Lütfen Ayarlar > Yapay Zeka bölümüne giderek 'Altyapıyı Başlat' butonuna tıklayın veya bir model indirin.".to_string()),
    };

    let status = resp.status();
    let json: serde_json::Value = resp
        .json()
        .map_err(|e| format!("Yerel model yanıtı okunamadı: {}", e))?;

    if !status.is_success() {
        let err_msg = json["error"]["message"]
            .as_str()
            .unwrap_or("Bilinmeyen hata");
        return Err(format!("Yerel model hatası ({}): {}", status, err_msg));
    }

    json["choices"][0]["message"]["content"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Yerel model boş yanıt döndürdü.".to_string())
}

fn chat_local_with_image(
    _config: &AiConfig,
    prompt: &str,
    image_base64: &str,
    mime_type: &str,
) -> Result<String, String> {
    let url = "http://127.0.0.1:8085/v1/chat/completions";
    let data_url = format!("data:{};base64,{}", mime_type, image_base64);

    let body = serde_json::json!({
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": data_url}}
            ]
        }]
    });

    let client = reqwest::blocking::Client::new();
    let resp = client
        .post(url)
        .json(&body)
        .send();

    let resp = match resp {
        Ok(r) => r,
        Err(_) => return Err("Yerel yapay zeka sunucusu kapalı veya yanıt vermiyor. Lütfen Ayarlar > Yapay Zeka bölümüne giderek 'Altyapıyı Başlat' butonuna tıklayın veya bir model indirin.".to_string()),
    };

    let status = resp.status();
    let json: serde_json::Value = resp
        .json()
        .map_err(|e| format!("Yerel model yanıtı okunamadı: {}", e))?;

    if !status.is_success() {
        let err_msg = json["error"]["message"]
            .as_str()
            .unwrap_or("Bilinmeyen hata");
        return Err(format!("Yerel model hatası ({}): {}", status, err_msg));
    }

    json["choices"][0]["message"]["content"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Yerel model boş yanıt döndürdü.".to_string())
}

/// İşletme verilerinin özetini çıkarır (asistan bağlamı ve raporlar için).
pub fn business_context(pool: &DbPool) -> Result<String, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;

    let count = |table: &str| -> i64 {
        conn.query_row(
            &format!("SELECT COUNT(*) FROM {}", table),
            [],
            |r| r.get(0),
        )
        .unwrap_or(0)
    };

    let sum = |table: &str, col: &str| -> f64 {
        conn.query_row(
            &format!("SELECT COALESCE(SUM({}), 0) FROM {}", col, table),
            [],
            |r| r.get(0),
        )
        .unwrap_or(0.0)
    };

    let company_name: String = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'company_name'",
            [],
            |r| r.get(0),
        )
        .unwrap_or_else(|_| "Tanımsız".to_string());

    let tax_no: String = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'tax_no'",
            [],
            |r| r.get(0),
        )
        .unwrap_or_else(|_| "—".to_string());

    let stock_value = sum("products", "current_stock * purchase_price");
    let receivable = sum("ledger_entries", "debit");
    let payable = sum("ledger_entries", "credit");
    let pending_tax = sum("tax_items", "amount");

    let res = format!(
        "İŞLETME ÖZETİ\n\
         İşletme: {} (VKN: {})\n\
         Firma sayısı: {}\n\
         Ürün sayısı: {} (stok değeri: {:.2} TL)\n\
         Araç sayısı: {}\n\
         Çalışan sayısı: {}\n\
         Vergi kaydı sayısı: {} (toplam: {:.2} TL)\n\
         Belge sayısı: {}\n\
         Cari alacak toplamı: {:.2} TL\n\
         Cari borç toplamı: {:.2} TL",
        company_name,
        tax_no,
        count("companies"),
        count("products"),
        stock_value,
        count("vehicles"),
        count("workers"),
        count("tax_items"),
        pending_tax,
        count("documents"),
        receivable,
        payable,
    );

    let rehber_context = "Önemli Mevzuat Bilgileri (Bilgi Bankası):\n- Vergi Usul Kanunu: Fatura mal tesliminden itibaren en geç 7 gün içinde kesilmelidir. Vergi ziyaı cezası genelde 1 kat, kaçakçılıkta 3 kattır.\n- İş Kanunu: Haftalık çalışma süresi 45 saattir. Fazla mesai %50 zamlı ödenir. 1 yıl dolduğunda kıdem tazminatı ve 14 gün yıllık izin hak edilir.\n- Muhasebe Kodları: 120 Alıcılar, 320 Satıcılar, 600 Yurtiçi Satışlar.\n";

    Ok(format!("{}\n\n{}", res, rehber_context))
}

use base64::{engine::general_purpose, Engine as _};

#[tauri::command]
pub fn text_to_speech(text: String, pool: State<DbPool>) -> Result<String, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    
    // Check for OpenAI API Key first
    let openai_key: String = conn
        .query_row(
            "SELECT value FROM settings WHERE key = ?1",
            rusqlite::params![SETTING_OPENAI_API_KEY],
            |row| row.get(0),
        )
        .unwrap_or_default();

    if !openai_key.trim().is_empty() {
        // Use OpenAI TTS
        let url = "https://api.openai.com/v1/audio/speech";
        let body = serde_json::json!({
            "model": "tts-1",
            "input": text,
            "voice": "nova",
            "response_format": "mp3"
        });

        let client = reqwest::blocking::Client::new();
        let resp = client
            .post(url)
            .bearer_auth(&openai_key)
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .map_err(|e| format!("OpenAI API'ye ulaşılamadı: {}", e))?;

        let status = resp.status();
        let bytes = resp.bytes().map_err(|e| format!("OpenAI yanıtı okunamadı: {}", e))?;
        
        if status.is_success() {
            let b64 = general_purpose::STANDARD.encode(&bytes);
            return Ok(format!("data:audio/mp3;base64,{}", b64));
        } else {
            println!("OpenAI TTS Error: {}", String::from_utf8_lossy(&bytes));
        }
    }

    // Fallback to MiniMax
    let minimax_key: String = conn
        .query_row(
            "SELECT value FROM settings WHERE key = ?1",
            rusqlite::params![SETTING_DEEPSEEK_API_KEY],
            |row| row.get(0),
        )
        .unwrap_or_default();

    if minimax_key.trim().is_empty() {
        return Err("OpenAI veya MiniMax API anahtarı bulunamadı. Lütfen ayarlardan API anahtarı ekleyin.".to_string());
    }

    let url = "https://api.minimax.chat/v1/t2a_v2";
    let body = serde_json::json!({
        "model": "speech-01-turbo",
        "text": text,
        "voice_setting": {
            "voice_id": "male-qn-qingse",
            "speed": 1.0,
            "vol": 1.0,
            "pitch": 0
        },
        "audio_setting": {
            "sample_rate": 32000,
            "bitrate": 128000,
            "format": "mp3"
        }
    });

    let client = reqwest::blocking::Client::new();
    let resp = client
        .post(url)
        .header("Authorization", format!("Bearer {}", minimax_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .map_err(|e| format!("MiniMax API'ye ulaşılamadı: {}", e))?;

    let status = resp.status();
    let bytes = resp.bytes().map_err(|e| format!("MiniMax yanıtı okunamadı: {}", e))?;
    
    if !status.is_success() {
        return Err(format!("Ses sentezi API hatası ({}). Anahtarınızı kontrol edin.", status));
    }

    let b64 = general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:audio/mp3;base64,{}", b64))
}

fn chat_deepseek(config: &AiConfig, messages: &[ChatMessage]) -> Result<String, String> {
    let url = "https://api.deepseek.com/chat/completions";
    let body = serde_json::json!({
        "model": config.model,
        "messages": messages
            .iter()
            .map(|m| serde_json::json!({"role": m.role, "content": m.content}))
            .collect::<Vec<_>>()
    });
    let client = reqwest::blocking::Client::new();
    let resp = client.post(url).bearer_auth(&config.api_key).json(&body).send().map_err(|e| format!("DeepSeek API'ye ulaşılamadı: {}", e))?;
    let status = resp.status();
    let json: serde_json::Value = resp.json().map_err(|e| format!("DeepSeek yanıtı okunamadı: {}", e))?;
    if !status.is_success() {
        let err_msg = json["error"]["message"].as_str().unwrap_or("Bilinmeyen hata");
        return Err(format!("DeepSeek hatası ({}): {}", status, err_msg));
    }
    json["choices"][0]["message"]["content"].as_str().map(|s| s.to_string()).ok_or_else(|| "DeepSeek boş yanıt döndürdü.".to_string())
}

fn chat_grok(config: &AiConfig, messages: &[ChatMessage]) -> Result<String, String> {
    let url = "https://api.x.ai/v1/chat/completions";

    let body = serde_json::json!({
        "model": config.model,
        "messages": messages
            .iter()
            .map(|m| serde_json::json!({"role": m.role, "content": m.content}))
            .collect::<Vec<_>>()
    });

    let client = reqwest::blocking::Client::new();
    let resp = client
        .post(url)
        .bearer_auth(&config.api_key)
        .json(&body)
        .send()
        .map_err(|e| format!("Grok API'ye ulaşılamadı: {}", e))?;

    let status = resp.status();
    let json: serde_json::Value = resp
        .json()
        .map_err(|e| format!("Grok yanıtı okunamadı: {}", e))?;

    if !status.is_success() {
        let err_msg = json["error"]["message"]
            .as_str()
            .unwrap_or("Bilinmeyen hata");
        return Err(format!("Grok hatası ({}): {}", status, err_msg));
    }

    json["choices"][0]["message"]["content"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Grok boş yanıt döndürdü.".to_string())
}

// NOT: Ajan araç yardımcıları (terminal, dosya işlemleri, Excel/Word üretimi)
// `commands::agent_tools` modülünde toplandı; aşağıdaki tool-calling döngüsü
// bunları doğrudan çağırır.

fn run_dynamic_sql(pool: &crate::db::DbPool, sql: &str) -> String {
    let conn = match pool.get_conn() {
        Ok(c) => c,
        Err(e) => return format!("Veritabanı bağlantı hatası: {}", e),
    };
    if !sql.trim().to_lowercase().starts_with("select") {
        return "Hata: Yalnızca SELECT sorguları desteklenmektedir.".to_string();
    }
    let mut stmt = match conn.prepare(sql) {
        Ok(s) => s,
        Err(e) => return format!("Sorgu hazırlama hatası: {}", e),
    };
    let col_names: Vec<String> = stmt.column_names().into_iter().map(|s| s.to_string()).collect();
    let col_count = col_names.len();
    let mut rows = match stmt.query([]) {
        Ok(r) => r,
        Err(e) => return format!("Sorgu çalıştırma hatası: {}", e),
    };
    let mut results = Vec::new();
    while let Ok(Some(row)) = rows.next() {
        let mut map = serde_json::Map::new();
        for i in 0..col_count {
            let val: rusqlite::types::Value = match row.get(i) {
                Ok(v) => v,
                Err(_) => rusqlite::types::Value::Null,
            };
            let json_val = match val {
                rusqlite::types::Value::Null => serde_json::Value::Null,
                rusqlite::types::Value::Integer(n) => serde_json::json!(n),
                rusqlite::types::Value::Real(f) => serde_json::json!(f),
                rusqlite::types::Value::Text(t) => serde_json::json!(t),
                rusqlite::types::Value::Blob(_) => serde_json::json!("<blob>"),
            };
            map.insert(col_names[i].clone(), json_val);
        }
        results.push(serde_json::Value::Object(map));
    }
    serde_json::to_string(&results).unwrap_or_else(|e| format!("JSON dönüştürme hatası: {}", e))
}

fn run_write_sql(pool: &crate::db::DbPool, sql: &str) -> String {
    let conn = match pool.get_conn() {
        Ok(c) => c,
        Err(e) => return format!("Veritabanı bağlantı hatası: {}", e),
    };
    let trimmed = sql.trim().to_lowercase();
    // DROP TABLE, ALTER TABLE gibi tehlikeli komutları engelle
    if trimmed.starts_with("drop") || trimmed.starts_with("alter") || trimmed.starts_with("create") {
        return "Hata: DROP, ALTER ve CREATE komutları güvenlik nedeniyle engellenmiştir.".to_string();
    }
    if !(trimmed.starts_with("insert") || trimmed.starts_with("update") || trimmed.starts_with("delete")) {
        return "Hata: Yalnızca INSERT, UPDATE veya DELETE sorguları desteklenmektedir. SELECT için query_database kullanın.".to_string();
    }
    match conn.execute(sql, []) {
        Ok(rows_affected) => format!("Başarılı! {} satır etkilendi.", rows_affected),
        Err(e) => format!("SQL çalıştırma hatası: {}", e),
    }
}

fn chat_agentic(
    pool: &DbPool,
    config: &AiConfig,
    messages: &[ChatMessage],
    agent_ctx: Option<(&tauri::AppHandle, &str)>,
) -> Result<String, String> {
    use crate::commands::agent_tools as tools;

    let (app_opt, session_opt) = agent_ctx.map(|(a, s)| (Some(a.clone()), Some(s.to_string()))).unwrap_or((None, None));
    let session_id = session_opt.unwrap_or_else(|| "cmd".to_string());
    let emit_tool = |tool: &str, detail: &str, status: &str| {
        if let Some(app) = &app_opt {
            tools::emit_agent_event(app, &session_id, tool, detail, status);
        }
    };
    // Yer tutucu: araç fonksiyonları AppHandle bekliyor; agent_ctx yoksa
    // (örn. test_ai_provider) event yayını yapılmaz ama derleme tutarlı kalmalı.
    lazy_static::lazy_static! {
        static ref APP_PLACEHOLDER: tauri::AppHandle = {
            // Bu yol asla tetiklenmemeli; event emit'i app_opt None ise zaten atlanıyor.
            panic!("AppHandle placeholder kullanıldı")
        };
    }
    let app_handle_placeholder = || -> &tauri::AppHandle { &APP_PLACEHOLDER };

    let url = match config.provider {
        AiProvider::Google => "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        _ => "https://integrate.api.nvidia.com/v1/chat/completions",
    };
    
    let mut current_messages: Vec<serde_json::Value> = messages
        .iter()
        .map(|m| serde_json::json!({"role": m.role, "content": m.content}))
        .collect();

    let tools = serde_json::json!([
        {
            "type": "function",
            "function": {
                "name": "query_database",
                "description": "MizanNet SQLite veritabanından veri okumak için SELECT sorgusu çalıştırır. Tablo şeması:\n- companies (id, name, tax_number, tax_office, address, phone, email, type, city, district, notes, created_at)\n- products (id, name, code, barcode, category, unit, purchase_price, sale_price, vat_rate, stock_quantity, min_stock, notes, created_at)\n- workers (id, name, tc_no, position, department, phone, email, address, salary, start_date, status, notes, created_at)\n- ledger_entries (id, company_id, date, description, debit, credit, balance, category, created_at)\n- vehicles (id, plate, brand, model, year, fuel_type, km, status, driver_name, notes, created_at)\n- vehicle_expenses (id, vehicle_id, date, type, amount, description, created_at)\n- invoices (id, company_id, invoice_no, date, type, subtotal, vat_amount, total, status, notes, created_at)\n- invoice_items (id, invoice_id, product_id, product_name, quantity, unit_price, vat_rate, total)\n- settings (key, value)\n- chat_sessions, asistan_messages",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "sql": {
                            "type": "string",
                            "description": "Çalıştırılacak SQLite SELECT sorgusu"
                        }
                    },
                    "required": ["sql"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "write_database",
                "description": "MizanNet veritabanına veri eklemek (INSERT), güncellemek (UPDATE) veya silmek (DELETE) için SQL sorgusu çalıştırır. SELECT için query_database kullanın.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "sql": {
                            "type": "string",
                            "description": "Çalıştırılacak INSERT, UPDATE veya DELETE SQL sorgusu"
                        }
                    },
                    "required": ["sql"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "read_file",
                "description": "Bilgisayardaki bir dosyanın içeriğini okur (txt, md, csv, json, log vb).",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "path": {
                            "type": "string",
                            "description": "Okunacak dosyanın tam yolu (mutlak yol)"
                        }
                    },
                    "required": ["path"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "list_directory",
                "description": "Bilgisayardaki bir klasörün içindeki dosya ve alt klasörleri listeler.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "path": {
                            "type": "string",
                            "description": "Listelenecek klasörün tam yolu (mutlak yol)"
                        }
                    },
                    "required": ["path"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "generate_image",
                "description": "Verilen metin komutuna (prompt) göre sıfırdan yapay zeka ile bir görsel/resim üretir ve bilgisayara kaydeder.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "prompt": {
                            "type": "string",
                            "description": "Üretilecek görselin İngilizce ve detaylı açıklaması"
                        },
                        "filename": {
                            "type": "string",
                            "description": "Kaydedilecek dosya adı (örnek: logo.jpg). Otomatik olarak masaüstüne kaydedilir."
                        }
                    },
                    "required": ["prompt", "filename"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "create_document",
                "description": "Kullanıcıya rapor, fatura veya herhangi bir uzun metin çıktısı sunmak için bilgisayara bir belge (Word/Doc/HTML/TXT) kaydeder.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "content": {
                            "type": "string",
                            "description": "Belgenin içeriği (HTML veya düz metin olabilir)"
                        },
                        "filename": {
                            "type": "string",
                            "description": "Dosya adı (örnek: rapor.html veya hesap.doc). Masaüstüne kaydedilir."
                        }
                    },
                    "required": ["content", "filename"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "write_file",
                "description": "Bilgisayarda herhangi bir yola dosya yazar veya üzerine yazar. Kullanıcının istediği bir klasöre dosya kaydetmek için kullanılır.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "path": {
                            "type": "string",
                            "description": "Dosyanın kaydedileceği tam yol (mutlak yol, örn: C:\\Users\\turan\\Desktop\\rapor.txt)"
                        },
                        "content": {
                            "type": "string",
                            "description": "Dosyaya yazılacak içerik"
                        }
                    },
                    "required": ["path", "content"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "run_terminal",
                "description": "Bilgisayarda terminal (cmd) komutu çalıştırır. Program başlatma, sistem bilgisi, klasör oluşturma, script çalıştırma vb. için kullanılır. Çıktı stdout/stderr/exit_code olarak döner. Zaman aşımı 60 saniyedir.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "command": { "type": "string", "description": "Çalıştırılacak komut (örn: 'dir C:\\Users', 'systeminfo')" },
                        "working_dir": { "type": "string", "description": "Opsiyonel çalışma dizini" }
                    },
                    "required": ["command"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "move_path",
                "description": "Dosya veya klasörü taşır / yeniden adlandırır.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "source": { "type": "string", "description": "Kaynak yol" },
                        "destination": { "type": "string", "description": "Hedef yol" }
                    },
                    "required": ["source", "destination"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "copy_path",
                "description": "Dosya veya klasörü (alt klasörler dahil) kopyalar.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "source": { "type": "string", "description": "Kaynak yol" },
                        "destination": { "type": "string", "description": "Hedef yol" }
                    },
                    "required": ["source", "destination"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "delete_path",
                "description": "Dosya veya klasörü kalıcı olarak siler. Dikkatli kullanın.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "path": { "type": "string", "description": "Silinecek yol" }
                    },
                    "required": ["path"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "search_files",
                "description": "Bir kök klasör altında ada göre dosya/klasör arar (en fazla 200 sonuç).",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "root": { "type": "string", "description": "Arama kök klasörü" },
                        "pattern": { "type": "string", "description": "Aranacak metin (küçük/büyük harf duyarsız)" }
                    },
                    "required": ["root", "pattern"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "generate_excel_file",
                "description": "Gerçek .xlsx Excel dosyası üretir ve masaüstüne kaydeder. rows iki boyutlu dizi olmalı; ilk satır başlık olur ve kalın yazılır.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "file_name": { "type": "string", "description": "Dosya adı (örn: 'ocak_raporu.xlsx')" },
                        "rows": {
                            "type": "array",
                            "description": "Satırlar dizisi; her satır hücre değerleri dizisi",
                            "items": { "type": "array", "items": {} }
                        },
                        "sheet_name": { "type": "string", "description": "Opsiyonel sayfa adı" }
                    },
                    "required": ["file_name", "rows"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "generate_word_file",
                "description": "Gerçek .docx Word dosyası üretir ve masaüstüne kaydeder. content, markdown benzeri metindir: '# Başlık', '## Alt Başlık', '- liste', normal paragraf satırları desteklenir.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "file_name": { "type": "string", "description": "Dosya adı (örn: 'rapor.docx')" },
                        "content": { "type": "string", "description": "Belge içeriği (markdown benzeri)" }
                    },
                    "required": ["file_name", "content"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "send_whatsapp",
                "description": "WhatsApp üzerinden belirtilen numaraya mesaj gönderir.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "number": {
                            "type": "string",
                            "description": "Telefon numarası (ülke koduyla beraber, örn: 905321234567)"
                        },
                        "message": {
                            "type": "string",
                            "description": "Gönderilecek mesaj metni"
                        }
                    },
                    "required": ["number", "message"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "send_telegram",
                "description": "Telegram üzerinden belirtilen Chat ID'ye mesaj gönderir.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "chat_id": {
                            "type": "string",
                            "description": "Telegram Chat ID (örn: 123456789)"
                        },
                        "message": {
                            "type": "string",
                            "description": "Gönderilecek mesaj metni"
                        }
                    },
                    "required": ["chat_id", "message"]
                }
            }
        }
    ]);

    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(|e| format!("Client oluşturulamadı: {}", e))?;

    for _iteration in 0..5 { // En fazla 5 zincirleme tool call
        let body = serde_json::json!({
            "model": config.model,
            "messages": current_messages,
            "max_tokens": 4096,
            "temperature": 0.7,
            "tools": tools
        });

        let resp = client
            .post(url)
            .bearer_auth(&config.api_key)
            .json(&body)
            .send()
            .map_err(|e| format!("AI API'ye ulaşılamadı: {}", e))?;

        let status = resp.status();
        let json: serde_json::Value = resp.json().map_err(|e| format!("AI yanıtı okunamadı: {}", e))?;

        if !status.is_success() {
            let err_msg = json["detail"].as_str()
                .or_else(|| json["error"]["message"].as_str())
                .unwrap_or("Bilinmeyen hata");
            return Err(format!("AI API hatası ({}): {}", status, err_msg));
        }

        let message = &json["choices"][0]["message"];
        
        if let Some(tool_calls) = message["tool_calls"].as_array() {
            // Asistanın tool call isteğini mesajlara ekle
            current_messages.push(message.clone());
            
            for call in tool_calls {
                let id = call["id"].as_str().unwrap_or_default();
                let name = call["function"]["name"].as_str().unwrap_or_default();
                let args_str = call["function"]["arguments"].as_str().unwrap_or("{}");
                
                let result_str = match name {
                    "query_database" => {
                        let parsed: serde_json::Value = serde_json::from_str(args_str).unwrap_or_default();
                        if let Some(sql) = parsed["sql"].as_str() {
                            emit_tool("veritabanı", sql, "running");
                            match tools::query_database(pool, sql) {
                                Ok(rows) => {
                                    emit_tool("veritabanı", &format!("{} satır", rows.len()), "done");
                                    serde_json::to_string(&rows).unwrap_or_else(|e| format!("JSON hatası: {}", e))
                                }
                                Err(e) => {
                                    emit_tool("veritabanı", &e, "error");
                                    format!("Sorgu hatası: {}", e)
                                }
                            }
                        } else {
                            "Hata: sql parametresi bulunamadı.".to_string()
                        }
                    }
                    "write_database" => {
                        let parsed: serde_json::Value = serde_json::from_str(args_str).unwrap_or_default();
                        if let Some(sql) = parsed["sql"].as_str() {
                            emit_tool("veritabanı-yazma", sql, "running");
                            match tools::write_database(pool, sql) {
                                Ok(n) => {
                                    emit_tool("veritabanı-yazma", &format!("{} satır etkilendi", n), "done");
                                    format!("Başarılı! {} satır etkilendi.", n)
                                }
                                Err(e) => {
                                    emit_tool("veritabanı-yazma", &e, "error");
                                    format!("SQL hatası: {}", e)
                                }
                            }
                        } else {
                            "Hata: sql parametresi bulunamadı.".to_string()
                        }
                    }
                    "read_file" => {
                        let parsed: serde_json::Value = serde_json::from_str(args_str).unwrap_or_default();
                        if let Some(path) = parsed["path"].as_str() {
                            emit_tool("read_file", path, "running");
                            let r = match tools::read_file(app_opt.as_ref().unwrap_or(app_handle_placeholder()), &session_id, path) {
                                Ok(content) => {
                                    emit_tool("read_file", path, "done");
                                    content
                                }
                                Err(e) => {
                                    emit_tool("read_file", &format!("{} | {}", path, e), "error");
                                    format!("Dosya okuma hatası: {}", e)
                                }
                            };
                            r
                        } else {
                            "Hata: path parametresi bulunamadı.".to_string()
                        }
                    }
                    "list_directory" => {
                        let parsed: serde_json::Value = serde_json::from_str(args_str).unwrap_or_default();
                        if let Some(path) = parsed["path"].as_str() {
                            emit_tool("list_dir", path, "running");
                            let r = match tools::list_dir(app_opt.as_ref().unwrap_or(app_handle_placeholder()), &session_id, path) {
                                Ok(entries) => {
                                    emit_tool("list_dir", &format!("{} ({} öğe)", path, entries.len()), "done");
                                    serde_json::to_string(&entries).unwrap_or_else(|e| format!("Liste oluşturma hatası: {}", e))
                                }
                                Err(e) => {
                                    emit_tool("list_dir", &format!("{} | {}", path, e), "error");
                                    format!("Klasör okuma hatası: {}", e)
                                }
                            };
                            r
                        } else {
                            "Hata: path parametresi bulunamadı.".to_string()
                        }
                    }
                    "run_terminal" => {
                        let parsed: serde_json::Value = serde_json::from_str(args_str).unwrap_or_default();
                        if let Some(command) = parsed["command"].as_str() {
                            let wd = parsed["working_dir"].as_str();
                            match tools::run_terminal(app_opt.as_ref().unwrap_or(app_handle_placeholder()), &session_id, command, wd) {
                                Ok(res) => serde_json::to_string(&res).unwrap_or_default(),
                                Err(e) => format!("Komut hatası: {}", e),
                            }
                        } else {
                            "Hata: command parametresi bulunamadı.".to_string()
                        }
                    }
                    "move_path" => {
                        let parsed: serde_json::Value = serde_json::from_str(args_str).unwrap_or_default();
                        match (parsed["source"].as_str(), parsed["destination"].as_str()) {
                            (Some(source), Some(destination)) => {
                                match tools::move_path(app_opt.as_ref().unwrap_or(app_handle_placeholder()), &session_id, source, destination) {
                                    Ok(msg) => msg,
                                    Err(e) => format!("Taşıma hatası: {}", e),
                                }
                            }
                            _ => "Hata: source veya destination eksik.".to_string(),
                        }
                    }
                    "copy_path" => {
                        let parsed: serde_json::Value = serde_json::from_str(args_str).unwrap_or_default();
                        match (parsed["source"].as_str(), parsed["destination"].as_str()) {
                            (Some(source), Some(destination)) => {
                                match tools::copy_path(app_opt.as_ref().unwrap_or(app_handle_placeholder()), &session_id, source, destination) {
                                    Ok(msg) => msg,
                                    Err(e) => format!("Kopyalama hatası: {}", e),
                                }
                            }
                            _ => "Hata: source veya destination eksik.".to_string(),
                        }
                    }
                    "delete_path" => {
                        let parsed: serde_json::Value = serde_json::from_str(args_str).unwrap_or_default();
                        if let Some(path) = parsed["path"].as_str() {
                            match tools::delete_path(app_opt.as_ref().unwrap_or(app_handle_placeholder()), &session_id, path) {
                                Ok(msg) => msg,
                                Err(e) => format!("Silme hatası: {}", e),
                            }
                        } else {
                            "Hata: path parametresi bulunamadı.".to_string()
                        }
                    }
                    "search_files" => {
                        let parsed: serde_json::Value = serde_json::from_str(args_str).unwrap_or_default();
                        match (parsed["root"].as_str(), parsed["pattern"].as_str()) {
                            (Some(root), Some(pattern)) => {
                                match tools::search_files(app_opt.as_ref().unwrap_or(app_handle_placeholder()), &session_id, root, pattern) {
                                    Ok(results) => serde_json::to_string(&results).unwrap_or_default(),
                                    Err(e) => format!("Arama hatası: {}", e),
                                }
                            }
                            _ => "Hata: root veya pattern eksik.".to_string(),
                        }
                    }
                    "generate_excel_file" => {
                        let parsed: serde_json::Value = serde_json::from_str(args_str).unwrap_or_default();
                        if let (Some(file_name), Some(rows)) = (parsed["file_name"].as_str(), parsed["rows"].as_array()) {
                            let row_vec: Vec<Vec<serde_json::Value>> = rows.iter().map(|r| r.as_array().cloned().unwrap_or_default()).collect();
                            match tools::generate_excel(app_opt.as_ref().unwrap_or(app_handle_placeholder()), &session_id, file_name, row_vec, parsed["sheet_name"].as_str().map(|s| s.to_string())) {
                                Ok(msg) => msg,
                                Err(e) => format!("Excel üretim hatası: {}", e),
                            }
                        } else {
                            "Hata: file_name veya rows eksik.".to_string()
                        }
                    }
                    "generate_word_file" => {
                        let parsed: serde_json::Value = serde_json::from_str(args_str).unwrap_or_default();
                        if let (Some(file_name), Some(content)) = (parsed["file_name"].as_str(), parsed["content"].as_str()) {
                            match tools::generate_word(app_opt.as_ref().unwrap_or(app_handle_placeholder()), &session_id, file_name, content) {
                                Ok(msg) => msg,
                                Err(e) => format!("Word üretim hatası: {}", e),
                            }
                        } else {
                            "Hata: file_name veya content eksik.".to_string()
                        }
                    }
                    "write_file" => {
                        let parsed: serde_json::Value = serde_json::from_str(args_str).unwrap_or_default();
                        if let (Some(path), Some(content)) = (parsed["path"].as_str(), parsed["content"].as_str()) {
                            emit_tool("write_file", path, "running");
                            match tools::write_file_tool(app_opt.as_ref().unwrap_or(app_handle_placeholder()), &session_id, path, content) {
                                Ok(msg) => {
                                    emit_tool("write_file", path, "done");
                                    msg
                                }
                                Err(e) => {
                                    emit_tool("write_file", &format!("{} | {}", path, e), "error");
                                    format!("Dosya yazma hatası: {}", e)
                                }
                            }
                        } else {
                            "Hata: path veya content parametresi eksik.".to_string()
                        }
                    }
                    "generate_image" => {
                        let parsed: serde_json::Value = serde_json::from_str(args_str).unwrap_or_default();
                        if let (Some(prompt), Some(filename)) = (parsed["prompt"].as_str(), parsed["filename"].as_str()) {
                            emit_tool("gorsel", prompt, "running");
                            match tools::generate_image_tool(app_opt.as_ref().unwrap_or(app_handle_placeholder()), &session_id, prompt, filename) {
                                Ok(msg) => {
                                    emit_tool("gorsel", &msg, "done");
                                    msg
                                }
                                Err(e) => {
                                    emit_tool("gorsel", &e, "error");
                                    format!("Görsel üretilemedi: {}", e)
                                }
                            }
                        } else {
                            "Hata: prompt veya filename parametresi eksik.".to_string()
                        }
                    }
                    "create_document" => {
                        let parsed: serde_json::Value = serde_json::from_str(args_str).unwrap_or_default();
                        if let (Some(content), Some(filename)) = (parsed["content"].as_str(), parsed["filename"].as_str()) {
                            // Gerçek .docx üret (yeni yol); eski .doc/HTML fallback'i korunur
                            if filename.to_lowercase().ends_with(".docx") {
                                emit_tool("word", filename, "running");
                                match tools::generate_word(app_opt.as_ref().unwrap_or(app_handle_placeholder()), &session_id, filename, content) {
                                    Ok(msg) => {
                                        emit_tool("word", filename, "done");
                                        msg
                                    }
                                    Err(e) => {
                                        emit_tool("word", &format!("{} | {}", filename, e), "error");
                                        format!("Belge kaydedilemedi: {}", e)
                                    }
                                }
                            } else {
                                let desktop = dirs::desktop_dir().unwrap_or_else(|| std::path::PathBuf::from("C:\\\\"));
                                let save_path = desktop.join(filename);

                                let mut final_content = content.to_string();

                                // Eger dosya doc ise, basit HTML başlıkları ekle ki Word güzel açsın.
                                if filename.ends_with(".doc") && !final_content.contains("<html>") {
                                    final_content = format!(
                                        "<html><head><meta charset='utf-8'></head><body>\n{}\n</body></html>",
                                        final_content.replace("\n", "<br>")
                                    );
                                }

                                emit_tool("belge", filename, "running");
                                match std::fs::write(&save_path, final_content) {
                                    Ok(_) => {
                                        emit_tool("belge", filename, "done");
                                        format!("Belge başarıyla oluşturuldu ve masaüstüne kaydedildi: {:?}", save_path)
                                    }
                                    Err(e) => {
                                        emit_tool("belge", &format!("{} | {}", filename, e), "error");
                                        format!("Belge kaydedilemedi: {}", e)
                                    }
                                }
                            }
                        } else {
                            "Hata: content veya filename eksik.".to_string()
                        }
                    }
                    "send_whatsapp" => {
                        let parsed: serde_json::Value = serde_json::from_str(args_str).unwrap_or_default();
                        if let (Some(number), Some(message)) = (parsed["number"].as_str(), parsed["message"].as_str()) {
                            let client = reqwest::blocking::Client::builder().timeout(std::time::Duration::from_secs(10)).build().unwrap();
                            let payload = serde_json::json!({
                                "number": number,
                                "message": message
                            });
                            match client.post("http://localhost:3001/send-message").json(&payload).send() {
                                Ok(res) if res.status().is_success() => "WhatsApp mesajı başarıyla gönderildi.".to_string(),
                                Ok(res) => format!("WhatsApp servisi hata döndürdü: {}", res.status()),
                                Err(e) => format!("WhatsApp servisine ulaşılamadı (kapalı olabilir): {}", e)
                            }
                        } else {
                            "Hata: number veya message parametresi eksik.".to_string()
                        }
                    }
                    "send_telegram" => {
                        let parsed: serde_json::Value = serde_json::from_str(args_str).unwrap_or_default();
                        if let (Some(chat_id), Some(message)) = (parsed["chat_id"].as_str(), parsed["message"].as_str()) {
                            if let Ok(conn) = pool.get_conn() {
                                if let Ok(bot_token) = conn.query_row("SELECT bot_token FROM telegram_bots WHERE status = 'active' LIMIT 1", [], |r| r.get::<_, String>(0)) {
                                    let client = reqwest::blocking::Client::new();
                                    let url = format!("https://api.telegram.org/bot{}/sendMessage", bot_token);
                                    match client.post(&url).json(&serde_json::json!({ "chat_id": chat_id, "text": message })).send() {
                                        Ok(res) if res.status().is_success() => "Telegram mesajı başarıyla gönderildi.".to_string(),
                                        Ok(res) => format!("Telegram API hata döndürdü: {}", res.status()),
                                        Err(e) => format!("Telegram API'sine bağlanılamadı: {}", e)
                                    }
                                } else {
                                    "Hata: Sistemde aktif bir Telegram botu bulunamadı.".to_string()
                                }
                            } else {
                                "Hata: Veritabanı bağlantısı kurulamadı.".to_string()
                            }
                        } else {
                            "Hata: chat_id veya message parametresi eksik.".to_string()
                        }
                    }
                    _ => format!("Bilinmeyen araç: {}", name)
                };

                // Tool sonucunu mesajlara ekle
                current_messages.push(serde_json::json!({
                    "role": "tool",
                    "tool_call_id": id,
                    "name": name,
                    "content": result_str
                }));
            }
            continue; // Döngüye devam edip API'yi tekrar çağır
        }

        // Tool call yoksa (veya bittiyse), son mesajı döndür
        return message["content"]
            .as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| "AI API boş yanıt döndürdü.".to_string());
    }

    Err("Çok fazla ardışık araç çağrısı yapıldı.".to_string())
}



#[tauri::command]
pub fn test_ai_provider(_pool: tauri::State<crate::db::DbPool>, provider: String, api_key: String, model: String) -> Result<String, String> {
    let test_messages = vec![
        ChatMessage { role: "user".to_string(), content: "Merhaba! Sadece 'Bağlantı başarılı!' yaz.".to_string() }
    ];

    if provider == "local" {
        return Ok("Yerel yapay zeka zaten aktif.".to_string());
    }

    let selected_model = if model.is_empty() {
        match provider.as_str() {
            "nvidia" => "deepseek-ai/deepseek-v4.1-flash".to_string(),
            "google" => "gemini-3.8-flash".to_string(),
            _ => return Ok("Yerel yapay zeka zaten aktif.".to_string()),
        }
    } else {
        model
    };

    let config = AiConfig {
        provider: AiProvider::from_str(&provider),
        api_key,
        model: selected_model,
    };

    match config.provider {
        AiProvider::Nvidia | AiProvider::Google => chat_agentic(&_pool, &config, &test_messages, None),
        AiProvider::Local => Ok("Yerel yapay zeka zaten aktif.".to_string()),
    }
}
