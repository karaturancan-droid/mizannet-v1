const fs = require('fs');

let c = fs.readFileSync('src-tauri/src/db_migrations.rs', 'utf8');

if (!c.includes('(18, "whatsapp_allowlist")')) {
    c = c.replace(
        '(17, "expenses_and_cash_agenda"),', 
        '(17, "expenses_and_cash_agenda"),\n        (18, "whatsapp_allowlist"),'
    );
    
    c = c.replace(
        '17 => migration_17_expenses(conn)?,',
        '17 => migration_17_expenses(conn)?,\n                18 => migration_18_whatsapp_allowlist(conn)?,'
    );
    
    const migrationCode = `
fn migration_18_whatsapp_allowlist(conn: &rusqlite::Connection) -> rusqlite::Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS whatsapp_allowlist (
            id TEXT PRIMARY KEY,
            phone_number TEXT NOT NULL UNIQUE,
            status TEXT NOT NULL DEFAULT 'approved',
            name TEXT,
            created_at TEXT NOT NULL
        )",
        [],
    )?;
    Ok(())
}
`;
    c += migrationCode;
    fs.writeFileSync('src-tauri/src/db_migrations.rs', c);
}
