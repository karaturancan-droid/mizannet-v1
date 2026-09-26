use crate::db::DbPool;
use crate::helpers::{new_id, now_iso, soft_delete};
use crate::models::TaxItem;
use tauri::State;

fn map_tax_row(row: &rusqlite::Row) -> rusqlite::Result<TaxItem> {
    Ok(TaxItem {
        id: row.get(0)?,
        tax_type: row.get(1)?,
        period: row.get(2)?,
        amount: row.get(3)?,
        due_date: row.get(4)?,
        status: row.get(5)?,
        receipt_path: row.get(6)?,
        notes: row.get(7)?,
        created_at: row.get(8)?,
        branch_id: row.get(9).unwrap_or(None),
    })
}

const TAX_COLS: &str = "id, type, period, amount, due_date, status, receipt_path, notes, created_at, branch_id";

#[tauri::command]
pub fn create_tax_item(
    pool: State<DbPool>,
    r#type: String,
    period: Option<String>,
    amount: f64,
    due_date: String,
    notes: Option<String>,
    branch_id: Option<String>,
) -> Result<TaxItem, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let id = new_id();
    let created_at = now_iso();
    let status = "bekliyor".to_string();
    let bid = branch_id.unwrap_or_else(|| "default_branch".to_string());
    
    conn.execute(
        "INSERT INTO tax_items (id, type, period, amount, due_date, status, receipt_path, notes, created_at, branch_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, NULL, ?7, ?8, ?9)",
        rusqlite::params![id, r#type, period, amount, due_date, status, notes, created_at, bid],
    )
    .map_err(|e| e.to_string())?;

    Ok(TaxItem {
        id,
        tax_type: r#type,
        period,
        amount,
        due_date,
        status,
        receipt_path: None,
        notes,
        created_at,
        branch_id: Some(bid),
    })
}

#[tauri::command]
pub fn update_tax_item(
    pool: State<DbPool>,
    id: String,
    r#type: String,
    period: Option<String>,
    amount: f64,
    due_date: String,
    status: String,
    receipt_path: Option<String>,
    notes: Option<String>,
    branch_id: Option<String>,
) -> Result<(), String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    if let Some(bid) = branch_id {
        conn.execute(
            "UPDATE tax_items SET type=?1, period=?2, amount=?3, due_date=?4, status=?5, receipt_path=?6, notes=?7, branch_id=?8 WHERE id=?9",
            rusqlite::params![r#type, period, amount, due_date, status, receipt_path, notes, bid, id],
        )
        .map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "UPDATE tax_items SET type=?1, period=?2, amount=?3, due_date=?4, status=?5, receipt_path=?6, notes=?7 WHERE id=?8",
            rusqlite::params![r#type, period, amount, due_date, status, receipt_path, notes, id],
        )
        .map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

#[tauri::command]
pub fn list_tax_items(pool: State<DbPool>, branch_id: Option<String>) -> Result<Vec<TaxItem>, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let mut sql = format!("SELECT {} FROM tax_items", TAX_COLS);
    if let Some(ref bid) = branch_id {
        sql.push_str(&format!(" WHERE branch_id = '{}'", bid));
    }
    sql.push_str(" ORDER BY due_date ASC");

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let mapped = stmt.query_map([], map_tax_row).map_err(|e| e.to_string())?;
    mapped.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_tax_item(pool: State<DbPool>, id: String) -> Result<(), String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    soft_delete(&conn, "tax_items", "tax_item", &id)
}

#[tauri::command]
pub fn refresh_overdue_tax_items(pool: State<DbPool>) -> Result<(), String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    refresh_overdue_tax_items_conn(&conn)
}

pub fn refresh_overdue_tax_items_conn(conn: &rusqlite::Connection) -> Result<(), String> {
    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
    conn.execute(
        "UPDATE tax_items SET status = 'gecikti' WHERE due_date < ?1 AND status = 'bekliyor'",
        rusqlite::params![today],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
