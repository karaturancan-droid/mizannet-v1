import os
import re

filepath = r"D:\madenapp\src-tauri\src\lib.rs"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Add use statement
if "use commands::workspaces::" not in content:
    use_stmt = "use commands::workspaces::{list_workspaces, create_workspace, switch_workspace};\n"
    # insert after use commands::whatsapp::*;
    content = content.replace("use commands::whatsapp::*;\n", "use commands::whatsapp::*;\n" + use_stmt)

# Add to invoke_handler
if "list_workspaces" not in content:
    target = "process_telegram_draft"
    replacement = "process_telegram_draft,\n            list_workspaces,\n            create_workspace,\n            switch_workspace"
    content = content.replace(target, replacement)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
print("Patched lib.rs commands")
