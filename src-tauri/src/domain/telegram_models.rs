use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct TelegramBot {
    pub id: String,
    pub bot_token: String,
    pub username: Option<String>,
    pub first_name: Option<String>,
    pub status: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TelegramAllowlist {
    pub id: String,
    pub telegram_user_id: String,
    pub status: String,
    pub role: Option<String>,
    pub task: Option<String>,
    pub group_name: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TelegramUser {
    pub id: String,
    pub telegram_user_id: String,
    pub username: Option<String>,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub language_code: Option<String>,
    pub chat_id: Option<String>,
    pub message_count: i64,
    pub last_message_at: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TelegramMessage {
    pub id: String,
    pub telegram_user_id: String,
    pub chat_id: String,
    pub role: String,
    pub content: String,
    pub created_at: String,
    pub media_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TelegramRequest {
    pub id: String,
    pub telegram_user_id: String,
    pub username: Option<String>,
    pub display_name: Option<String>,
    pub phone_number: Option<String>,
    pub text: Option<String>,
    pub request_type: String,
    pub status: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TelegramDraft {
    pub id: String,
    pub telegram_user_id: String,
    pub target_module: String,
    pub title: String,
    pub payload_json: String,
    pub uncertainties_json: String,
    pub status: String,
    pub created_at: String,
}
