import os
import re

src_dir = r"D:\madenapp\src-tauri\src\commands"

for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith(".rs"):
            filepath = os.path.join(root, file)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            
            # Replace pool.0.get() or db.0.get() with just .get_conn()
            # We will implement get_conn() on DbPool
            new_content = re.sub(r"([a-zA-Z0-9_]+)\.0\.get\(\)", r"\1.get_conn()", content)
            
            if new_content != content:
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(new_content)
                print(f"Updated {file}")
