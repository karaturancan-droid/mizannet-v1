import os
import re

# 1. Fix ai.rs
ai_rs_path = r"D:\madenapp\src-tauri\src\ai.rs"
if os.path.exists(ai_rs_path):
    with open(ai_rs_path, "r", encoding="utf-8") as f:
        content = f.read()
    content = content.replace("pool.0.get()", "pool.get_conn()")
    with open(ai_rs_path, "w", encoding="utf-8") as f:
        f.write(content)

# 2. Fix telegram.rs
tel_rs_path = r"D:\madenapp\src-tauri\src\commands\telegram.rs"
if os.path.exists(tel_rs_path):
    with open(tel_rs_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # let pool_inner = pool.0.clone();
    content = content.replace("let pool_inner = pool.0.clone();", "let pool_inner = pool.0.read().unwrap().clone();")
    
    # let db_pool = crate::db::DbPool(pool.clone());
    content = content.replace("let db_pool = crate::db::DbPool(pool.clone());", "let db_pool = crate::db::DbPool(std::sync::RwLock::new(pool.clone()));")
    
    # &crate::db::DbPool(pool.0.clone())
    content = content.replace("crate::db::DbPool(pool.0.clone())", "crate::db::DbPool(std::sync::RwLock::new(pool.0.read().unwrap().clone()))")
    
    with open(tel_rs_path, "w", encoding="utf-8") as f:
        f.write(content)

# 3. Fix whatsapp.rs (just in case)
wa_rs_path = r"D:\madenapp\src-tauri\src\commands\whatsapp.rs"
if os.path.exists(wa_rs_path):
    with open(wa_rs_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    content = content.replace("let pool_inner = pool.0.clone();", "let pool_inner = pool.0.read().unwrap().clone();")
    content = content.replace("crate::db::DbPool(pool.0.clone())", "crate::db::DbPool(std::sync::RwLock::new(pool.0.read().unwrap().clone()))")
    
    with open(wa_rs_path, "w", encoding="utf-8") as f:
        f.write(content)

# 4. Fix backup.rs
backup_rs_path = r"D:\madenapp\src-tauri\src\commands\backup.rs"
if os.path.exists(backup_rs_path):
    with open(backup_rs_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    content = content.replace("let pool_inner = pool.0.clone();", "let pool_inner = pool.0.read().unwrap().clone();")
    content = content.replace("crate::db::DbPool(pool.0.clone())", "crate::db::DbPool(std::sync::RwLock::new(pool.0.read().unwrap().clone()))")
    
    with open(backup_rs_path, "w", encoding="utf-8") as f:
        f.write(content)

print("Fixed clone/RwLock errors!")
