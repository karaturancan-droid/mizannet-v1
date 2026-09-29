const fs = require('fs');
let code = fs.readFileSync('src-tauri/src/db_migrations.rs', 'utf8');

if (!code.includes('ALTER TABLE telegram_users ADD COLUMN is_approved')) {
    const migration = `
        let _ = conn.execute("ALTER TABLE telegram_users ADD COLUMN is_approved INTEGER DEFAULT 0", []);
        let _ = conn.execute("ALTER TABLE telegram_users ADD COLUMN role TEXT DEFAULT 'user'", []);
    `;
    code = code.replace(
        'conn.execute_batch(sql)?;\n\n    Ok(())',
        'conn.execute_batch(sql)?;\n' + migration + '\n    Ok(())'
    );
    fs.writeFileSync('src-tauri/src/db_migrations.rs', code);
    console.log('Added telegram_users alter statements');
} else {
    console.log('Already added');
}
