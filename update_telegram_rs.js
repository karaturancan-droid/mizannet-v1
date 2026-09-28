const fs = require('fs');

const path = 'src-tauri/src/commands/telegram.rs';
let c = fs.readFileSync(path, 'utf8');

c = c.replace('use std::time::Duration;', 'use std::time::Duration;\nuse tauri::Emitter;');

const ptm_sig = 'fn process_telegram_message(app: &tauri::AppHandle, pool: &crate::db::DbPoolInner, bot_token: &str, message: &serde_json::Value) {';

let lines = c.split('\n');
let modified = [];
let insidePtm = false;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('pub fn update_telegram_request_status(id: String')) {
        modified.push(lines[i].replace('(id: String', '(app: tauri::AppHandle, id: String'));
    } else if (lines[i].includes('pub fn delete_telegram_draft(id: String')) {
        modified.push(lines[i].replace('(id: String', '(app: tauri::AppHandle, id: String'));
    } else if (lines[i].includes('pub fn save_telegram_bot(bot_token: String')) {
        modified.push(lines[i].replace('(bot_token: String', '(app: tauri::AppHandle, bot_token: String'));
    } else if (lines[i].includes('pub fn delete_telegram_bot(id: String')) {
        modified.push(lines[i].replace('(id: String', '(app: tauri::AppHandle, id: String'));
    } else if (lines[i].includes('TelegramRepository::update_request_status(&conn, &id, &status)') && !lines[i].includes('let res')) {
        modified.push(lines[i].replace('TelegramRepository::update_request_status(&conn, &id, &status)', 'let res = TelegramRepository::update_request_status(&conn, &id, &status); let _ = app.emit("telegram_update", ()); res'));
    } else if (lines[i].includes('conn.execute("DELETE FROM telegram_drafts WHERE id = ?1", [&id]).map_err(|e| e.to_string())?;') && lines[i+1].includes('Ok(())')) {
        modified.push(lines[i]);
        modified.push('    let _ = app.emit("telegram_update", ());');
    } else if (lines[i].includes('pub fn process_telegram_draft(')) {
        insidePtm = false; // end of process_telegram_message region
        modified.push(lines[i]);
    } else if (lines[i].includes('send_telegram_message(bot_token, &chat_id, "Erişim izniniz yok. Talebiniz yöneticiye iletildi.");')) {
        modified.push(lines[i]);
        modified.push('    }');
        modified.push('    let _ = app.emit("telegram_update", ());');
        i++; // skip next line which is '    }'
    } else if (lines[i].includes('conn.execute("DELETE FROM telegram_bots WHERE id = ?1", [&id]).map_err(|e| e.to_string())?;') && lines[i+1].includes('Ok(())')) {
        modified.push(lines[i]);
        modified.push('    let _ = app.emit("telegram_update", ());');
    } else if (lines[i].includes('let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();') && lines[i-1].includes('let id = Uuid::new_v4().to_string();')) {
        modified.push(lines[i]);
        modified.push('    let _ = app.emit("telegram_update", ());');
    } else {
        modified.push(lines[i]);
    }
}

fs.writeFileSync(path, modified.join('\n'));
