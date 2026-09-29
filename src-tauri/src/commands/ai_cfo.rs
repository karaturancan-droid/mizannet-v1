use crate::db::DbPool;
use serde::Serialize;
use tauri::State;
use chrono::Local;

#[derive(Serialize)]
pub struct CeoMetrics {
    pub current_date: String,
    pub total_receivables: f64,
    pub total_payables: f64,
    pub total_cash_and_bank: f64,
    pub top_debtors: Vec<DebtorInfo>,
    pub recent_large_expenses: Vec<ExpenseInfo>,
}

#[derive(Serialize)]
pub struct DebtorInfo {
    pub name: String,
    pub amount: f64,
}

#[derive(Serialize)]
pub struct ExpenseInfo {
    pub description: String,
    pub amount: f64,
    pub date: String,
}

#[tauri::command]
pub fn get_ceo_dashboard_metrics(pool: State<DbPool>) -> Result<CeoMetrics, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;

    // 1. Alacaklar (120 Hesaplarý)
    let total_receivables: f64 = conn.query_row(
        "SELECT COALESCE(SUM(balance), 0) FROM companies WHERE balance > 0",
        [],
        |row| row.get(0)
    ).unwrap_or(0.0_f64);

    // 2. Borçlar (320 Hesaplarý)
    let total_payables: f64 = conn.query_row(
        "SELECT COALESCE(SUM(balance), 0) FROM companies WHERE balance < 0",
        [],
        |row| row.get(0)
    ).unwrap_or(0.0_f64).abs();

    // 3. Kasa ve Banka Toplamý (Accounts tablosundan)
    let total_cash_and_bank: f64 = conn.query_row(
        "SELECT COALESCE(SUM(opening_balance), 0) FROM accounts",
        [],
        |row| row.get(0)
    ).unwrap_or(0.0_f64);

    // 4. En çok borcu olan 5 cari
    let mut stmt = conn.prepare("SELECT name, balance FROM companies WHERE balance > 0 ORDER BY balance DESC LIMIT 5").map_err(|e| e.to_string())?;
    let debtors = stmt.query_map([], |row| {
        Ok(DebtorInfo {
            name: row.get(0)?,
            amount: row.get(1)?,
        })
    }).map_err(|e| e.to_string())?.filter_map(Result::ok).collect();

    // 5. Son 30 günün en büyük 5 gideri
    let expenses = if let Ok(mut stmt) = conn.prepare("SELECT description, debit, date FROM ledger_entries WHERE debit > 0 ORDER BY debit DESC LIMIT 5") {
        if let Ok(mapped) = stmt.query_map([], |row| {
            Ok(ExpenseInfo {
                description: row.get(0)?,
                amount: row.get(1)?,
                date: row.get(2)?,
            })
        }) {
            mapped.filter_map(Result::ok).collect()
        } else {
            vec![]
        }
    } else {
        vec![]
    };

    Ok(CeoMetrics {
        current_date: Local::now().format("%Y-%m-%d").to_string(),
        total_receivables,
        total_payables,
        total_cash_and_bank,
        top_debtors: debtors,
        recent_large_expenses: expenses,
    })
}

#[tauri::command]
pub fn generate_cfo_report(prompt: String, pool: State<DbPool>) -> Result<String, String> {
    use crate::ai::{ai_chat, ChatMessage};
    
    let messages = vec![
        ChatMessage {
            role: "user".to_string(),
            content: prompt,
        }
    ];
    
    ai_chat(&pool, &messages)
}
