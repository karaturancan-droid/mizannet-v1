import os

filepath = r"D:\madenapp\src-tauri\src\commands\mod.rs"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

if "pub mod workspaces;" not in content:
    content += "\npub mod workspaces;\n"
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print("Patched mod.rs")
else:
    print("Already in mod.rs")
