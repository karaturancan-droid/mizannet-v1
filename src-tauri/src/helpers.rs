use chrono::{Duration, Utc};
use rusqlite::types::{Value as SqlValue, ValueRef};
use rusqlite::Connection;
use serde_json::{Map, Value as JsonValue};
use uuid::Uuid;

pub fn new_id() -> String {
    Uuid::new_v4().to_string()
}

pub fn now_iso() -> String {
    Utc::now().to_rfc3339()
}

fn sql_value_ref_to_json(v: ValueRef) -> JsonValue {
    match v {
        ValueRef::Null => JsonValue::Null,
        ValueRef::Integer(i) => JsonValue::from(i),
        ValueRef::Real(f) => JsonValue::from(f),
        ValueRef::Text(t) => JsonValue::from(String::from_utf8_lossy(t).to_string()),
        ValueRef::Blob(_) => JsonValue::Null,
    }
}

fn json_to_sql_value(v: &JsonValue) -> SqlValue {
    match v {
        JsonValue::Null => SqlValue::Null,
        JsonValue::Bool(b) => SqlValue::Integer(if *b { 1 } else { 0 }),
        JsonValue::Number(n) => {
            if let Some(i) = n.as_i64() {
                SqlValue::Integer(i)
            } else if let Some(f) = n.as_f64() {
                SqlValue::Real(f)
            } else {
                SqlValue::Null
            }
        }
        JsonValue::String(s) => SqlValue::Text(s.clone()),
        _ => SqlValue::Null,
    }
}

/// Reads a full row from `table` where id = `id` and returns it as a JSON object
/// mapping column name -> value, using the connection's live schema (safe: table
/// name is always a hardcoded internal constant, never user input).
pub fn row_as_json(conn: &Connection, table: &str, id: &str) -> rusqlite::Result<Option<JsonValue>> {
    let sql = format!("SELECT * FROM {} WHERE id = ?1", table);
    let mut stmt = conn.prepare(&sql)?;
    let col_names: Vec<String> = stmt.column_names().iter().map(|s| s.to_string()).collect();
    let mut rows = stmt.query(rusqlite::params![id])?;
    if let Some(row) = rows.next()? {
        let mut map = Map::new();
        for (i, name) in col_names.iter().enumerate() {
            let value_ref = row.get_ref(i)?;
            map.insert(name.clone(), sql_value_ref_to_json(value_ref));
        }
        Ok(Some(JsonValue::Object(map)))
    } else {
        Ok(None)
    }
}

/// Soft-deletes a row: serializes it into recycle_bin then removes it from its table.
/// Wrapped by the caller in a transaction if additional cascading steps are needed.
pub fn soft_delete(
    conn: &Connection,
    table: &str,
    entity_type: &str,
    id: &str,
) -> Result<(), String> {
    let json = row_as_json(conn, table, id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("{} bulunamadi (id={})", table, id))?;

    let now = now_iso();
    let deadline = (Utc::now() + Duration::days(60)).to_rfc3339();
    let record_data = serde_json::to_string(&json).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO recycle_bin (id, entity_type, record_data, deleted_at, restore_deadline) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![new_id(), entity_type, record_data, now, deadline],
    )
    .map_err(|e| e.to_string())?;

    let del_sql = format!("DELETE FROM {} WHERE id = ?1", table);
    conn.execute(&del_sql, rusqlite::params![id])
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Table name (and required column order for INSERT) for a given recycle_bin entity_type.
pub fn table_for_entity_type(entity_type: &str) -> Option<&'static str> {
    match entity_type {
        "company" => Some("companies"),
        "ledger_entry" => Some("ledger_entries"),
        "product" => Some("products"),
        "vehicle" => Some("vehicles"),
        "vehicle_expense" => Some("vehicle_expenses"),
        "tire" => Some("tires"),
        "worker" => Some("workers"),
        "leave" => Some("leaves"),
        "overtime" => Some("overtimes"),
        "payroll" => Some("payrolls"),
        "document" => Some("documents"),
        "tax_item" => Some("tax_items"),
        _ => None,
    }
}

/// Re-inserts a JSON object (as produced by row_as_json) back into `table`.
pub fn restore_row_generic(conn: &Connection, table: &str, json: &JsonValue) -> Result<(), String> {
    let obj = json
        .as_object()
        .ok_or_else(|| "Gecersiz kayit verisi".to_string())?;

    let columns: Vec<&String> = obj.keys().collect();
    let col_list = columns
        .iter()
        .map(|c| format!("\"{}\"", c.replace("\"", "\"\"")))
        .collect::<Vec<_>>()
        .join(", ");
    let placeholders = (1..=columns.len())
        .map(|i| format!("?{}", i))
        .collect::<Vec<_>>()
        .join(", ");
    let sql = format!(
        "INSERT OR REPLACE INTO {} ({}) VALUES ({})",
        table, col_list, placeholders
    );

    let values: Vec<SqlValue> = columns.iter().map(|c| json_to_sql_value(&obj[*c])).collect();
    let params: Vec<&dyn rusqlite::ToSql> = values.iter().map(|v| v as &dyn rusqlite::ToSql).collect();

    conn.execute(&sql, params.as_slice()).map_err(|e| e.to_string())?;
    Ok(())
}
