use crate::db::DbPool;
use crate::models::Branch;
use tauri::State;

const BRANCH_COLS: &str = "id, name, description, created_at";

fn map_branch_row(row: &rusqlite::Row) -> rusqlite::Result<Branch> {
    Ok(Branch {
        id: row.get(0)?,
        name: row.get(1)?,
        description: row.get(2)?,
        created_at: row.get(3)?,
    })
}

#[tauri::command]
pub fn list_branches(pool: State<DbPool>) -> Result<Vec<Branch>, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let sql = format!("SELECT {} FROM branches ORDER BY created_at ASC", BRANCH_COLS);
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let mapped = stmt.query_map([], map_branch_row).map_err(|e| e.to_string())?;
    mapped.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}
