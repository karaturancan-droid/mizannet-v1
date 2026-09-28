//! AI fiş/gider OCR — makbuz, benzinlik fişi, yemek fişi vb. belgeleri
//! fotoğraftan okur ve gider kaydı olarak ledger_entries'e işler.
//!
//! Akış:
//!   1. analyze_receipt  → görsel/PDF + AI ile alan çıkarımı (JSON)
//!   2. save_receipt     → expenses tablosuna kaydet (ledger_entries'e gider kaydı)
//!   3. list_expenses / delete_expense → gider defteri

use crate::ai::ai_chat_with_image;
use crate::db::DbPool;
use crate::helpers::{new_id, now_iso};
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Expense {
    pub id: String,
    pub date: String,
    pub vendor: Option<String>,
    pub category: Option<String>,
    pub amount: f64,
    pub vat_amount: Option<f64>,
    pub payment_method: Option<String>,
    pub description: Option<String>,
    pub file_path: Option<String>,
    pub source: String, // "ocr" | "manuel"
    pub created_at: String,
    pub branch_id: Option<String>,
}

const RECEIPT_PROMPT: &str = "Aşağıdaki belge bir makbuz/fiş/gider pusulasıdır. \
Aşağıdaki alanları çıkar ve SADECE şu formatta geçerli JSON döndür: \
{\"vendor\": \"satıcı/firma adı\", \"date\": \"YYYY-MM-DD\", \"amount\": 0.0, \
\"vat_amount\": 0.0, \"payment_method\": \"nakit|kredi kartı|banka|çek\", \
\"category\": \"akaryakıt|yemek|malzeme|bakım|telefon|kira|diğer\", \
\"description\": \"kısa açıklama\"}. \
Bir alan okunamıyorsa veya yoksa null bırak. Tutarı Türk lirası cinsinden sayı olarak ver. \
Başka hiçbir metin yazma.";

fn extract_json(text: &str) -> serde_json::Value {
    let trimmed = text.trim();
    if let Some(start) = trimmed.find('{') {
        if let Some(end) = trimmed.rfind('}') {
            if end > start {
                if let Ok(v) = serde_json::from_str::<serde_json::Value>(&trimmed[start..=end]) {
                    return v;
                }
            }
        }
    }
    serde_json::Value::Null
}

fn ensure_expenses_table(conn: &rusqlite::Connection) -> Result<(), String> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS expenses (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            vendor TEXT,
            category TEXT,
            amount REAL NOT NULL DEFAULT 0,
            vat_amount REAL,
            payment_method TEXT,
            description TEXT,
            file_path TEXT,
            source TEXT NOT NULL DEFAULT 'manuel',
            created_at TEXT NOT NULL,
            branch_id TEXT DEFAULT 'default_branch'
        );
        CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
        "#,
    )
    .map_err(|e| e.to_string())
}

fn map_expense_row(row: &rusqlite::Row) -> rusqlite::Result<Expense> {
    Ok(Expense {
        id: row.get(0)?,
        date: row.get(1)?,
        vendor: row.get(2)?,
        category: row.get(3)?,
        amount: row.get(4)?,
        vat_amount: row.get(5)?,
        payment_method: row.get(6)?,
        description: row.get(7)?,
        file_path: row.get(8)?,
        source: row.get(9)?,
        created_at: row.get(10)?,
        branch_id: row.get(11)?,
    })
}

/// Görsel/PDF fişi AI ile analiz eder; kaydetmez, önizleme döner.
#[tauri::command]
pub fn analyze_receipt(
    pool: State<DbPool>,
    file_data: String, // base64
    file_name: String,
) -> Result<serde_json::Value, String> {
    let mime = if file_name.to_lowercase().ends_with(".pdf") {
        "application/pdf"
    } else if file_name.to_lowercase().ends_with(".png") {
        "image/png"
    } else {
        "image/jpeg"
    };

    let raw = ai_chat_with_image(&pool, RECEIPT_PROMPT, &file_data, mime)?;

    let parsed = extract_json(&raw);
    if parsed.is_null() {
        return Err("Fiş okunamadı. Daha net bir fotoğraf deneyin.".to_string());
    }
    Ok(parsed)
}

/// Analiz sonucunu (veya manuel girilen) gider olarak kaydeder ve ledger'a işler.
#[tauri::command]
pub fn save_expense(
    pool: State<DbPool>,
    date: String,
    vendor: Option<String>,
    category: Option<String>,
    amount: f64,
    vat_amount: Option<f64>,
    payment_method: Option<String>,
    description: Option<String>,
    file_path: Option<String>,
    source: Option<String>,
    branch_id: Option<String>,
) -> Result<Expense, String> {
    if amount <= 0.0 {
        return Err("Tutar 0'dan büyük olmalı.".to_string());
    }
    if date.trim().is_empty() {
        return Err("Tarih zorunlu.".to_string());
    }

    let mut conn = pool.get_conn().map_err(|e| e.to_string())?;
    ensure_expenses_table(&conn)?;

    let id = new_id();
    let created_at = now_iso();
    let bid = branch_id.unwrap_or_else(|| "default_branch".to_string());
    let src = source.unwrap_or_else(|| "manuel".to_string());

    // Varsayılan gider kategorisi (hesap planı 770'e karşılık)
    let desc = description.clone().unwrap_or_else(|| {
        format!(
            "Gider — {} ({})",
            category.clone().unwrap_or_else(|| "diğer".into()),
            vendor.clone().unwrap_or_else(|| "bilinmiyor".into())
        )
    });

    let tx = conn.transaction().map_err(|e| e.to_string())?;
    tx.execute(
        "INSERT INTO expenses (id, date, vendor, category, amount, vat_amount, payment_method, description, file_path, source, created_at, branch_id) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        rusqlite::params![id, date, vendor, category, amount, vat_amount, payment_method, description, file_path, src, created_at, bid],
    )
    .map_err(|e| e.to_string())?;

    // Gideri ledger'a "gider" türünde işle (credit tarafı)
    let ledger_id = new_id();
    tx.execute(
        "INSERT INTO ledger_entries (id, company_id, date, document_no, description, debit, credit, running_balance, entry_type, created_at, branch_id) \
         VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, 0, 'gider', ?7, ?8)",
        rusqlite::params![ledger_id, "gider_hesabi", date, id, desc, amount, created_at, bid],
    )
    .map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())?;

    Ok(Expense {
        id,
        date,
        vendor,
        category,
        amount,
        vat_amount,
        payment_method,
        description: Some(desc),
        file_path,
        source: src,
        created_at,
        branch_id: Some(bid),
    })
}

#[tauri::command]
pub fn list_expenses(pool: State<DbPool>, branch_id: Option<String>) -> Result<Vec<Expense>, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    ensure_expenses_table(&conn)?;

    let bid = branch_id.unwrap_or_else(|| "default_branch".to_string());
    let mut stmt = conn
        .prepare(
            "SELECT id, date, vendor, category, amount, vat_amount, payment_method, description, file_path, source, created_at, branch_id \
             FROM expenses WHERE branch_id = ?1 ORDER BY date DESC, created_at DESC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(rusqlite::params![bid], map_expense_row)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn delete_expense(pool: State<DbPool>, id: String) -> Result<(), String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    ensure_expenses_table(&conn)?;
    conn.execute("DELETE FROM expenses WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    // İlgili ledger kaydını da temizle
    conn.execute(
        "DELETE FROM ledger_entries WHERE document_no = ?1 AND entry_type = 'gider'",
        rusqlite::params![id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

/// Kategori bazlı gider özeti (dashboard/ajanda için).
#[tauri::command]
pub fn get_expense_summary(pool: State<DbPool>, branch_id: Option<String>) -> Result<serde_json::Value, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    ensure_expenses_table(&conn)?;

    let bid = branch_id.unwrap_or_else(|| "default_branch".to_string());
    let mut stmt = conn
        .prepare(
            "SELECT COALESCE(category, 'diğer'), SUM(amount) FROM expenses WHERE branch_id = ?1 GROUP BY 1 ORDER BY 2 DESC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(rusqlite::params![bid], |row| {
            Ok(serde_json::json!({
                "category": row.get::<_, String>(0)?,
                "total": row.get::<_, f64>(1)?,
            }))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(serde_json::Value::Array(rows))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_json_valid() {
        let v = extract_json(r#"Önsöz {"vendor": "Petrol Ofisi", "amount": 1250.5} Kuyruk"#);
        assert_eq!(v["vendor"], "Petrol Ofisi");
        assert_eq!(v["amount"], 1250.5);
    }

    #[test]
    fn test_extract_json_invalid() {
        assert!(extract_json("JSON yok").is_null());
    }
}
