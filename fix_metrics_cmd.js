const fs = require('fs');

let code = fs.readFileSync('src-tauri/src/lib.rs', 'utf8');

if (!code.includes('get_ceo_dashboard_metrics,')) {
    code = code.replace('invoke_handler(tauri::generate_handler![', 'invoke_handler(tauri::generate_handler![\n            get_ceo_dashboard_metrics,');
    fs.writeFileSync('src-tauri/src/lib.rs', code);
    console.log('Added get_ceo_dashboard_metrics to invoke_handler');
} else {
    console.log('Already in invoke_handler');
}
