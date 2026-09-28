const fs = require('fs');

function updateFile(path, updater) {
  const content = fs.readFileSync(path, 'utf8');
  const updated = updater(content);
  fs.writeFileSync(path, updated, 'utf8');
}

updateFile('src-tauri/src/commands/telegram.rs', (c) => {
  c = c.replace('use std::thread;\r\nuse std::thread;', 'use std::thread;');
  c = c.replace('use std::thread;\nuse std::thread;', 'use std::thread;');
  
  if (!c.includes('let _ = app.emit("telegram_update"')) {
    // Inject at the end of process_telegram_message
    const parts = c.split('fn process_telegram_message(app: &tauri::AppHandle, pool: &crate::db::DbPoolInner, bot_token: &str, message: &serde_json::Value) {');
    if (parts.length > 1) {
      const idx = parts[1].lastIndexOf('}');
      const start = parts[1].slice(0, idx);
      const end = parts[1].slice(idx);
      parts[1] = start + '\n    let _ = app.emit("telegram_update", ());\n' + end;
      c = parts.join('fn process_telegram_message(app: &tauri::AppHandle, pool: &crate::db::DbPoolInner, bot_token: &str, message: &serde_json::Value) {');
    }
  }

  // Add emit to other functions by changing signature to include AppHandle
  c = c.replace('pub fn update_telegram_request_status(id: String, status: String, pool: State<DbPool>) -> Result<(), String> {',
                'pub fn update_telegram_request_status(app: tauri::AppHandle, id: String, status: String, pool: State<DbPool>) -> Result<(), String> {');
  
  if (c.includes('pub fn update_telegram_request_status(app: tauri::AppHandle, id: String, status: String, pool: State<DbPool>) -> Result<(), String> {\n    let conn = pool.get_conn().map_err(|e| e.to_string())?;\n    TelegramRepository::update_request_status(&conn, &id, &status)\n}')) {
    c = c.replace('pub fn update_telegram_request_status(app: tauri::AppHandle, id: String, status: String, pool: State<DbPool>) -> Result<(), String> {\n    let conn = pool.get_conn().map_err(|e| e.to_string())?;\n    TelegramRepository::update_request_status(&conn, &id, &status)\n}',
      'pub fn update_telegram_request_status(app: tauri::AppHandle, id: String, status: String, pool: State<DbPool>) -> Result<(), String> {\n    let conn = pool.get_conn().map_err(|e| e.to_string())?;\n    let res = TelegramRepository::update_request_status(&conn, &id, &status);\n    let _ = app.emit("telegram_update", ());\n    res\n}');
  }
  
  c = c.replace('pub fn delete_telegram_draft(id: String, pool: State<DbPool>) -> Result<(), String> {\n    let conn = pool.get_conn().map_err(|e| e.to_string())?;\n    conn.execute("DELETE FROM telegram_drafts WHERE id = ?1", [&id]).map_err(|e| e.to_string())?;\n    Ok(())\n}',
                'pub fn delete_telegram_draft(app: tauri::AppHandle, id: String, pool: State<DbPool>) -> Result<(), String> {\n    let conn = pool.get_conn().map_err(|e| e.to_string())?;\n    conn.execute("DELETE FROM telegram_drafts WHERE id = ?1", [&id]).map_err(|e| e.to_string())?;\n    let _ = app.emit("telegram_update", ());\n    Ok(())\n}');

  c = c.replace('pub fn save_telegram_bot(bot_token: String, pool: State<DbPool>) -> Result<TelegramBot, String> {\n    let conn = pool.get_conn().map_err(|e| e.to_string())?;\n    let id = Uuid::new_v4().to_string();\n    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();',
                'pub fn save_telegram_bot(app: tauri::AppHandle, bot_token: String, pool: State<DbPool>) -> Result<TelegramBot, String> {\n    let conn = pool.get_conn().map_err(|e| e.to_string())?;\n    let id = Uuid::new_v4().to_string();\n    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();\n    let _ = app.emit("telegram_update", ());');

  c = c.replace('pub fn delete_telegram_bot(id: String, pool: State<DbPool>) -> Result<(), String> {\n    let conn = pool.get_conn().map_err(|e| e.to_string())?;\n    conn.execute("DELETE FROM telegram_bots WHERE id = ?1", [&id]).map_err(|e| e.to_string())?;\n    Ok(())\n}',
                'pub fn delete_telegram_bot(app: tauri::AppHandle, id: String, pool: State<DbPool>) -> Result<(), String> {\n    let conn = pool.get_conn().map_err(|e| e.to_string())?;\n    conn.execute("DELETE FROM telegram_bots WHERE id = ?1", [&id]).map_err(|e| e.to_string())?;\n    let _ = app.emit("telegram_update", ());\n    Ok(())\n}');

  return c;
});

updateFile('src-tauri/src/lib.rs', (c) => {
  // Add telegram_update event to allowed events maybe? No, not needed for local emit.
  return c;
});

updateFile('src/components/telegram/telegram-panel.tsx', (c) => {
  c = c.replace('import { invoke } from "@tauri-apps/api/core";', 'import { invoke } from "@tauri-apps/api/core";\nimport { listen } from "@tauri-apps/api/event";');
  
  c = c.replace(/const interval = setInterval\(\(\) => \{[\s\S]*?\}, 5000\); \/\/ Polling for updates\s*return \(\) => clearInterval\(interval\);/,
    `let unlisten: any;
    listen("telegram_update", () => {
      loadData();
      if (selectedUser) {
        loadMessages(selectedUser.telegram_user_id);
      }
    }).then(u => { unlisten = u; });
    return () => { if (unlisten) unlisten(); };`);
    
  return c;
});

updateFile('src/components/whatsapp/whatsapp-approvals.tsx', (c) => {
  c = c.replace(/const interval = setInterval\(\(\) => \{[\s\S]*?\}, 30000\);.*?\n/, '');
  c = c.replace('clearInterval(interval);', '');
  return c;
});
