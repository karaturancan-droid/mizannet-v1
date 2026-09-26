#![allow(unused)]
use crate::db::DbPool;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, State, Manager};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Workspace {
    pub id: String,
    pub name: String,
    pub db_file: String,
}

fn get_workspaces_file(app: &AppHandle) -> Result<PathBuf, String> {
    let data_dir = crate::commands::data_location::resolve_data_dir(app)?;
    Ok(data_dir.join("workspaces.json"))
}

fn load_workspaces(app: &AppHandle) -> Result<Vec<Workspace>, String> {
    let file_path = get_workspaces_file(app)?;
    if !file_path.exists() {
        let default = vec![Workspace {
            id: "default".to_string(),
            name: "Varsayılan İşletme".to_string(),
            db_file: "mizannet.db".to_string(),
        }];
        save_workspaces(app, &default)?;
        return Ok(default);
    }
    
    let content = fs::read_to_string(&file_path).map_err(|e| e.to_string())?;
    let workspaces: Vec<Workspace> = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(workspaces)
}

fn save_workspaces(app: &AppHandle, workspaces: &[Workspace]) -> Result<(), String> {
    let file_path = get_workspaces_file(app)?;
    let content = serde_json::to_string_pretty(workspaces).map_err(|e| e.to_string())?;
    fs::write(file_path, content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn list_workspaces(app: AppHandle) -> Result<Vec<Workspace>, String> {
    load_workspaces(&app)
}

#[tauri::command]
pub fn create_workspace(app: AppHandle, pool: State<DbPool>, name: String) -> Result<Workspace, String> {
    // Premium Check - Geçici olarak devre dışı bırakıldı
    // let conn = pool.get_conn().map_err(|e| e.to_string())?;
    // let status: Option<String> = conn.query_row("SELECT value FROM settings WHERE key = 'license_status'", [], |row| row.get(0)).ok();
    // let is_premium = status.as_deref() == Some("PREMIUM");
    
    let mut workspaces = load_workspaces(&app)?;
    
    /* if !is_premium && workspaces.len() >= 1 {
        return Err("Ücretsiz deneme sürümünde sadece 1 işletme profili kullanabilirsiniz. Yeni işletme eklemek için aboneliğinizi yükseltin.".to_string());
    } */

    let id = uuid::Uuid::new_v4().to_string();
    let db_file = format!("mizannet_{}.db", id);
    
    let workspace = Workspace {
        id,
        name,
        db_file,
    };
    
    workspaces.push(workspace.clone());
    save_workspaces(&app, &workspaces)?;
    Ok(workspace)
}

#[tauri::command]
pub fn switch_workspace(app: AppHandle, pool: State<DbPool>, workspace_id: String) -> Result<(), String> {
    let workspaces = load_workspaces(&app)?;
    let workspace = workspaces.into_iter().find(|w| w.id == workspace_id).ok_or("Workspace not found")?;
    
    let data_dir = crate::commands::data_location::resolve_data_dir(&app)?;
    pool.switch_conn(data_dir.join(workspace.db_file))?;
    
    Ok(())
}

#[tauri::command]
pub fn delete_workspace(app: AppHandle, workspace_id: String) -> Result<(), String> {
    let mut workspaces = load_workspaces(&app)?;
    
    if workspaces.len() <= 1 {
        return Err("En az bir işletme profili kalmalıdır.".to_string());
    }

    let workspace_index = workspaces.iter().position(|w| w.id == workspace_id).ok_or("İşletme bulunamadı")?;
    let workspace = workspaces.remove(workspace_index);

    // Optionally delete the database file from disk
    let data_dir = crate::commands::data_location::resolve_data_dir(&app)?;
    let db_path = data_dir.join(&workspace.db_file);
    if db_path.exists() {
        let _ = std::fs::remove_file(db_path);
    }
    
    save_workspaces(&app, &workspaces)?;
    Ok(())
}
