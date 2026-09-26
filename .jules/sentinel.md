## 2026-09-21 - [SQL Injection via Dynamic Column Names]
**Vulnerability:** Found a SQL injection vulnerability in estore_row_generic (src-tauri/src/helpers.rs) where JSON keys were directly interpolated into an INSERT OR REPLACE INTO statement without escaping.
**Learning:** Even when using parameterized values (?1, ?2) for the data itself, developers sometimes dynamically construct queries for column names (e.g. obj.keys().collect().join(",")). If an attacker can control the JSON keys (e.g., via manipulating a backup file or a recycle_bin record), they can inject arbitrary SQL.
**Prevention:** Always escape dynamic identifiers (table names, column names) properly in SQL. In SQLite, this means wrapping them in double quotes and escaping inner quotes: ormat!("\"{}\"", c.replace("\"", "\"\"")).

