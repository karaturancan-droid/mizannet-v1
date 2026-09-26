use crate::db::DbPool;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, Emitter};
use std::time::Duration;
use uuid::Uuid;
use chrono::Utc;
use rust_xlsxwriter::{Workbook, Format, Color};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WorkflowJob {
    pub id: String,
    pub job_type: String,
    pub payload: String,
    pub status: String,
    pub error_msg: Option<String>,
    pub result_payload: Option<String>,
    pub retry_count: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[tauri::command]
pub fn list_workflow_jobs(pool: tauri::State<'_, DbPool>) -> Result<Vec<WorkflowJob>, String> {
    let conn = pool.get_conn()?;
    let mut stmt = conn
        .prepare("SELECT id, job_type, payload, status, error_msg, result_payload, retry_count, created_at, updated_at FROM workflow_jobs ORDER BY created_at DESC LIMIT 50")
        .map_err(|e| e.to_string())?;

    let iter = stmt
        .query_map([], |row| {
            Ok(WorkflowJob {
                id: row.get(0)?,
                job_type: row.get(1)?,
                payload: row.get(2)?,
                status: row.get(3)?,
                error_msg: row.get(4)?,
                result_payload: row.get(5)?,
                retry_count: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut jobs = Vec::new();
    for job in iter {
        jobs.push(job.map_err(|e| e.to_string())?);
    }
    Ok(jobs)
}

#[tauri::command]
pub fn submit_excel_export_job(
    pool: tauri::State<'_, DbPool>,
    payload: String,
) -> Result<String, String> {
    let conn = pool.get_conn()?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO workflow_jobs (id, job_type, payload, status, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![&id, "excel_export", &payload, "pending", &now, &now],
    ).map_err(|e| e.to_string())?;

    Ok(id)
}

pub fn start_workflow_worker(app_handle: AppHandle, pool: DbPool) {
    let app_data_dir = crate::commands::data_location::resolve_data_dir(&app_handle).unwrap_or_else(|_| std::path::PathBuf::from("."));
    
    tauri::async_runtime::spawn(async move {
        loop {
            tokio::time::sleep(Duration::from_secs(5)).await;

            let result: Result<(), String> = (|| {
                let conn = pool.get_conn()?;
                
                // Fetch one pending job
                let job_opt = {
                    let mut stmt = conn.prepare(
                        "SELECT id, job_type, payload FROM workflow_jobs WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1"
                    ).map_err(|e| e.to_string())?;
                    
                    let mut rows = stmt.query([]).map_err(|e| e.to_string())?;
                    if let Ok(Some(row)) = rows.next() {
                        let id: String = row.get(0).map_err(|e| e.to_string())?;
                        let job_type: String = row.get(1).map_err(|e| e.to_string())?;
                        let payload: String = row.get(2).map_err(|e| e.to_string())?;
                        Some((id, job_type, payload))
                    } else {
                        None
                    }
                };

                if let Some((id, job_type, payload)) = job_opt {
                    // Mark as processing
                    let now = Utc::now().to_rfc3339();
                    conn.execute(
                        "UPDATE workflow_jobs SET status = 'processing', updated_at = ?1 WHERE id = ?2",
                        rusqlite::params![&now, &id],
                    ).map_err(|e| e.to_string())?;

                    // Process job
                    let process_result = match job_type.as_str() {
                        "excel_export" => process_excel_export(&app_data_dir, &payload),
                        _ => Err(format!("Unknown job type: {}", job_type)),
                    };

                    // Mark as completed or failed
                    let now2 = Utc::now().to_rfc3339();
                    match process_result {
                        Ok(result_payload) => {
                            conn.execute(
                                "UPDATE workflow_jobs SET status = 'completed', result_payload = ?1, updated_at = ?2 WHERE id = ?3",
                                rusqlite::params![&result_payload, &now2, &id],
                            ).map_err(|e| e.to_string())?;
                            let _ = app_handle.emit("workflow-completed", &id);
                        }
                        Err(e) => {
                            conn.execute(
                                "UPDATE workflow_jobs SET status = 'failed', error_msg = ?1, updated_at = ?2 WHERE id = ?3",
                                rusqlite::params![&e, &now2, &id],
                            ).map_err(|e| e.to_string())?;
                            let _ = app_handle.emit("workflow-failed", &id);
                        }
                    }
                }

                Ok(())
            })();

            if let Err(e) = result {
                log::error!("Workflow worker error: {}", e);
            }
        }
    });
}

fn process_excel_export(app_data_dir: &std::path::Path, _payload: &str) -> Result<String, String> {
    // Basic implementation of Excel export using rust_xlsxwriter
    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();

    let header_format = Format::new()
        .set_bold()
        .set_background_color(Color::Blue)
        .set_font_color(Color::White);

    worksheet.write_string_with_format(0, 0, "ID", &header_format).map_err(|e| e.to_string())?;
    worksheet.write_string_with_format(0, 1, "Name", &header_format).map_err(|e| e.to_string())?;
    worksheet.write_string_with_format(0, 2, "Value", &header_format).map_err(|e| e.to_string())?;

    worksheet.write_string(1, 0, "1").map_err(|e| e.to_string())?;
    worksheet.write_string(1, 1, "Item A").map_err(|e| e.to_string())?;
    worksheet.write_number(1, 2, 100.5).map_err(|e| e.to_string())?;

    let file_name = format!("export_{}.xlsx", Uuid::new_v4());
    let export_dir = app_data_dir.join("exports");
    std::fs::create_dir_all(&export_dir).map_err(|e| e.to_string())?;
    let file_path = export_dir.join(&file_name);

    workbook.save(&file_path).map_err(|e| e.to_string())?;

    #[derive(Serialize)]
    struct ExportResult {
        file_path: String,
    }
    
    let res = ExportResult {
        file_path: file_path.to_string_lossy().to_string(),
    };

    serde_json::to_string(&res).map_err(|e| e.to_string())
}
