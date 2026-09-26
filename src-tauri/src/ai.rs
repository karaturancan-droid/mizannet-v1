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
            (key, "meta/llama-3.1-70b-instruct".to_string())
        }
        AiProvider::Google => {
            let key = conn.query_row("SELECT value FROM settings WHERE key = ?1", rusqlite::params![SETTING_GOOGLE_API_KEY], |row| row.get(0)).unwrap_or_default();
            (key, "gemini-1.5-flash".to_string())
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
        AiProvider::Nvidia => chat_nvidia(&config, messages),
        AiProvider::Google => chat_google(&config, messages),
        AiProvider::Local => chat_local(&config, messages),
    }
}


/// Görsel + metin analizi. Yalnızca görsel destekleyen sağlayıcılarda çalışır.
pub fn ai_chat_with_image(
    pool: &DbPool,
    prompt: &str,
    image_base64: &str,
    mime_type: &str,
) -> Result<String, String> {
    let config = get_ai_config(pool)?;
    chat_local_with_image(&config, prompt, image_base64, mime_type)
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

fn chat_nvidia(config: &AiConfig, messages: &[ChatMessage]) -> Result<String, String> {
    // NVIDIA NIM OpenAI-compatible endpoint
    let url = "https://integrate.api.nvidia.com/v1/chat/completions";
    let body = serde_json::json!({
        "model": config.model,
        "messages": messages
            .iter()
            .map(|m| serde_json::json!({"role": m.role, "content": m.content}))
            .collect::<Vec<_>>(),
        "max_tokens": 1024,
        "temperature": 0.7
    });

    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(|e| format!("Client oluşturulamadı: {}", e))?;

    let resp = client
        .post(url)
        .bearer_auth(&config.api_key)
        .json(&body)
        .send()
        .map_err(|e| format!("NVIDIA API'ye ulaşılamadı: {}", e))?;

    let status = resp.status();
    let json: serde_json::Value = resp.json().map_err(|e| format!("NVIDIA yanıtı okunamadı: {}", e))?;

    if !status.is_success() {
        let err_msg = json["detail"].as_str()
            .or_else(|| json["error"]["message"].as_str())
            .unwrap_or("Bilinmeyen hata");
        return Err(format!("NVIDIA API hatası ({}): {}", status, err_msg));
    }

    json["choices"][0]["message"]["content"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "NVIDIA API boş yanıt döndürdü.".to_string())
}

fn chat_google(config: &AiConfig, messages: &[ChatMessage]) -> Result<String, String> {
    // Google Gemini REST API
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
        config.model, config.api_key
    );

    // Convert messages to Gemini format (system -> first user turn if needed)
    let mut contents: Vec<serde_json::Value> = Vec::new();
    let mut system_instruction = None;

    for msg in messages {
        match msg.role.as_str() {
            "system" => {
                system_instruction = Some(serde_json::json!({
                    "parts": [{"text": msg.content}]
                }));
            }
            "user" => {
                contents.push(serde_json::json!({
                    "role": "user",
                    "parts": [{"text": msg.content}]
                }));
            }
            "assistant" => {
                contents.push(serde_json::json!({
                    "role": "model",
                    "parts": [{"text": msg.content}]
                }));
            }
            _ => {}
        }
    }

    let mut body = serde_json::json!({
        "contents": contents,
        "generationConfig": {
            "maxOutputTokens": 1024,
            "temperature": 0.7
        }
    });

    if let Some(sys) = system_instruction {
        body["systemInstruction"] = sys;
    }

    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(|e| format!("Client oluşturulamadı: {}", e))?;

    let resp = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .map_err(|e| format!("Google AI API'ye ulaşılamadı: {}", e))?;

    let status = resp.status();
    let json: serde_json::Value = resp.json().map_err(|e| format!("Google yanıtı okunamadı: {}", e))?;

    if !status.is_success() {
        let err_msg = json["error"]["message"].as_str().unwrap_or("Bilinmeyen hata");
        return Err(format!("Google AI hatası ({}): {}", status, err_msg));
    }

    json["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Google AI boş yanıt döndürdü.".to_string())
}

#[tauri::command]
pub fn test_ai_provider(pool: tauri::State<crate::db::DbPool>, provider: String, api_key: String) -> Result<String, String> {
    let test_messages = vec![
        ChatMessage { role: "user".to_string(), content: "Merhaba! Sadece 'Bağlantı başarılı!' yaz.".to_string() }
    ];

    let model = match provider.as_str() {
        "nvidia" => "meta/llama-3.1-70b-instruct",
        "google" => "gemini-1.5-flash",
        _ => return Ok("Yerel yapay zeka zaten aktif.".to_string()),
    };

    let config = AiConfig {
        provider: AiProvider::from_str(&provider),
        api_key,
        model: model.to_string(),
    };

    match config.provider {
        AiProvider::Nvidia => chat_nvidia(&config, &test_messages),
        AiProvider::Google => chat_google(&config, &test_messages),
        AiProvider::Local => Ok("Yerel yapay zeka zaten aktif.".to_string()),
    }
}
