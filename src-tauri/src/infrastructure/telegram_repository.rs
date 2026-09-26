use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::params;
use uuid::Uuid;
use chrono::Local;
use crate::domain::telegram_models::*;

pub type DbPool = Pool<SqliteConnectionManager>;

pub struct TelegramRepository;

impl TelegramRepository {
    pub fn get_bots(conn: &rusqlite::Connection) -> Result<Vec<TelegramBot>, String> {
        let mut stmt = conn
            .prepare("SELECT id, bot_token, username, first_name, status, created_at FROM telegram_bots")
            .map_err(|e| e.to_string())?;
        
        let bots = stmt
            .query_map([], |row| {
                Ok(TelegramBot {
                    id: row.get(0)?,
                    bot_token: row.get(1)?,
                    username: row.get(2)?,
                    first_name: row.get(3)?,
                    status: row.get(4)?,
                    created_at: row.get(5)?,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
            
        Ok(bots)
    }

    pub fn get_users(conn: &rusqlite::Connection) -> Result<Vec<TelegramUser>, String> {
        let mut stmt = conn
            .prepare("SELECT id, telegram_user_id, username, first_name, last_name, language_code, chat_id, message_count, last_message_at, created_at FROM telegram_users")
            .map_err(|e| e.to_string())?;
        
        let users = stmt
            .query_map([], |row| {
                Ok(TelegramUser {
                    id: row.get(0)?,
                    telegram_user_id: row.get(1)?,
                    username: row.get(2)?,
                    first_name: row.get(3)?,
                    last_name: row.get(4)?,
                    language_code: row.get(5)?,
                    chat_id: row.get(6)?,
                    message_count: row.get(7)?,
                    last_message_at: row.get(8)?,
                    created_at: row.get(9)?,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
            
        Ok(users)
    }

    pub fn get_requests(conn: &rusqlite::Connection) -> Result<Vec<TelegramRequest>, String> {
        let mut stmt = conn
            .prepare("SELECT id, telegram_user_id, username, display_name, phone_number, text, request_type, status, created_at FROM telegram_requests ORDER BY created_at DESC")
            .map_err(|e| e.to_string())?;
        
        let reqs = stmt
            .query_map([], |row| {
                Ok(TelegramRequest {
                    id: row.get(0)?,
                    telegram_user_id: row.get(1)?,
                    username: row.get(2)?,
                    display_name: row.get(3)?,
                    phone_number: row.get(4)?,
                    text: row.get(5)?,
                    request_type: row.get(6)?,
                    status: row.get(7)?,
                    created_at: row.get(8)?,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
            
        Ok(reqs)
    }

    pub fn update_request_status(conn: &rusqlite::Connection, id: &str, status: &str) -> Result<(), String> {
        conn.execute(
            "UPDATE telegram_requests SET status = ?1 WHERE id = ?2",
            params![status, id],
        ).map_err(|e| e.to_string())?;
        
        if status == "approved" {
            let req_opt: Option<String> = conn.query_row(
                "SELECT telegram_user_id FROM telegram_requests WHERE id = ?1",
                [id],
                |row| row.get(0)
            ).ok();
            
            if let Some(user_id) = req_opt {
                let allowlist_id = Uuid::new_v4().to_string();
                let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
                let _ = conn.execute(
                    "INSERT OR IGNORE INTO telegram_allowlist (id, telegram_user_id, status, created_at) VALUES (?1, ?2, 'approved', ?3)",
                    params![allowlist_id, user_id, now],
                );
                let _ = conn.execute(
                    "UPDATE telegram_allowlist SET status = 'approved' WHERE telegram_user_id = ?1",
                    params![user_id],
                );
            }
        }
        
        Ok(())
    }
}
