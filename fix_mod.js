const fs = require('fs');

let code = fs.readFileSync('src-tauri/src/lib.rs', 'utf8');

// Ensure mod network_server is at the top of the file
if (!code.includes('mod network_server;')) {
    code = code.replace('mod commands;', 'mod commands;\nmod network_server;');
    fs.writeFileSync('src-tauri/src/lib.rs', code);
    console.log('Fixed mod network_server declaration');
} else if (code.match(/mod network_server;/g).length > 0) {
    // maybe it's in the wrong place?
    code = code.replace('#![recursion_limit = "512"]\nmod network_server;\n', '#![recursion_limit = "512"]\n');
    if (!code.includes('mod network_server;')) {
         code = code.replace('mod commands;', 'mod commands;\nmod network_server;');
    }
    fs.writeFileSync('src-tauri/src/lib.rs', code);
    console.log('Moved mod network_server declaration');
}
