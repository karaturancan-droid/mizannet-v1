#![allow(unused)]
use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::Connection;
use std::path::Path;

pub type DbPoolInner = Pool<SqliteConnectionManager>;

pub struct DbPool(pub std::sync::RwLock<DbPoolInner>);

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
        crate::db_migrations::run_migrations(&conn).map_err(|e| e.to_string())?;

        let mut current_pool = self.0.write().unwrap();
        *current_pool = new_pool;
        Ok(())
    }
}


pub fn create_pool(app_data_dir: &Path) -> DbPoolInner {
    let db_path = app_data_dir.join("mizannet.db");
    let manager = SqliteConnectionManager::file(db_path).with_init(|c| {
        c.execute_batch("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;")?;
        Ok(())
    });
    Pool::builder()
        .max_size(8)
        .build(manager)
        .expect("failed to create sqlite connection pool")
}

