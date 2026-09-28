const fs = require('fs');
let lib = fs.readFileSync('src-tauri/src/lib.rs', 'utf8');

lib = lib.replace(
    'import_backup,\n            // asistan',
    'import_backup,\n            get_ceo_dashboard_metrics,\n            // asistan'
);

fs.writeFileSync('src-tauri/src/lib.rs', lib);
