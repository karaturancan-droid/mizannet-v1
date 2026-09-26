import os

filepath = r"D:\madenapp\src-tauri\src\lib.rs"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

target = "app.manage(DbPool(pool_inner));"
replacement = "app.manage(DbPool(std::sync::RwLock::new(pool_inner)));"

new_content = content.replace(target, replacement)
if new_content != content:
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(new_content)
    print("Patched lib.rs")
else:
    print("Could not find target string in lib.rs")
