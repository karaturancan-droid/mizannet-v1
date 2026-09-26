use crate::db::DbPool;
use crate::helpers::{new_id, now_iso, soft_delete};
use crate::models::Company;
use tauri::State;

#[tauri::command]
pub fn create_company(
    pool: State<DbPool>,
    name: String,
    tax_no: Option<String>,
    phone: Option<String>,
    email: Option<String>,
    contact_person: Option<String>,
) -> Result<Company, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;

    // Premium Check
    let status: Option<String> = conn.query_row("SELECT value FROM settings WHERE key = 'license_status'", [], |row| row.get(0)).ok();
    let is_premium = status.as_deref() == Some("PREMIUM");
    
    if !is_premium {
        let count: i32 = conn.query_row("SELECT COUNT(*) FROM companies", [], |row| row.get(0)).unwrap_or(0);
        if count >= 20 {
            return Err("Ücretsiz deneme sürümünde en fazla 20 firma ekleyebilirsiniz. Sınırsız firma eklemek için aboneliğinizi yükseltin.".to_string());
        }
    }

    let id = new_id();
    let created_at = now_iso();
    conn.execute(
        "INSERT INTO companies (id, name, tax_no, phone, email, contact_person, balance, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7)",
        rusqlite::params![id, name, tax_no, phone, email, contact_person, created_at],
    )
    .map_err(|e| e.to_string())?;

    Ok(Company {
        id,
        name,
        tax_no,
        phone,
        email,
        contact_person,
        balance: 0.0,
        created_at,
    })
}

#[tauri::command]
pub fn update_company(
    pool: State<DbPool>,
    id: String,
    name: String,
    tax_no: Option<String>,
    phone: Option<String>,
    email: Option<String>,
    contact_person: Option<String>,
) -> Result<(), String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE companies SET name = ?1, tax_no = ?2, phone = ?3, email = ?4, contact_person = ?5 WHERE id = ?6",
        rusqlite::params![name, tax_no, phone, email, contact_person, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn list_companies(pool: State<DbPool>) -> Result<Vec<Company>, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, tax_no, phone, email, contact_person, balance, created_at FROM companies ORDER BY name ASC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(Company {
                id: row.get(0)?,
                name: row.get(1)?,
                tax_no: row.get(2)?,
                phone: row.get(3)?,
                email: row.get(4)?,
                contact_person: row.get(5)?,
                balance: row.get(6)?,
                created_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_company(pool: State<DbPool>, id: String) -> Result<Company, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT id, name, tax_no, phone, email, contact_person, balance, created_at FROM companies WHERE id = ?1",
        rusqlite::params![id],
        |row| {
            Ok(Company {
                id: row.get(0)?,
                name: row.get(1)?,
                tax_no: row.get(2)?,
                phone: row.get(3)?,
                email: row.get(4)?,
                contact_person: row.get(5)?,
                balance: row.get(6)?,
                created_at: row.get(7)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_company(pool: State<DbPool>, id: String) -> Result<(), String> {
    let mut conn = pool.get_conn().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // Cascade: move all ledger entries of this company into recycle bin individually first.
    let ledger_ids: Vec<String> = {
        let mut stmt = tx
            .prepare("SELECT id FROM ledger_entries WHERE company_id = ?1")
            .map_err(|e| e.to_string())?;
        let ids = stmt
            .query_map(rusqlite::params![id], |row| row.get::<_, String>(0))
            .map_err(|e| e.to_string())?;
        ids.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?
    };

    for lid in ledger_ids {
        soft_delete(&tx, "ledger_entries", "ledger_entry", &lid)?;
    }

    soft_delete(&tx, "companies", "company", &id)?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}
