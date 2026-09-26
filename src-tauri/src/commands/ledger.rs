use crate::db::DbPool;
use crate::helpers::{new_id, now_iso, soft_delete};
use crate::models::{LedgerEntry, LedgerSummary};
use rusqlite::Connection;
use tauri::State;

/// Recomputes running_balance for every ledger entry of `company_id` in
/// (date asc, created_at asc) order, and updates companies.balance to the final value.
pub fn recompute_running_balances(conn: &Connection, company_id: &str) -> Result<(), String> {
    let mut stmt = conn
        .prepare("SELECT id, debit, credit FROM ledger_entries WHERE company_id = ?1 ORDER BY date ASC, created_at ASC")
        .map_err(|e| e.to_string())?;
    let rows: Vec<(String, f64, f64)> = stmt
        .query_map(rusqlite::params![company_id], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let mut running = 0.0f64;
    for (id, debit, credit) in &rows {
        running += debit - credit;
        conn.execute(
            "UPDATE ledger_entries SET running_balance = ?1 WHERE id = ?2",
            rusqlite::params![running, id],
        )
        .map_err(|e| e.to_string())?;
    }

    conn.execute(
        "UPDATE companies SET balance = ?1 WHERE id = ?2",
        rusqlite::params![running, company_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn create_ledger_entry(
    pool: State<DbPool>,
    company_id: String,
    date: String,
    document_no: Option<String>,
    description: Option<String>,
    debit: f64,
    credit: f64,
    entry_type: Option<String>,
    branch_id: Option<String>,
) -> Result<LedgerEntry, String> {
    let mut conn = pool.get_conn().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let id = new_id();
    let created_at = now_iso();
    let bid = branch_id.unwrap_or_else(|| "default_branch".to_string());
    
    tx.execute(
        "INSERT INTO ledger_entries (id, company_id, date, document_no, description, debit, credit, running_balance, entry_type, created_at, branch_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 0, ?8, ?9, ?10)",
        rusqlite::params![id, company_id, date, document_no, description, debit, credit, entry_type, created_at, bid],
    )
    .map_err(|e| e.to_string())?;

    recompute_running_balances(&tx, &company_id)?;
    tx.commit().map_err(|e| e.to_string())?;

    let conn2 = pool.get_conn().map_err(|e| e.to_string())?;
    conn2
        .query_row(
            "SELECT id, company_id, date, document_no, description, debit, credit, running_balance, entry_type, created_at, branch_id FROM ledger_entries WHERE id = ?1",
            rusqlite::params![id],
            map_ledger_row,
        )
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_ledger_entry(
    pool: State<DbPool>,
    id: String,
    date: String,
    document_no: Option<String>,
    description: Option<String>,
    debit: f64,
    credit: f64,
    entry_type: Option<String>,
) -> Result<(), String> {
    let mut conn = pool.get_conn().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let company_id: String = tx
        .query_row(
            "SELECT company_id FROM ledger_entries WHERE id = ?1",
            rusqlite::params![id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    tx.execute(
        "UPDATE ledger_entries SET date = ?1, document_no = ?2, description = ?3, debit = ?4, credit = ?5, entry_type = ?6 WHERE id = ?7",
        rusqlite::params![date, document_no, description, debit, credit, entry_type, id],
    )
    .map_err(|e| e.to_string())?;

    recompute_running_balances(&tx, &company_id)?;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_ledger_entry(pool: State<DbPool>, id: String) -> Result<(), String> {
    let mut conn = pool.get_conn().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let company_id: String = tx
        .query_row(
            "SELECT company_id FROM ledger_entries WHERE id = ?1",
            rusqlite::params![id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    soft_delete(&tx, "ledger_entries", "ledger_entry", &id)?;
    recompute_running_balances(&tx, &company_id)?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

fn map_ledger_row(row: &rusqlite::Row) -> rusqlite::Result<LedgerEntry> {
    Ok(LedgerEntry {
        id: row.get(0)?,
        company_id: row.get(1)?,
        date: row.get(2)?,
        document_no: row.get(3)?,
        description: row.get(4)?,
        debit: row.get(5)?,
        credit: row.get(6)?,
        running_balance: row.get(7)?,
        entry_type: row.get(8)?,
        created_at: row.get(9)?,
        branch_id: row.get(10).unwrap_or(None),
    })
}

#[tauri::command]
pub fn list_ledger_entries(
    pool: State<DbPool>,
    company_id: String,
    year_filter: Option<i32>,
    branch_id: Option<String>,
) -> Result<Vec<LedgerEntry>, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let mut base = "SELECT id, company_id, date, document_no, description, debit, credit, running_balance, entry_type, created_at, branch_id FROM ledger_entries WHERE company_id = ?1".to_string();

    if let Some(ref bid) = branch_id {
        base.push_str(&format!(" AND branch_id = '{}'", bid));
    }

    let rows: Vec<LedgerEntry> = if let Some(year) = year_filter {
        let sql = format!("{} AND substr(date, 1, 4) = ?2 ORDER BY date ASC, created_at ASC", base);
        let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
        let year_str = year.to_string();
        let mapped = stmt
            .query_map(rusqlite::params![company_id, year_str], map_ledger_row)
            .map_err(|e| e.to_string())?;
        mapped.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?
    } else {
        let sql = format!("{} ORDER BY date ASC, created_at ASC", base);
        let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
        let mapped = stmt
            .query_map(rusqlite::params![company_id], map_ledger_row)
            .map_err(|e| e.to_string())?;
        mapped.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?
    };

    Ok(rows)
}

#[tauri::command]
pub fn get_ledger_summary(
    pool: State<DbPool>,
    company_id: String,
    year_filter: Option<i32>,
    branch_id: Option<String>,
) -> Result<LedgerSummary, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    
    let mut sql = "SELECT COALESCE(SUM(debit),0), COALESCE(SUM(credit),0) FROM ledger_entries WHERE company_id = ?1".to_string();
    if let Some(ref bid) = branch_id {
        sql.push_str(&format!(" AND branch_id = '{}'", bid));
    }
    
    let (total_debit, total_credit): (f64, f64) = if let Some(year) = year_filter {
        let year_str = year.to_string();
        sql.push_str(" AND substr(date, 1, 4) = ?2");
        conn.query_row(
            &sql,
            rusqlite::params![company_id, year_str],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| e.to_string())?
    } else {
        conn.query_row(
            &sql,
            rusqlite::params![company_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| e.to_string())?
    };

    Ok(LedgerSummary {
        total_debit,
        total_credit,
        net: total_debit - total_credit,
    })
}
