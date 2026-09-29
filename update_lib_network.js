const fs = require('fs');

let code = fs.readFileSync('src-tauri/src/lib.rs', 'utf8');

// Add module
if (!code.includes('mod network_server;')) {
    code = code.replace('#![recursion_limit = "512"]\n', '#![recursion_limit = "512"]\nmod network_server;\n');
}

// Add get_local_ip command
const getIpCmd = `\n#[tauri::command]
fn get_local_ip() -> String {
    use std::net::UdpSocket;
    if let Ok(socket) = UdpSocket::bind("0.0.0.0:0") {
        if let Ok(_) = socket.connect("8.8.8.8:80") {
            if let Ok(addr) = socket.local_addr() {
                return addr.ip().to_string();
            }
        }
    }
    "127.0.0.1".to_string()
}\n`;

if (!code.includes('fn get_local_ip()')) {
    code = code.replace('#[cfg_attr(mobile, tauri::mobile_entry_point)]', getIpCmd + '\n#[cfg_attr(mobile, tauri::mobile_entry_point)]');
}

// Spawn server
if (!code.includes('start_lan_server')) {
    code = code.replace(
        'app.manage(commands::whatsapp::WhatsAppProcess(std::sync::Mutex::new(None)));',
        `app.manage(commands::whatsapp::WhatsAppProcess(std::sync::Mutex::new(None)));\n            
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                network_server::start_lan_server(handle).await;
            });`
    );
}

// Register command
if (!code.includes('get_local_ip,')) {
    code = code.replace('invoke_handler(tauri::generate_handler![', 'invoke_handler(tauri::generate_handler![\n            get_local_ip,');
}

fs.writeFileSync('src-tauri/src/lib.rs', code);
