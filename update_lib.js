const fs = require('fs');
let lib = fs.readFileSync('src-tauri/src/lib.rs', 'utf8');

if (!lib.includes('ai_cfo::get_ceo_dashboard_metrics')) {
    lib = lib.replace(
        'use commands::backup::{export_backup, import_backup};',
        'use commands::backup::{export_backup, import_backup};\nuse commands::ai_cfo::get_ceo_dashboard_metrics;'
    );
    
    lib = lib.replace(
        'export_backup,\n            import_backup,',
        'export_backup,\n            import_backup,\n            get_ceo_dashboard_metrics,'
    );
    fs.writeFileSync('src-tauri/src/lib.rs', lib);
}
