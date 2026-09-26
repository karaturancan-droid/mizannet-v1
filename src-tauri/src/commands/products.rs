use crate::db::DbPool;
use crate::helpers::{new_id, now_iso, soft_delete};
use crate::models::{Product, StockMovement, StockSummary};
use tauri::State;

fn map_product_row(row: &rusqlite::Row) -> rusqlite::Result<Product> {
    Ok(Product {
        id: row.get(0)?,
        name: row.get(1)?,
        sku: row.get(2)?,
        category: row.get(3)?,
        unit: row.get(4)?,
        purchase_price: row.get(5)?,
        sale_price: row.get(6)?,
        min_stock: row.get(7)?,
        current_stock: row.get(8)?,
        supplier: row.get(9)?,
        image_path: row.get(10)?,
        created_at: row.get(11)?,
        branch_id: row.get(12).unwrap_or(None),
    })
}

const PRODUCT_COLS: &str = "id, name, sku, category, unit, purchase_price, sale_price, min_stock, current_stock, supplier, image_path, created_at, branch_id";

#[tauri::command]
pub fn create_product(
    pool: State<DbPool>,
    name: String,
    sku: Option<String>,
    category: Option<String>,
    unit: Option<String>,
    purchase_price: f64,
    sale_price: f64,
    min_stock: f64,
    supplier: Option<String>,
    image_path: Option<String>,
    branch_id: Option<String>,
) -> Result<Product, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let id = new_id();
    let created_at = now_iso();
    let bid = branch_id.unwrap_or_else(|| "default_branch".to_string());

    conn.execute(
        "INSERT INTO products (id, name, sku, category, unit, purchase_price, sale_price, min_stock, current_stock, supplier, image_path, created_at, branch_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 0, ?9, ?10, ?11, ?12)",
        rusqlite::params![id, name, sku, category, unit, purchase_price, sale_price, min_stock, supplier, image_path, created_at, bid],
    )
    .map_err(|e| e.to_string())?;

    Ok(Product {
        id,
        name,
        sku,
        category,
        unit,
        purchase_price,
        sale_price,
        min_stock,
        current_stock: 0.0,
        supplier,
        image_path,
        created_at,
        branch_id: Some(bid),
    })
}

#[tauri::command]
pub fn update_product(
    pool: State<DbPool>,
    id: String,
    name: String,
    sku: Option<String>,
    category: Option<String>,
    unit: Option<String>,
    purchase_price: f64,
    sale_price: f64,
    min_stock: f64,
    supplier: Option<String>,
    image_path: Option<String>,
    branch_id: Option<String>,
) -> Result<(), String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    
    if let Some(bid) = branch_id {
        conn.execute(
            "UPDATE products SET name=?1, sku=?2, category=?3, unit=?4, purchase_price=?5, sale_price=?6, min_stock=?7, supplier=?8, image_path=?9, branch_id=?10 WHERE id=?11",
            rusqlite::params![name, sku, category, unit, purchase_price, sale_price, min_stock, supplier, image_path, bid, id],
        )
        .map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "UPDATE products SET name=?1, sku=?2, category=?3, unit=?4, purchase_price=?5, sale_price=?6, min_stock=?7, supplier=?8, image_path=?9 WHERE id=?10",
            rusqlite::params![name, sku, category, unit, purchase_price, sale_price, min_stock, supplier, image_path, id],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn list_products(pool: State<DbPool>, branch_id: Option<String>) -> Result<Vec<Product>, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let mut sql = format!("SELECT {} FROM products", PRODUCT_COLS);
    if let Some(ref bid) = branch_id {
        sql.push_str(&format!(" WHERE branch_id = '{}'", bid));
    }
    sql.push_str(" ORDER BY name ASC");

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let mapped = stmt.query_map([], map_product_row).map_err(|e| e.to_string())?;
    mapped.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_product(pool: State<DbPool>, id: String) -> Result<(), String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    soft_delete(&conn, "products", "product", &id)
}

#[tauri::command]
pub fn create_stock_movement(
    pool: State<DbPool>,
    product_id: String,
    r#type: String,
    quantity: f64,
    date: String,
    note: Option<String>,
    branch_id: Option<String>,
) -> Result<StockMovement, String> {
    let mut conn = pool.get_conn().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let id = new_id();
    let created_at = now_iso();
    let bid = branch_id.unwrap_or_else(|| "default_branch".to_string());
    
    tx.execute(
        "INSERT INTO stock_movements (id, product_id, type, quantity, date, note, created_at, branch_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![id, product_id, r#type, quantity, date, note, created_at, bid],
    )
    .map_err(|e| e.to_string())?;

    let delta = if r#type == "giriş" || r#type == "giris" { quantity } else { -quantity };
    tx.execute(
        "UPDATE products SET current_stock = current_stock + ?1 WHERE id = ?2",
        rusqlite::params![delta, product_id],
    )
    .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;

    Ok(StockMovement {
        id,
        product_id,
        movement_type: r#type,
        quantity,
        date,
        note,
        created_at,
        branch_id: Some(bid),
    })
}

#[tauri::command]
pub fn list_stock_movements(
    pool: State<DbPool>,
    product_id: Option<String>,
    branch_id: Option<String>,
) -> Result<Vec<StockMovement>, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let map_row = |row: &rusqlite::Row| -> rusqlite::Result<StockMovement> {
        Ok(StockMovement {
            id: row.get(0)?,
            product_id: row.get(1)?,
            movement_type: row.get(2)?,
            quantity: row.get(3)?,
            date: row.get(4)?,
            note: row.get(5)?,
            created_at: row.get(6)?,
            branch_id: row.get(7).unwrap_or(None),
        })
    };

    let mut sql = "SELECT id, product_id, type, quantity, date, note, created_at, branch_id FROM stock_movements WHERE 1=1".to_string();
    let mut params: Vec<String> = vec![];

    if let Some(pid) = product_id {
        sql.push_str(&format!(" AND product_id = '{}'", pid));
    }
    if let Some(bid) = branch_id {
        sql.push_str(&format!(" AND branch_id = '{}'", bid));
    }

    sql.push_str(" ORDER BY date DESC, created_at DESC");

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let mapped = stmt.query_map([], map_row).map_err(|e| e.to_string())?;
    mapped.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_stock_summary(pool: State<DbPool>, branch_id: Option<String>) -> Result<StockSummary, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    
    let total_stock_value: f64 = if let Some(ref bid) = branch_id {
        conn.query_row(
            &format!("SELECT COALESCE(SUM(current_stock * purchase_price), 0) FROM products WHERE branch_id = '{}'", bid),
            [],
            |row| row.get(0),
        ).unwrap_or(0.0)
    } else {
        conn.query_row(
            "SELECT COALESCE(SUM(current_stock * purchase_price), 0) FROM products",
            [],
            |row| row.get(0),
        ).unwrap_or(0.0)
    };

    let sql = if let Some(ref bid) = branch_id {
        format!("SELECT {} FROM products WHERE current_stock <= min_stock AND branch_id = '{}' ORDER BY name ASC", PRODUCT_COLS, bid)
    } else {
        format!("SELECT {} FROM products WHERE current_stock <= min_stock ORDER BY name ASC", PRODUCT_COLS)
    };
    
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let critical_products = stmt
        .query_map([], map_product_row)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(StockSummary {
        total_stock_value,
        critical_products,
    })
}
