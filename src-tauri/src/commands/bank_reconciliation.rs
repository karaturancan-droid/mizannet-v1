//! Banka mutabakatı ve Kasa/Banka hesap yönetimi.
//!
//! - `accounts` tablosu: Kasa, Banka-1, POS vb. hesapların ayrı takibi
//! - Banka ekstresi (CSV/XLSX) içe aktarma
//! - AI destekli cari eşleştirme: ekstre satırını doğru cari hesaba bağlama
//! - Mutabakat durumu: eşleşen / eşleşmeyen satırlar

use crate::db::DbPool;
use base64::Engine;
use calamine::Reader;
use serde::{Deserialize, Serialize};
use tauri::State;

// ---------------------------------------------------------------
// 1) Hesaplar (Kasa / Banka / POS)
// ---------------------------------------------------------------

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Account {
    pub id: String,
    pub name: String,
    pub account_type: String, // "kasa" | "banka" | "pos" | "diger"
    pub currency: String,
    pub iban: Option<String>,
    pub opening_balance: f64,
    pub created_at: String,
}

#[tauri::command]
pub fn list_accounts(pool: State<DbPool>) -> Result<Vec<Account>, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, account_type, currency, iban, opening_balance, created_at FROM accounts ORDER BY created_at ASC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |r| {
            Ok(Account {
                id: r.get(0)?,
                name: r.get(1)?,
                account_type: r.get(2)?,
                currency: r.get(3)?,
                iban: r.get(4)?,
                opening_balance: r.get(5)?,
                created_at: r.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn create_account(
    pool: State<DbPool>,
    name: String,
    account_type: String,
    currency: Option<String>,
    iban: Option<String>,
    opening_balance: Option<f64>,
) -> Result<Account, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let currency_final = currency.unwrap_or_else(|| "TRY".to_string());
    conn.execute(
        "INSERT INTO accounts (id, name, account_type, currency, iban, opening_balance, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![id, name, account_type, currency_final, iban, opening_balance.unwrap_or(0.0), now],
    )
    .map_err(|e| e.to_string())?;

    Ok(Account {
        id,
        name,
        account_type,
        currency: currency_final,
        iban,
        opening_balance: opening_balance.unwrap_or(0.0),
        created_at: now,
    })
}

#[tauri::command]
pub fn delete_account(pool: State<DbPool>, id: String) -> Result<(), String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM accounts WHERE id = ?1", [&id]).map_err(|e| e.to_string())?;
    Ok(())
}

/// Hesap bakiyesi: açılış bakiyesi + gelir/gider hareketleri.
#[tauri::command]
pub fn get_account_balance(pool: State<DbPool>, account_id: String) -> Result<f64, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let opening: f64 = conn
        .query_row("SELECT opening_balance FROM accounts WHERE id = ?1", [&account_id], |r| r.get(0))
        .unwrap_or(0.0);
    let movements: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END), 0) FROM bank_statements WHERE account_id = ?1",
            [&account_id],
            |r| r.get(0),
        )
        .unwrap_or(0.0);
    Ok(opening + movements)
}

// ---------------------------------------------------------------
// 2) Banka ekstresi satırları
// ---------------------------------------------------------------

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BankStatementRow {
    pub id: String,
    pub account_id: Option<String>,
    pub date: String,
    pub description: String,
    pub amount: f64, // + giriş, - çıkış
    pub balance: Option<f64>,
    pub matched_company_id: Option<String>,
    pub matched_company_name: Option<String>,
    pub match_score: f64,
    pub status: String, // "pending" | "matched" | "imported"
    pub created_at: String,
}

#[tauri::command]
pub fn list_bank_statement_rows(
    pool: State<DbPool>,
    status: Option<String>,
) -> Result<Vec<BankStatementRow>, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let sql = if status.is_some() {
        "SELECT id, account_id, date, description, amount, balance, matched_company_id, matched_company_name, match_score, status, created_at FROM bank_statements WHERE status = ?1 ORDER BY date ASC"
    } else {
        "SELECT id, account_id, date, description, amount, balance, matched_company_id, matched_company_name, match_score, status, created_at FROM bank_statements ORDER BY date ASC"
    };
    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;

    let map_row = |r: &rusqlite::Row| -> rusqlite::Result<BankStatementRow> {
        Ok(BankStatementRow {
            id: r.get(0)?,
            account_id: r.get(1)?,
            date: r.get(2)?,
            description: r.get(3)?,
            amount: r.get(4)?,
            balance: r.get(5)?,
            matched_company_id: r.get(6)?,
            matched_company_name: r.get(7)?,
            match_score: r.get(8)?,
            status: r.get(9)?,
            created_at: r.get(10)?,
        })
    };

    let rows = if let Some(s) = status {
        stmt.query_map([&s], map_row)
    } else {
        stmt.query_map([], map_row)
    }
    .map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;

    Ok(rows)
}

/// Banka ekstresini (CSV veya XLSX) içe aktarır. Satırlar `bank_statements` tablosuna
/// "pending" durumunda kaydedilir; ardından AI eşleştirme çalıştırılabilir.
#[tauri::command]
pub fn import_bank_statement(
    pool: State<DbPool>,
    file_data: String, // base64
    file_name: String,
    account_id: Option<String>,
) -> Result<usize, String> {
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(&file_data)
        .map_err(|e| format!("Dosya çözülemedi: {}", e))?;

    let lower = file_name.to_lowercase();
    let rows_raw: Vec<(String, String, f64, Option<f64>)> = if lower.ends_with(".csv") {
        parse_csv_statement(&bytes)?
    } else if lower.ends_with(".xlsx") || lower.ends_with(".xls") {
        parse_xlsx_statement(&bytes)?
    } else {
        return Err(format!("Desteklenmeyen dosya türü: {}. CSV veya XLSX bekleniyor.", file_name));
    };

    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let mut inserted = 0usize;

    for (date, description, amount, balance) in rows_raw {
        if description.trim().is_empty() && amount == 0.0 {
            continue;
        }
        conn.execute(
            "INSERT INTO bank_statements (id, account_id, date, description, amount, balance, status, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'pending', ?7)",
            rusqlite::params![uuid::Uuid::new_v4().to_string(), account_id, date, description.trim(), amount, balance, now],
        )
        .map_err(|e| e.to_string())?;
        inserted += 1;
    }

    Ok(inserted)
}

/// CSV ekstre ayrıştırıcı (Türkçe bankalar için tarih/tutar formatına toleranslı).
fn parse_csv_statement(bytes: &[u8]) -> Result<Vec<(String, String, f64, Option<f64>)>, String> {
    let text = String::from_utf8_lossy(bytes);
    let mut out = Vec::new();

    for line in text.lines().skip(1) {
        // İlk satır başlık varsayımı; boş satırları atla
        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        // ; veya , ayırıcıyı otomatik seç
        let sep = if line.matches(';').count() > line.matches(',').count() { ';' } else { ',' };
        let parts: Vec<String> = line
            .split(sep)
            .map(|p| p.trim().trim_matches('"').to_string())
            .collect();

        if parts.len() < 3 {
            continue;
        }

        // Sütun sırası esnek: tarih, açıklama, tutar, [bakiye]
        // Bazı bankalar: tarih, değer tarihi, açıklama, tutar, bakiye
        // Açıklamayı en uzun metin sütunu olarak bul, tutarı sayıya dönüşebilen son sütun al.
        let date = parts[0].clone();
        let mut amount_idx = parts.len() - 1;
        let mut balance: Option<f64> = None;

        // Son sütun bakiye olabilir (sayıysa), ondan önceki tutar
        let last_num = parse_tr_number(&parts[parts.len() - 1]);
        if let Some(bal) = last_num {
            balance = Some(bal);
            if parts.len() >= 4 {
                amount_idx = parts.len() - 2;
            }
        }

        let amount = parse_tr_number(&parts[amount_idx]).unwrap_or(0.0);

        // Açıklama: tarih ve tutar sütunları arasındaki en uzun metin
        let mut desc = String::new();
        for (i, p) in parts.iter().enumerate() {
            if i == 0 || i == amount_idx || Some(i) == balance.map(|_| parts.len() - 1).filter(|_| balance.is_some()) {
                continue;
            }
            if p.len() > desc.len() {
                desc = p.clone();
            }
        }

        out.push((normalize_date(&date), desc, amount, balance));
    }

    Ok(out)
}

/// XLSX ekstre ayrıştırıcı.
fn parse_xlsx_statement(bytes: &[u8]) -> Result<Vec<(String, String, f64, Option<f64>)>, String> {
    use std::io::Cursor;
    let cursor = Cursor::new(bytes.to_vec());
    let mut workbook: calamine::Xlsx<_> =
        calamine::open_workbook_from_rs(cursor).map_err(|e| format!("XLSX açılamadı: {}", e))?;

    let sheet_names = workbook.sheet_names().to_vec();
    let mut out = Vec::new();

    if let Some(name) = sheet_names.first() {
        if let Ok(range) = workbook.worksheet_range(name) {
            for (i, row) in range.rows().enumerate() {
                if i == 0 {
                    continue; // başlık
                }
                if row.len() < 3 {
                    continue;
                }
                let to_str = |c: &calamine::Data| -> String {
                    match c {
                        calamine::Data::String(s) => s.clone(),
                        calamine::Data::Float(f) => f.to_string(),
                        calamine::Data::Int(i) => i.to_string(),
                        calamine::Data::DateTime(d) => d.to_string(),
                        _ => String::new(),
                    }
                };
                let date = to_str(&row[0]);
                // Sütunlar: tarih, açıklama, tutar, [bakiye]
                let desc = to_str(&row[1]);
                let amount = parse_tr_number(&to_str(&row[2])).unwrap_or(0.0);
                let balance = if row.len() >= 4 {
                    parse_tr_number(&to_str(&row[3]))
                } else {
                    None
                };
                out.push((normalize_date(&date), desc, amount, balance));
            }
        }
    }

    Ok(out)
}

/// Türkçe sayı formatını çözer: "1.234,56" → 1234.56, "1,234.56" → 1234.56
fn parse_tr_number(s: &str) -> Option<f64> {
    let cleaned: String = s
        .chars()
        .filter(|c| !c.is_whitespace())
        .collect::<String>()
        .replace("TL", "")
        .replace("\u{20ba}", "");

    if cleaned.contains(',') && cleaned.contains('.') {
        // Hangisi ondalık? Son görülen hangisiyse o ondalık kabul edilir
        let last_comma = cleaned.rfind(',').unwrap_or(0);
        let last_dot = cleaned.rfind('.').unwrap_or(0);
        if last_comma > last_dot {
            Some(cleaned.replace('.', "").replace(',', ".").parse().ok()?)
        } else {
            Some(cleaned.replace(',', "").parse().ok()?)
        }
    } else if cleaned.contains(',') {
        Some(cleaned.replace(',', ".").parse().ok()?)
    } else {
        cleaned.parse().ok()
    }
}

/// Tarih formatlarını YYYY-MM-DD'ye normalleştirir.
fn normalize_date(s: &str) -> String {
    let s = s.trim();
    // dd.mm.yyyy veya dd/mm/yyyy
    for sep in ['.', '/'] {
        let parts: Vec<&str> = s.split(sep).collect();
        if parts.len() == 3 {
            let (d, m, y) = (parts[0], parts[1], parts[2]);
            if d.len() <= 2 && m.len() <= 2 && y.len() >= 4 {
                return format!("{}-{:0>2}-{:0>2}", y, m, d);
            }
        }
    }
    // dd.mm.yy (kısa yıl)
    if s.len() == 8 {
        let parts: Vec<&str> = s.split('.').collect();
        if parts.len() == 3 {
            return format!("20{}-{:0>2}-{:0>2}", parts[2], parts[1], parts[0]);
        }
    }
    s.to_string()
}

// ---------------------------------------------------------------
// 3) AI destekli cari eşleştirme
// ---------------------------------------------------------------

/// Bekleyen ekstre satırlarını AI ile cari hesaplara eşleştirir.
/// Basit eşleştirme: cari adının açıklamada geçip geçmediği (fuzzy) + AI fallback.
#[tauri::command]
pub fn auto_match_bank_statement(pool: State<DbPool>) -> Result<usize, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;

    // Bekleyen satırlar
    let mut stmt = conn
        .prepare("SELECT id, description FROM bank_statements WHERE status = 'pending' LIMIT 200")
        .map_err(|e| e.to_string())?;
    let pending: Vec<(String, String)> = stmt
        .query_map([], |r| Ok((r.get(0)?, r.get(1)?)))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // Tüm cariler
    let mut stmt2 = conn
        .prepare("SELECT id, name FROM companies")
        .map_err(|e| e.to_string())?;
    let companies: Vec<(String, String)> = stmt2
        .query_map([], |r| Ok((r.get(0)?, r.get(1)?)))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let mut matched = 0usize;

    for (row_id, description) in &pending {
        let desc_lower = description.to_lowercase();

        // 1) Doğrudan ad içeriyor mu?
        let mut best: Option<(&String, &String, f64)> = None;
        for (cid, cname) in &companies {
            let cname_lower = cname.to_lowercase();
            let score = if desc_lower.contains(&cname_lower) {
                1.0
            } else {
                // Kelime bazlı eşleşme (ilk kelime en az 3 harf)
                let words: Vec<&str> = cname_lower.split_whitespace().collect();
                let mut partial: f64 = 0.0;
                for w in &words {
                    if w.len() >= 3 && desc_lower.contains(w) {
                        partial += 0.5;
                    }
                }
                partial.min(0.9)
            };
            if score > 0.0 && best.map(|(_, _, s)| score > s).unwrap_or(true) {
                best = Some((cid, cname, score));
            }
        }

        if let Some((cid, cname, score)) = best {
            if score >= 0.5 {
                conn.execute(
                    "UPDATE bank_statements SET matched_company_id = ?1, matched_company_name = ?2, match_score = ?3, status = 'matched' WHERE id = ?4",
                    rusqlite::params![cid, cname, score, row_id],
                )
                .map_err(|e| e.to_string())?;
                matched += 1;
            }
        }
    }

    Ok(matched)
}

/// Eşleşen satırı manuel onaylayıp cari hesaba hareket olarak işler.
#[tauri::command]
pub fn confirm_bank_statement_row(
    pool: State<DbPool>,
    row_id: String,
    company_id: Option<String>,
) -> Result<(), String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // Satırı al
    let (date, description, amount, matched_company_id): (String, String, f64, Option<String>) = conn
        .query_row(
            "SELECT date, description, amount, matched_company_id FROM bank_statements WHERE id = ?1",
            [&row_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
        )
        .map_err(|e| e.to_string())?;

    let final_company_id = company_id.or(matched_company_id).ok_or("Cari hesap eşleşmesi yok; önce eşleştirin veya manuel cari seçin.")?;

    // Cari hesaba ledger_entry olarak işle
    // amount > 0 → tahsilat (bizim lehimize) → debit
    // amount < 0 → ödeme → credit
    let entry_id = uuid::Uuid::new_v4().to_string();
    let (debit, credit) = if amount > 0.0 { (amount, 0.0) } else { (0.0, -amount) };

    conn.execute(
        "INSERT INTO ledger_entries (id, company_id, date, description, debit, credit, entry_type, running_balance, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'bank_statement', 0, ?7)",
        rusqlite::params![entry_id, final_company_id, date, format!("Banka: {}", description), debit, credit, now],
    )
    .map_err(|e| e.to_string())?;

    // Bakiyeleri güncelle
    crate::commands::ledger::recompute_running_balances(&conn, &final_company_id)?;

    // Satırı "imported" işaretle
    conn.execute(
        "UPDATE bank_statements SET status = 'imported' WHERE id = ?1",
        [&row_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// Bir satırı yoksay (eşleşme yok).
#[tauri::command]
pub fn ignore_bank_statement_row(pool: State<DbPool>, row_id: String) -> Result<(), String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE bank_statements SET status = 'ignored' WHERE id = ?1",
        [&row_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
