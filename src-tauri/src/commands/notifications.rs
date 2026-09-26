#![allow(unused)]
use crate::db::DbPool;
use crate::helpers::{new_id, now_iso};
use crate::models::Notification;
use chrono::{NaiveDate, Utc};
use rusqlite::Connection;
use tauri::{AppHandle, State};

fn days_left_from(due_date: &str) -> Option<i64> {
    let today = Utc::now().date_naive();
    NaiveDate::parse_from_str(due_date, "%Y-%m-%d")
        .ok()
        .map(|d| (d - today).num_days())
}

fn insert_notification(
    conn: &Connection,
    title: &str,
    module: &str,
    related_id: &str,
    due_date: Option<&str>,
    days_left: Option<i64>,
    source_type: &str,
) -> Result<(), String> {
    let id = new_id();
    let created_at = now_iso();
    conn.execute(
        "INSERT INTO notifications (id, title, module, related_id, due_date, days_left, status, source_type, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'aktif', ?7, ?8)",
        rusqlite::params![id, title, module, related_id, due_date, days_left, source_type, created_at],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

/// Scans all relevant tables and (re)generates notifications. Callable both as a
/// Tauri command and directly from `.setup()` with a plain Connection.
pub fn refresh_notifications_conn(conn: &Connection) -> Result<(), String> {
    conn.execute("DELETE FROM notifications", [])
        .map_err(|e| e.to_string())?;

    // Vergi: due within 15 days or overdue.
    {
        let mut stmt = conn
            .prepare("SELECT id, type, due_date FROM tax_items WHERE status != 'odendi'")
            .map_err(|e| e.to_string())?;
        let rows: Vec<(String, String, String)> = stmt
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        for (id, tax_type, due_date) in rows {
            if let Some(days_left) = days_left_from(&due_date) {
                if days_left <= 15 {
                    insert_notification(
                        conn,
                        &format!("{} vergisi son odeme tarihi yaklasiyor", tax_type),
                        "vergi",
                        &id,
                        Some(&due_date),
                        Some(days_left),
                        "tax_item",
                    )?;
                }
            }
        }
    }

    // Araclar: inspection/insurance due within 30 days or overdue.
    {
        let mut stmt = conn
            .prepare("SELECT id, plate, inspection_due_date, insurance_due_date FROM vehicles")
            .map_err(|e| e.to_string())?;
        let rows: Vec<(String, String, Option<String>, Option<String>)> = stmt
            .query_map([], |row| {
                Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        for (id, plate, inspection, insurance) in rows {
            if let Some(d) = inspection {
                if let Some(days_left) = days_left_from(&d) {
                    if days_left <= 30 {
                        insert_notification(
                            conn,
                            &format!("{} plakali aracin muayene tarihi yaklasiyor", plate),
                            "araclar",
                            &id,
                            Some(&d),
                            Some(days_left),
                            "vehicle",
                        )?;
                    }
                }
            }
            if let Some(d) = insurance {
                if let Some(days_left) = days_left_from(&d) {
                    if days_left <= 30 {
                        insert_notification(
                            conn,
                            &format!("{} plakali aracin sigortasi yaklasiyor", plate),
                            "araclar",
                            &id,
                            Some(&d),
                            Some(days_left),
                            "vehicle",
                        )?;
                    }
                }
            }
        }
    }

    // Belgeler: expiry within 30 days or overdue.
    {
        let mut stmt = conn
            .prepare("SELECT id, title, expiry_date FROM documents WHERE expiry_date IS NOT NULL")
            .map_err(|e| e.to_string())?;
        let rows: Vec<(String, String, String)> = stmt
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        for (id, title, expiry) in rows {
            if let Some(days_left) = days_left_from(&expiry) {
                if days_left <= 30 {
                    insert_notification(
                        conn,
                        &format!("'{}' belgesinin gecerlilik suresi doluyor", title),
                        "belgeler",
                        &id,
                        Some(&expiry),
                        Some(days_left),
                        "document",
                    )?;
                }
            }
        }
    }

    // Depo: current_stock <= min_stock.
    {
        let mut stmt = conn
            .prepare("SELECT id, name FROM products WHERE current_stock <= min_stock")
            .map_err(|e| e.to_string())?;
        let rows: Vec<(String, String)> = stmt
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        for (id, name) in rows {
            insert_notification(
                conn,
                &format!("'{}' urununde kritik stok seviyesi", name),
                "depo",
                &id,
                None,
                None,
                "product",
            )?;
        }
    }

    // Isciler: contract_end_date within 30 days.
    {
        let mut stmt = conn
            .prepare("SELECT id, full_name, contract_end_date FROM workers WHERE contract_end_date IS NOT NULL")
            .map_err(|e| e.to_string())?;
        let rows: Vec<(String, String, String)> = stmt
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        for (id, name, contract_end) in rows {
            if let Some(days_left) = days_left_from(&contract_end) {
                if days_left <= 30 {
                    insert_notification(
                        conn,
                        &format!("{} adli personelin sozlesmesi sona eriyor", name),
                        "isciler",
                        &id,
                        Some(&contract_end),
                        Some(days_left),
                        "worker",
                    )?;
                }
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub fn refresh_notifications(pool: State<DbPool>, app: AppHandle) -> Result<(), String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    refresh_notifications_conn(&conn)?;

    // Acil (days_left <= 3 veya geçmiş) bildirimleri masaüstüne gönder
    let mut stmt = conn
        .prepare("SELECT title, days_left FROM notifications WHERE status = 'aktif' AND (days_left IS NULL OR days_left <= 3) LIMIT 5")
        .map_err(|e| e.to_string())?;
    let urgent: Vec<(String, Option<i64>)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    if !urgent.is_empty() {
        use tauri_plugin_notification::NotificationExt;
        for (title, days) in &urgent {
            let body = match days {
                Some(d) if *d < 0 => format!("{} gün gecikmiş!", d.abs()),
                Some(d) => format!("{} gün kaldı", d),
                None => "Acil dikkat gerekiyor".to_string(),
            };
            let _ = app.notification().builder()
                .title(title)
                .body(&body)
                .show();
        }
    }

    Ok(())
}

#[tauri::command]
pub fn list_notifications(
    pool: State<DbPool>,
    module: Option<String>,
    status: Option<String>,
) -> Result<Vec<Notification>, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let mut sql = "SELECT id, title, module, related_id, due_date, days_left, status, source_type, created_at FROM notifications WHERE 1=1".to_string();
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(m) = &module {
        if !m.is_empty() {
            sql.push_str(" AND module = ?");
            params.push(Box::new(m.clone()));
        }
    }
    if let Some(s) = &status {
        if !s.is_empty() {
            sql.push_str(" AND status = ?");
            params.push(Box::new(s.clone()));
        }
    }
    sql.push_str(" ORDER BY days_left ASC");

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    let mapped = stmt
        .query_map(param_refs.as_slice(), |row| {
            Ok(Notification {
                id: row.get(0)?,
                title: row.get(1)?,
                module: row.get(2)?,
                related_id: row.get(3)?,
                due_date: row.get(4)?,
                days_left: row.get(5)?,
                status: row.get(6)?,
                source_type: row.get(7)?,
                created_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?;
    mapped.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_notification_status(
    pool: State<DbPool>,
    id: String,
    status: String,
) -> Result<(), String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE notifications SET status = ?1 WHERE id = ?2",
        rusqlite::params![status, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn update_notification_date(
    pool: State<DbPool>,
    id: String,
    new_date: String,
) -> Result<(), String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    
    // Önce notification tablosunda bul
    let row: Result<(String, String, String, String), _> = conn.query_row(
        "SELECT module, related_id, source_type, title FROM notifications WHERE id = ?1",
        rusqlite::params![id],
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
    );

    if let Ok((module, related_id, source_type, title)) = row {
        // Source table güncellemeleri
        if source_type == "tax_item" {
            let _ = conn.execute("UPDATE tax_items SET due_date = ?1 WHERE id = ?2", rusqlite::params![new_date, related_id]);
        } else if source_type == "document" {
            let _ = conn.execute("UPDATE documents SET expiry_date = ?1 WHERE id = ?2", rusqlite::params![new_date, related_id]);
        } else if source_type == "vehicle" {
            if title.contains("muayene") {
                let _ = conn.execute("UPDATE vehicles SET inspection_due_date = ?1 WHERE id = ?2", rusqlite::params![new_date, related_id]);
            } else if title.contains("sigorta") {
                let _ = conn.execute("UPDATE vehicles SET insurance_due_date = ?1 WHERE id = ?2", rusqlite::params![new_date, related_id]);
            }
        }
        
        // Yeniden hesaplanan gün
        let days_left = days_left_from(&new_date).unwrap_or(0);
        
        conn.execute(
            "UPDATE notifications SET due_date = ?1, days_left = ?2 WHERE id = ?3",
            rusqlite::params![new_date, days_left, id],
        ).map_err(|e| e.to_string())?;
    }

    Ok(())
}
