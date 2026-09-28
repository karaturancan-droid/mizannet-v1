//! Nakit akış ajandası — bekleyen tahsilat/ödeme takvimi ve haftalık nakit
//! akışı projeksiyonu. Cari hesap (ledger_entries) ve vergi takibi (tax_items)
//! verisinden hareket eder.
//!
//! Komutlar:
//!   get_cash_agenda  → yaklaşan tahsilat/ödeme kalemleri + haftalık projeksiyon
//!   get_receivables_schedule → vadesi gelmiş/yaklaşan cari tahsilatlar

use crate::db::DbPool;
use chrono::Datelike;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AgendaItem {
    pub id: String,
    pub kind: String,       // "tahsilat" | "odeme"
    pub source: String,     // "cari" | "vergi" | "cek"
    pub date: String,       // beklenen/son tarih (yyyy-mm-dd)
    pub company_name: String,
    pub description: String,
    pub amount: f64,
    pub status: String,     // "bekliyor" | "gecikti"
    pub days_left: i64,     // bugüne göre fark (negatif = gecikmiş)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WeeklyProjection {
    pub week_start: String, // yyyy-mm-dd (Pazartesi)
    pub inflow: f64,
    pub outflow: f64,
    pub net: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CashAgenda {
    pub items: Vec<AgendaItem>,
    pub weeks: Vec<WeeklyProjection>,
    pub total_receivable: f64,
    pub total_payable: f64,
    pub overdue_receivable: f64,
    pub overdue_payable: f64,
    pub opening_balance: f64,
}

fn today() -> chrono::NaiveDate {
    chrono::Local::now().date_naive()
}

fn parse_date(s: &str) -> Option<chrono::NaiveDate> {
    chrono::NaiveDate::parse_from_str(s.trim(), "%Y-%m-%d").ok()
}

fn map_overdue(days_left: i64, status: &str) -> String {
    if days_left < 0 && status != "ödendi" { "gecikti".to_string() } else { status.to_string() }
}

/// Nakit akış ajandasını üretir.
/// - Cari tahsilatlar: companies.balance + ledger_entries'ten bekleyen alacaklar.
///   (Cari bakiye pozitif = müşteri bize borçlu → tahsilat beklentisi)
/// - Vergi ödemeleri: tax_items tablosunda status='bekliyor' kayıtlar.
#[tauri::command]
pub fn get_cash_agenda(pool: State<DbPool>, branch_id: Option<String>) -> Result<CashAgenda, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let _bid = branch_id.unwrap_or_else(|| "default_branch".to_string());
    let t = today();
    let horizon = t + chrono::Duration::days(60);

    let mut items: Vec<AgendaItem> = Vec::new();

    // ---- 1) Cari hesap alacakları (balance > 0 → tahsilat bekliyoruz) ----
    {
        let mut stmt = conn
            .prepare("SELECT id, name, balance FROM companies WHERE balance > 0.005 ORDER BY balance DESC")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, f64>(2)?,
                ))
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        for (id, name, balance) in rows {
            // Son hareket tarihini bul (vade tahmini olarak kullanılır)
            let last_date: Option<String> = conn
                .query_row(
                    "SELECT MAX(date) FROM ledger_entries WHERE company_id = ?1",
                    rusqlite::params![id],
                    |r| r.get(0),
                )
                .ok()
                .flatten();
            let expected = parse_date(&last_date.unwrap_or_default())
                .map(|d| d + chrono::Duration::days(30))
                .unwrap_or(t);
            if expected > horizon {
                continue;
            }
            let days_left = (expected - t).num_days();
            items.push(AgendaItem {
                id,
                kind: "tahsilat".into(),
                source: "cari".into(),
                date: expected.format("%Y-%m-%d").to_string(),
                company_name: name,
                description: "Cari hesap tahsilatı (30 gün vadeli tahmin)".into(),
                amount: balance,
                status: map_overdue(days_left, "bekliyor"),
                days_left,
            });
        }
    }

    // ---- 2) Vergi/SGK ödemeleri (bekleyenler) ----
    {
        let mut stmt = conn
            .prepare("SELECT id, type, due_date, amount, status FROM tax_items WHERE status != 'ödendi' ORDER BY due_date ASC")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, f64>(3)?,
                    row.get::<_, String>(4)?,
                ))
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        for (id, ttype, due, amount, status) in rows {
            let Some(d) = parse_date(&due) else { continue };
            if d > horizon {
                continue;
            }
            let days_left = (d - t).num_days();
            items.push(AgendaItem {
                id,
                kind: "odeme".into(),
                source: "vergi".into(),
                date: due,
                company_name: "Vergi Dairesi".into(),
                description: ttype,
                amount,
                status: map_overdue(days_left, &status),
                days_left,
            });
        }
    }

    // ---- Özetler ----
    let total_receivable: f64 = items.iter().filter(|i| i.kind == "tahsilat").map(|i| i.amount).sum();
    let total_payable: f64 = items.iter().filter(|i| i.kind == "odeme").map(|i| i.amount).sum();
    let overdue_receivable: f64 = items
        .iter()
        .filter(|i| i.kind == "tahsilat" && i.status == "gecikti")
        .map(|i| i.amount)
        .sum();
    let overdue_payable: f64 = items
        .iter()
        .filter(|i| i.kind == "odeme" && i.status == "gecikti")
        .map(|i| i.amount)
        .sum();

    // ---- 3) Haftalık projeksiyon (önümüzdeki 8 hafta) ----
    let mut weeks: Vec<WeeklyProjection> = Vec::new();
    let monday = t - chrono::Duration::days(t.weekday().num_days_from_monday() as i64);
    for w in 0..8 {
        let ws = monday + chrono::Duration::weeks(w);
        let we = ws + chrono::Duration::days(6);
        let inflow: f64 = items
            .iter()
            .filter(|i| {
                i.kind == "tahsilat"
                    && parse_date(&i.date).map(|d| d >= ws && d <= we).unwrap_or(false)
            })
            .map(|i| i.amount)
            .sum();
        let outflow: f64 = items
            .iter()
            .filter(|i| {
                i.kind == "odeme"
                    && parse_date(&i.date).map(|d| d >= ws && d <= we).unwrap_or(false)
            })
            .map(|i| i.amount)
            .sum();
        weeks.push(WeeklyProjection {
            week_start: ws.format("%Y-%m-%d").to_string(),
            inflow,
            outflow,
            net: inflow - outflow,
        });
    }

    // Açılış bakiyesi: tüm cari bakiyelerin toplamı (net nakit pozisyonu yaklaşımı)
    let opening_balance: f64 = conn
        .query_row("SELECT COALESCE(SUM(balance), 0) FROM companies", [], |r| r.get(0))
        .unwrap_or(0.0);

    items.sort_by(|a, b| a.date.cmp(&b.date));

    Ok(CashAgenda {
        items,
        weeks,
        total_receivable,
        total_payable,
        overdue_receivable,
        overdue_payable,
        opening_balance,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_and_weekday() {
        let d = parse_date("2026-09-28").unwrap();
        assert_eq!(d.weekday().num_days_from_monday(), 0); // Pazartesi
        let t = today();
        let monday = t - chrono::Duration::days(t.weekday().num_days_from_monday() as i64);
        assert_eq!(monday.weekday().num_days_from_monday(), 0);
    }

    #[test]
    fn test_map_overdue() {
        assert_eq!(map_overdue(-5, "bekliyor"), "gecikti");
        assert_eq!(map_overdue(3, "bekliyor"), "bekliyor");
        assert_eq!(map_overdue(-5, "ödendi"), "ödendi");
    }
}
