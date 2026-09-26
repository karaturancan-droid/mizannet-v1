use crate::db::DbPool;
use crate::helpers::{new_id, now_iso, soft_delete};
use crate::models::{Tire, Vehicle, VehicleExpense, VehicleExpenseByType, VehicleExpenseSummary};
use tauri::State;

fn map_vehicle_row(row: &rusqlite::Row) -> rusqlite::Result<Vehicle> {
    Ok(Vehicle {
        id: row.get(0)?,
        plate: row.get(1)?,
        brand: row.get(2)?,
        model: row.get(3)?,
        year: row.get(4)?,
        status: row.get(5)?,
        km: row.get(6)?,
        inspection_due_date: row.get(7)?,
        insurance_due_date: row.get(8)?,
        created_at: row.get(9)?,
        category: row.get(10).unwrap_or(None),
        branch_id: row.get(11).unwrap_or(None),
    })
}

const VEHICLE_COLS: &str = "id, plate, brand, model, year, status, km, inspection_due_date, insurance_due_date, created_at, category, branch_id";

#[tauri::command]
pub fn create_vehicle(
    pool: State<DbPool>,
    plate: String,
    brand: Option<String>,
    model: Option<String>,
    year: Option<i64>,
    status: Option<String>,
    km: Option<f64>,
    inspection_due_date: Option<String>,
    insurance_due_date: Option<String>,
    category: Option<String>,
    branch_id: Option<String>,
) -> Result<Vehicle, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let id = new_id();
    let created_at = now_iso();
    let bid = branch_id.unwrap_or_else(|| "default_branch".to_string());
    
    conn.execute(
        "INSERT INTO vehicles (id, plate, brand, model, year, status, km, inspection_due_date, insurance_due_date, created_at, category, branch_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        rusqlite::params![id, plate, brand, model, year, status, km, inspection_due_date, insurance_due_date, created_at, category, bid],
    )
    .map_err(|e| e.to_string())?;

    Ok(Vehicle {
        id,
        plate,
        brand,
        model,
        year,
        status,
        km,
        inspection_due_date,
        insurance_due_date,
        created_at,
        category,
        branch_id: Some(bid),
    })
}

#[tauri::command]
pub fn update_vehicle(
    pool: State<DbPool>,
    id: String,
    plate: String,
    brand: Option<String>,
    model: Option<String>,
    year: Option<i64>,
    status: Option<String>,
    km: Option<f64>,
    inspection_due_date: Option<String>,
    insurance_due_date: Option<String>,
    category: Option<String>,
    branch_id: Option<String>,
) -> Result<(), String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    if let Some(bid) = branch_id {
        conn.execute(
            "UPDATE vehicles SET plate=?1, brand=?2, model=?3, year=?4, status=?5, km=?6, inspection_due_date=?7, insurance_due_date=?8, category=?9, branch_id=?10 WHERE id=?11",
            rusqlite::params![plate, brand, model, year, status, km, inspection_due_date, insurance_due_date, category, bid, id],
        )
        .map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "UPDATE vehicles SET plate=?1, brand=?2, model=?3, year=?4, status=?5, km=?6, inspection_due_date=?7, insurance_due_date=?8, category=?9 WHERE id=?10",
            rusqlite::params![plate, brand, model, year, status, km, inspection_due_date, insurance_due_date, category, id],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn list_vehicles(pool: State<DbPool>, branch_id: Option<String>) -> Result<Vec<Vehicle>, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let mut sql = format!("SELECT {} FROM vehicles", VEHICLE_COLS);
    if let Some(ref bid) = branch_id {
        sql.push_str(&format!(" WHERE branch_id = '{}'", bid));
    }
    sql.push_str(" ORDER BY plate ASC");

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let mapped = stmt.query_map([], map_vehicle_row).map_err(|e| e.to_string())?;
    mapped.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_vehicle(pool: State<DbPool>, id: String) -> Result<(), String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    soft_delete(&conn, "vehicles", "vehicle", &id)
}

#[tauri::command]
pub fn create_vehicle_expense(
    pool: State<DbPool>,
    vehicle_id: String,
    r#type: Option<String>,
    amount: f64,
    date: String,
    note: Option<String>,
) -> Result<VehicleExpense, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let id = new_id();
    let created_at = now_iso();
    conn.execute(
        "INSERT INTO vehicle_expenses (id, vehicle_id, type, amount, date, note, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![id, vehicle_id, r#type, amount, date, note, created_at],
    )
    .map_err(|e| e.to_string())?;

    Ok(VehicleExpense {
        id,
        vehicle_id,
        expense_type: r#type,
        amount,
        date,
        note,
        created_at,
    })
}

#[tauri::command]
pub fn list_vehicle_expenses(pool: State<DbPool>, vehicle_id: String) -> Result<Vec<VehicleExpense>, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, vehicle_id, type, amount, date, note, created_at FROM vehicle_expenses WHERE vehicle_id = ?1 ORDER BY date DESC")
        .map_err(|e| e.to_string())?;
    let mapped = stmt
        .query_map(rusqlite::params![vehicle_id], |row| {
            Ok(VehicleExpense {
                id: row.get(0)?,
                vehicle_id: row.get(1)?,
                expense_type: row.get(2)?,
                amount: row.get(3)?,
                date: row.get(4)?,
                note: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;
    mapped.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_vehicle_expense_summary(pool: State<DbPool>, vehicle_id: String) -> Result<VehicleExpenseSummary, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT COALESCE(type, 'diger'), SUM(amount) FROM vehicle_expenses WHERE vehicle_id = ?1 GROUP BY type")
        .map_err(|e| e.to_string())?;
    let by_type = stmt
        .query_map(rusqlite::params![vehicle_id], |row| {
            Ok(VehicleExpenseByType {
                expense_type: row.get(0)?,
                total: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let grand_total: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM vehicle_expenses WHERE vehicle_id = ?1",
            rusqlite::params![vehicle_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    Ok(VehicleExpenseSummary { by_type, grand_total })
}

#[tauri::command]
pub fn create_tire(
    pool: State<DbPool>,
    vehicle_id: String,
    position: Option<String>,
    dot_code: Option<String>,
    tread_depth: Option<f64>,
    change_date: Option<String>,
) -> Result<Tire, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let id = new_id();
    let created_at = now_iso();
    conn.execute(
        "INSERT INTO tires (id, vehicle_id, position, dot_code, tread_depth, change_date, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![id, vehicle_id, position, dot_code, tread_depth, change_date, created_at],
    )
    .map_err(|e| e.to_string())?;

    Ok(Tire {
        id,
        vehicle_id,
        position,
        dot_code,
        tread_depth,
        change_date,
        created_at,
    })
}

#[tauri::command]
pub fn list_tires(pool: State<DbPool>, vehicle_id: String) -> Result<Vec<Tire>, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, vehicle_id, position, dot_code, tread_depth, change_date, created_at FROM tires WHERE vehicle_id = ?1")
        .map_err(|e| e.to_string())?;
    let mapped = stmt
        .query_map(rusqlite::params![vehicle_id], |row| {
            Ok(Tire {
                id: row.get(0)?,
                vehicle_id: row.get(1)?,
                position: row.get(2)?,
                dot_code: row.get(3)?,
                tread_depth: row.get(4)?,
                change_date: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;
    mapped.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}
