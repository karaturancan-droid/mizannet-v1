import os

filepath = r"D:\madenapp\src-tauri\src\db.rs"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

target = "pub struct DbPool(pub DbPoolInner);"
replacement = """pub struct DbPool(pub std::sync::RwLock<DbPoolInner>);

impl DbPool {
    pub fn get_conn(&self) -> Result<r2d2::PooledConnection<r2d2_sqlite::SqliteConnectionManager>, String> {
        self.0.read().unwrap().get().map_err(|e| e.to_string())
    }

    pub fn switch_conn(&self, db_path: std::path::PathBuf) -> Result<(), String> {
        let manager = r2d2_sqlite::SqliteConnectionManager::file(db_path).with_init(|c| {
            c.execute_batch("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;")?;
            Ok(())
        });
        let new_pool = r2d2::Pool::builder()
            .max_size(8)
            .build(manager)
            .map_err(|e| e.to_string())?;

        let conn = new_pool.get().map_err(|e| e.to_string())?;
        crate::db::run_migrations(&conn).map_err(|e| e.to_string())?;

        let mut current_pool = self.0.write().unwrap();
        *current_pool = new_pool;
        Ok(())
    }
}
"""

new_content = content.replace(target, replacement)
if new_content != content:
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(new_content)
    print("Patched db.rs")
else:
    print("Could not find target string in db.rs")
