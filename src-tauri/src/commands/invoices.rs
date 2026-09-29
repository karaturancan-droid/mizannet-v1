#![allow(unused)]
use crate::db::DbPool;
use crate::helpers::{new_id, now_iso};
use crate::models::Invoice;
use tauri::{Manager, State};
use base64::Engine;

const INVOICE_COLS: &str = "id, company_id, invoice_no, date, subtotal, vat_amount, total, iban, raw_data, status, file_path, created_at, branch_id";

fn map_invoice_row(row: &rusqlite::Row) -> rusqlite::Result<Invoice> {
    Ok(Invoice {
        id: row.get(0)?,
        company_id: row.get(1)?,
        invoice_no: row.get(2)?,
        date: row.get(3)?,
        subtotal: row.get(4)?,
        vat_amount: row.get(5)?,
        total: row.get(6)?,
        iban: row.get(7)?,
        raw_data: row.get(8)?,
        status: row.get(9)?,
        file_path: row.get(10)?,
        created_at: row.get(11)?,
        branch_id: row.get(12).unwrap_or(None),
    })
}

#[tauri::command]
pub fn create_invoice(
    pool: State<DbPool>,
    company_id: Option<String>,
    invoice_no: Option<String>,
    date: Option<String>,
    subtotal: Option<f64>,
    vat_amount: Option<f64>,
    total: Option<f64>,
    iban: Option<String>,
    raw_data: Option<String>,
    file_path: Option<String>,
    branch_id: Option<String>,
) -> Result<Invoice, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let id = new_id();
    let created_at = now_iso();
    let status = "taslak".to_string();
    let bid = branch_id.unwrap_or_else(|| "default_branch".to_string());
    
    conn.execute(
        "INSERT INTO invoices (id, company_id, invoice_no, date, subtotal, vat_amount, total, iban, raw_data, status, file_path, created_at, branch_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
        rusqlite::params![id, company_id, invoice_no, date, subtotal, vat_amount, total, iban, raw_data, status, file_path, created_at, bid],
    )
    .map_err(|e| e.to_string())?;

    Ok(Invoice {
        id,
        company_id,
        invoice_no,
        date,
        subtotal,
        vat_amount,
        total,
        iban,
        raw_data,
        status,
        file_path,
        created_at,
        branch_id: Some(bid),
    })
}

#[tauri::command]
pub fn upload_and_extract_invoice(
    app: tauri::AppHandle,
    pool: State<DbPool>,
    file_data: String,
    file_name: String,
    file_type: String,
) -> Result<Invoice, String> {
    // 1. Analyze the file using the existing file_analysis logic
    // We fetch a new State using app handle to pass to analyze_file, or just call the AI functions directly.
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(&file_data)
        .map_err(|e| format!("Dosya verisi çözülemedi: {}", e))?;
    
    // For simplicity, we'll just use the ai directly since we know it's an invoice.
    let analysis_prompt = "Aşağıdaki belge/görsel bir faturadır. \
        Biz bu faturaların işlendiği sistemin sahibiyiz. \
        Eğer faturayı biz kesmişsek bu bir Satış Faturasıdır (Cari Alacak/Gelir), bize kesilmişse Alış Faturasıdır (Borç/Gider). \
        Lütfen belgeyi analiz et ve faturanın hangi modüle ait olabileceğini tahmin et (örneğin: 'cari', 'arac', 'depo', 'vergi', 'isci'). \
        Faturanın tipini belirle: biz kestiysek 'sales' (satış), bize kesildiyse 'purchase' (alış). \
        Ayrıca faturadaki karşı firma/kişi adını (company_name), fatura numarasını, tarihini (YYYY-MM-DD), açıklamasını ve tutarını çıkar. \
        Faturada satın alınan ürünler/hizmetler varsa, bunları da 'items' dizisi içinde çıkar (örneğin: [{'name': '...', 'quantity': 10.0, 'unit': 'kg', 'unit_price': 50.0}]). \
        SADECE şu formatta geçerli JSON döndür: \
        {\"module\": \"cari\", \"type\": \"sales\", \"company_name\": \"...\", \"invoice_no\": \"...\", \"date\": \"...\", \"subtotal\": 100.0, \"vat_amount\": 20.0, \"total\": 120.0, \"iban\": \"...\", \"description\": \"...\", \"items\": [{\"name\": \"...\", \"quantity\": 1.0, \"unit\": \"adet\", \"unit_price\": 10.0}]}. \
        Eğer bir değer yoksa null bırak. Başka hiçbir metin yazma.";

    let mime = if file_name.to_lowercase().ends_with(".pdf") {
        "application/pdf"
    } else if file_name.to_lowercase().ends_with(".png") {
        "image/png"
    } else if file_name.to_lowercase().ends_with(".jpg") || file_name.to_lowercase().ends_with(".jpeg") {
        "image/jpeg"
    } else {
        "application/octet-stream"
    };

    let extracted = if mime.starts_with("image/") {
        crate::ai::ai_chat_with_image(&pool, analysis_prompt, &file_data, mime)?
    } else {
        // Fallback to text extraction if PDF (we use file_analysis internal logic, but we can't easily access its private functions. Let's just use the public analyze_file command since it's already robust!)
        // Wait, analyze_file takes State<DbPool>. We can just get it from app_handle!
        let pool_state = app.state::<DbPool>();
        let res = crate::commands::file_analysis::analyze_file(pool_state, file_data, file_name)?;
        // Fake a JSON string that we can parse below
        let first = res.items.into_iter().next().unwrap_or_default();
        serde_json::to_string(&first).unwrap_or_else(|_| "{}".to_string())
    };

    // Ayıkla
    let json_str = {
        let trimmed = extracted.trim();
        if let Some(start) = trimmed.find('{') {
            if let Some(end) = trimmed.rfind('}') {
                if end > start {
                    trimmed[start..=end].to_string()
                } else { trimmed.to_string() }
            } else { trimmed.to_string() }
        } else { trimmed.to_string() }
    };

    let parsed: serde_json::Value = serde_json::from_str(&json_str).unwrap_or_default();

    let id = new_id();
    let created_at = now_iso();
    let status = "taslak".to_string();

    let invoice_no = parsed.get("invoice_no").or_else(|| parsed.get("fatura_no")).and_then(|v| v.as_str()).map(|s| s.to_string());
    let date = parsed.get("date").or_else(|| parsed.get("tarih")).and_then(|v| v.as_str()).map(|s| s.to_string());
    let subtotal = parsed.get("subtotal").and_then(|v| v.as_f64());
    let vat_amount = parsed.get("vat_amount").and_then(|v| v.as_f64());
    let total = parsed.get("total").and_then(|v| v.as_f64());
    let iban = parsed.get("iban").and_then(|v| v.as_str()).map(|s| s.to_string());
    let mut company_id = parsed.get("company_id").and_then(|v| v.as_str()).map(|s| s.to_string());
    
    let raw_data = serde_json::to_string(&parsed).unwrap_or_default();

    let conn = pool.get_conn().map_err(|e| e.to_string())?;

    // AI'dan company_name geldiyse ve company_id yoksa
    if company_id.is_none() {
        if let Some(c_name) = parsed.get("company_name").and_then(|v| v.as_str()) {
            let existing_id: Result<String, _> = conn.query_row(
                "SELECT id FROM companies WHERE name LIKE ?1 LIMIT 1",
                rusqlite::params![format!("%{}%", c_name)],
                |row| row.get(0),
            );
            
            match existing_id {
                Ok(id) => {
                    company_id = Some(id);
                }
                Err(_) => {
                    // Create a new company
                    let new_c_id = new_id();
                    let _ = conn.execute(
                        "INSERT INTO companies (id, name, type, balance, created_at) VALUES (?1, ?2, 'müşteri', 0, ?3)",
                        rusqlite::params![new_c_id, c_name, created_at],
                    );
                    company_id = Some(new_c_id);
                }
            }
        }
    }

    let bid = "default_branch".to_string(); // Fallback for uploaded invoices unless explicitly sent later
    conn.execute(
        "INSERT INTO invoices (id, company_id, invoice_no, date, subtotal, vat_amount, total, iban, raw_data, status, created_at, branch_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        rusqlite::params![id, company_id, invoice_no, date, subtotal, vat_amount, total, iban, raw_data, status, created_at, bid],
    )
    .map_err(|e| e.to_string())?;

    Ok(Invoice {
        id,
        company_id,
        invoice_no,
        date,
        subtotal,
        vat_amount,
        total,
        iban,
        raw_data: Some(raw_data),
        status,
        file_path: None,
        created_at,
        branch_id: Some(bid),
    })
}

#[tauri::command]
pub fn update_invoice(
    pool: State<DbPool>,
    id: String,
    company_id: Option<String>,
    invoice_no: Option<String>,
    date: Option<String>,
    subtotal: Option<f64>,
    vat_amount: Option<f64>,
    total: Option<f64>,
    iban: Option<String>,
    raw_data: Option<String>,
    file_path: Option<String>,
    branch_id: Option<String>,
) -> Result<(), String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    
    if let Some(bid) = branch_id {
        conn.execute(
            "UPDATE invoices SET company_id=?1, invoice_no=?2, date=?3, subtotal=?4, vat_amount=?5, total=?6, iban=?7, raw_data=?8, file_path=?9, branch_id=?10 WHERE id=?11",
            rusqlite::params![company_id, invoice_no, date, subtotal, vat_amount, total, iban, raw_data, file_path, bid, id],
        )
        .map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "UPDATE invoices SET company_id=?1, invoice_no=?2, date=?3, subtotal=?4, vat_amount=?5, total=?6, iban=?7, raw_data=?8, file_path=?9 WHERE id=?10",
            rusqlite::params![company_id, invoice_no, date, subtotal, vat_amount, total, iban, raw_data, file_path, id],
        )
        .map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

#[tauri::command]
pub fn list_invoices(pool: State<DbPool>, branch_id: Option<String>) -> Result<Vec<Invoice>, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let mut sql = format!("SELECT {} FROM invoices", INVOICE_COLS);
    if let Some(ref bid) = branch_id {
        sql.push_str(&format!(" WHERE branch_id = '{}'", bid));
    }
    sql.push_str(" ORDER BY created_at DESC");

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let mapped = stmt.query_map([], map_invoice_row).map_err(|e| e.to_string())?;
    mapped.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_invoice(pool: State<DbPool>, id: String) -> Result<Invoice, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let sql = format!("SELECT {} FROM invoices WHERE id = ?1", INVOICE_COLS);
    conn.query_row(&sql, rusqlite::params![id], map_invoice_row)
        .map_err(|e| e.to_string())
}

/// Approves a draft invoice. If it has company_id + invoice_no + total, also
/// creates a ledger_entry for that company. This is the ONLY place AI/manually
/// imported invoice data reaches the ledger, and only via this explicit action.
#[tauri::command]
pub fn approve_invoice(pool: State<DbPool>, id: String) -> Result<(), String> {
    let mut conn = pool.get_conn().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let invoice = tx
        .query_row(
            &format!("SELECT {} FROM invoices WHERE id = ?1", INVOICE_COLS),
            rusqlite::params![id],
            map_invoice_row,
        )
        .map_err(|e| e.to_string())?;

    tx.execute(
        "UPDATE invoices SET status = 'onaylandı' WHERE id = ?1",
        rusqlite::params![id],
    )
    .map_err(|e| e.to_string())?;

    if let (Some(company_id), Some(total)) = (invoice.company_id.clone(), invoice.total) {
        let description = match &invoice.invoice_no {
            Some(no) => format!("Fatura #{} onaylandi", no),
            None => "Fatura onaylandi".to_string(),
        };
        let entry_id = new_id();
        let created_at = now_iso();
        let date = invoice.date.clone().unwrap_or_else(|| created_at.clone());

        let parsed_data: serde_json::Value = invoice.raw_data.as_ref()
            .and_then(|s| serde_json::from_str(s).ok())
            .unwrap_or_default();
            
        let f_type = parsed_data.get("type").and_then(|v| v.as_str()).unwrap_or("purchase");
        let (debit, credit) = if f_type == "sales" {
            (total, 0.0)
        } else {
            (0.0, total)
        };

        tx.execute(
            "INSERT INTO ledger_entries (id, company_id, date, document_no, description, debit, credit, running_balance, entry_type, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 0, 'fatura', ?8)",
            rusqlite::params![entry_id, company_id.clone(), date.clone(), invoice.invoice_no.clone(), description, debit, credit, created_at.clone()],
        )
        .map_err(|e| e.to_string())?;

        // Eğer alış faturasıysa ve içindeki ürünler/hizmetler varsa depoya/stoklara ekle
        if f_type == "purchase" {
            if let Some(items) = parsed_data.get("items").and_then(|v| v.as_array()) {
                for item in items {
                    if let Some(p_name) = item.get("name").and_then(|v| v.as_str()) {
                        let qty = item.get("quantity").and_then(|v| v.as_f64()).unwrap_or(1.0);
                        let unit = item.get("unit").and_then(|v| v.as_str()).unwrap_or("adet");
                        let price = item.get("unit_price").and_then(|v| v.as_f64()).unwrap_or(0.0);

                        // Ürünü adına göre bul, yoksa oluştur
                        let p_id_res: Result<String, _> = tx.query_row(
                            "SELECT id FROM products WHERE name LIKE ?1 LIMIT 1",
                            rusqlite::params![format!("%{}%", p_name)],
                            |r| r.get(0),
                        );

                        let p_id = match p_id_res {
                            Ok(id) => id,
                            Err(_) => {
                                let new_p_id = new_id();
                                let _ = tx.execute(
                                    "INSERT INTO products (id, name, sku, category, unit, purchase_price, sale_price, min_stock, current_stock, supplier, created_at) VALUES (?1, ?2, '', 'Genel', ?3, ?4, ?4, 0, 0, ?5, ?6)",
                                    rusqlite::params![new_p_id, p_name, unit, price, company_id.clone(), created_at.clone()]
                                );
                                new_p_id
                            }
                        };

                        // Stok hareketi (giriş) oluştur
                        let sm_id = new_id();
                        let _ = tx.execute(
                            "INSERT INTO stock_movements (id, product_id, date, type, quantity, unit_price, document_no, description, created_at) VALUES (?1, ?2, ?3, 'giriş', ?4, ?5, ?6, 'Fatura Otomatik Aktarım', ?7)",
                            rusqlite::params![sm_id, p_id, date.clone(), qty, price, invoice.invoice_no.clone(), created_at.clone()]
                        );

                        // Ürün güncel stoğunu güncelle
                        let _ = tx.execute(
                            "UPDATE products SET current_stock = current_stock + ?1 WHERE id = ?2",
                            rusqlite::params![qty, p_id]
                        );
                    }
                }
            }
        }

        // Recompute running balances for this company inline (avoid cross-module import cycle).
        let mut stmt = tx
            .prepare("SELECT id, debit, credit FROM ledger_entries WHERE company_id = ?1 ORDER BY date ASC, created_at ASC")
            .map_err(|e| e.to_string())?;
        let rows: Vec<(String, f64, f64)> = stmt
            .query_map(rusqlite::params![company_id], |row| {
                Ok((row.get(0)?, row.get(1)?, row.get(2)?))
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        drop(stmt);

        let mut running = 0.0f64;
        for (eid, debit, credit) in &rows {
            running += debit - credit;
            tx.execute(
                "UPDATE ledger_entries SET running_balance = ?1 WHERE id = ?2",
                rusqlite::params![running, eid],
            )
            .map_err(|e| e.to_string())?;
        }
        tx.execute(
            "UPDATE companies SET balance = ?1 WHERE id = ?2",
            rusqlite::params![running, company_id],
        )
        .map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn reject_invoice(pool: State<DbPool>, id: String) -> Result<(), String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE invoices SET status = 'reddedildi' WHERE id = ?1",
        rusqlite::params![id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn check_import_hash(pool: State<DbPool>, hash: String) -> Result<bool, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM import_hashes WHERE file_hash = ?1",
            rusqlite::params![hash],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    Ok(count > 0)
}

#[tauri::command]
pub fn record_import_hash(pool: State<DbPool>, hash: String, file_name: Option<String>) -> Result<(), String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let id = new_id();
    let imported_at = now_iso();
    conn.execute(
        "INSERT INTO import_hashes (id, file_hash, file_name, imported_at) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![id, hash, file_name, imported_at],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
