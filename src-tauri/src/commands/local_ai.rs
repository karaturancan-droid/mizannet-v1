use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State, Manager};
use std::fs;
use serde::Serialize;
use futures_util::StreamExt;
use tokio::io::AsyncWriteExt;

pub struct LocalAiProcess(pub Mutex<Option<Child>>);

#[derive(Serialize, Clone)]
pub struct DownloadProgress {
    pub file: String,
    pub downloaded: u64,
    pub total: u64,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Default, Debug)]
pub struct ActiveDownloadState {
    pub is_downloading: bool,
    pub filename: String,
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
    pub percent: u32,
    pub error: Option<String>,
}

pub struct DownloadState(pub Mutex<ActiveDownloadState>);

#[tauri::command]
pub fn get_active_download_state(state: State<DownloadState>) -> ActiveDownloadState {
    state.0.lock().unwrap().clone()
}

pub fn ai_dir(app: &AppHandle) -> PathBuf {
    let data_dir = crate::commands::data_location::resolve_data_dir(app).unwrap_or_else(|_| PathBuf::from("."));
    let dir = data_dir.join("local_ai");
    fs::create_dir_all(&dir).ok();
    dir
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct LocalModelInfo {
    pub name: String,
    pub path: String,
    pub size_bytes: u64,
    pub is_vision: bool,
}

pub fn scan_gguf_files(dir: &Path, max_depth: usize, current_depth: usize, results: &mut Vec<LocalModelInfo>) {
    if current_depth > max_depth {
        return;
    }
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                scan_gguf_files(&path, max_depth, current_depth + 1, results);
            } else if let Some(ext) = path.extension() {
                if ext.to_string_lossy().to_lowercase() == "gguf" {
                    if let Ok(meta) = entry.metadata() {
                        let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
                        let is_vision = name.to_lowercase().contains("mmproj");
                        results.push(LocalModelInfo {
                            name,
                            path: path.to_string_lossy().to_string(),
                            size_bytes: meta.len(),
                            is_vision,
                        });
                    }
                }
            }
        }
    }
}

#[tauri::command]
pub async fn check_local_ai_installed(app: AppHandle, custom_model_path: Option<String>) -> Result<bool, String> {
    let dir = ai_dir(&app);
    let server_path = dir.join("llama-server.exe");
    if !server_path.exists() {
        return Ok(false);
    }

    if dir.join("model.gguf").exists() {
        return Ok(true);
    }

    if let Some(p) = custom_model_path.filter(|p| !p.trim().is_empty()) {
        let path = PathBuf::from(p);
        if path.is_file() && path.extension().map_or(false, |e| e.to_string_lossy().to_lowercase() == "gguf") {
            return Ok(true);
        }
        if path.is_dir() {
            let mut found = Vec::new();
            scan_gguf_files(&path, 2, 0, &mut found);
            if found.iter().any(|m| !m.is_vision) {
                return Ok(true);
            }
        }
    }

    let mut found = Vec::new();
    scan_gguf_files(&dir, 1, 0, &mut found);
    Ok(found.iter().any(|m| !m.is_vision))
}

async fn download_file(app: &AppHandle, url: &str, dest: &Path, file_label: &str) -> Result<(), String> {
    let client = reqwest::Client::new();
    let res = match client.get(url).send().await {
        Ok(r) => r,
        Err(e) => {
            let state = app.state::<DownloadState>();
            let mut ds = state.0.lock().unwrap();
            ds.is_downloading = false;
            ds.error = Some(e.to_string());
            return Err(e.to_string());
        }
    };
    
    let total_size = res.content_length().unwrap_or(0);

    {
        let state = app.state::<DownloadState>();
        let mut ds = state.0.lock().unwrap();
        ds.is_downloading = true;
        ds.filename = file_label.to_string();
        ds.downloaded_bytes = 0;
        ds.total_bytes = total_size;
        ds.percent = 0;
        ds.error = None;
    }

    let tmp_name = format!("{}.tmp", dest.file_name().unwrap_or_default().to_string_lossy());
    let tmp_dest = dest.with_file_name(tmp_name);

    let mut file = match tokio::fs::File::create(&tmp_dest).await {
        Ok(f) => f,
        Err(e) => {
            let state = app.state::<DownloadState>();
            let mut ds = state.0.lock().unwrap();
            ds.is_downloading = false;
            ds.error = Some(e.to_string());
            return Err(e.to_string());
        }
    };
    let mut stream = res.bytes_stream();
    let mut downloaded: u64 = 0;
    let mut last_percent = 0;
    
    while let Some(chunk) = stream.next().await {
        let chunk = match chunk {
            Ok(c) => c,
            Err(e) => {
                let state = app.state::<DownloadState>();
                let mut ds = state.0.lock().unwrap();
                ds.is_downloading = false;
                ds.error = Some(e.to_string());
                return Err(e.to_string());
            }
        };
        if let Err(e) = file.write_all(&chunk).await {
            let state = app.state::<DownloadState>();
            let mut ds = state.0.lock().unwrap();
            ds.is_downloading = false;
            ds.error = Some(e.to_string());
            return Err(e.to_string());
        }
        downloaded += chunk.len() as u64;

        if total_size > 0 {
            let percent = (downloaded as f64 / total_size as f64 * 100.0) as u64;
            if percent > last_percent {
                last_percent = percent;
                {
                    let state = app.state::<DownloadState>();
                    let mut ds = state.0.lock().unwrap();
                    ds.downloaded_bytes = downloaded;
                    ds.percent = percent as u32;
                }
                let _ = app.emit("ai_download_progress", DownloadProgress {
                    file: file_label.to_string(),
                    downloaded,
                    total: total_size,
                });
            }
        }
    }

    if let Err(e) = std::fs::rename(&tmp_dest, dest) {
        let state = app.state::<DownloadState>();
        let mut ds = state.0.lock().unwrap();
        ds.is_downloading = false;
        ds.error = Some(e.to_string());
        return Err(e.to_string());
    }

    {
        let state = app.state::<DownloadState>();
        let mut ds = state.0.lock().unwrap();
        ds.is_downloading = false;
        ds.percent = 100;
        ds.downloaded_bytes = total_size;
    }

    Ok(())
}

#[tauri::command]
pub async fn download_local_ai(app: AppHandle, model_url: Option<String>, skip_model: Option<bool>) -> Result<(), String> {
    let dir = ai_dir(&app);
    let server_path = dir.join("llama-server.exe");
    let model_path = dir.join("model.gguf");

    // Official Llama.cpp Windows binary (Vulkan support with all required DLLs)
    // NOT: Yeni mimariler (Qwen3.8/`qwen35`, Llama 4, Gemma 3 vb.) için en az
    // b6100+ gerekir. Eski b3744 build'i 'unknown model architecture' hatası verir.
    let server_zip_url = "https://github.com/ggml-org/llama.cpp/releases/download/b11213/llama-b11213-bin-win-vulkan-x64.zip";
    let final_model_url = model_url.unwrap_or_else(|| "https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf".to_string());

    if !server_path.exists() {
        let zip_path = dir.join("llama-server.zip");
        download_file(&app, server_zip_url, &zip_path, "llama-server.zip").await?;
        
        // Extract all files (including ggml.dll, llama.dll, etc.)
        let status = std::process::Command::new("tar")
            .arg("-xf")
            .arg(&zip_path)
            .current_dir(&dir)
            .status()
            .map_err(|e| format!("Zip çıkarma hatası: {}", e))?;
            
        let _ = std::fs::remove_file(&zip_path);

        if !status.success() {
            return Err("Sunucu dosyası zip'ten çıkarılamadı.".to_string());
        }
    }

    if !skip_model.unwrap_or(false) && !model_path.exists() {
        download_file(&app, &final_model_url, &model_path, "model.gguf").await?;
    }

    Ok(())
}

#[tauri::command]
pub fn start_local_ai(
    app: AppHandle,
    state: State<LocalAiProcess>,
    custom_model_path: Option<String>,
    model_filename: Option<String>,
) -> Result<bool, String> {
    let dir = ai_dir(&app);
    let server_path = dir.join("llama-server.exe");

    if !server_path.exists() {
        return Err("Llama sunucu motoru (llama-server.exe) henüz indirilmemiş. Lütfen 'Motoru İndir' butonuna basın.".to_string());
    }

    // Determine target model file
    let mut resolved_model: Option<PathBuf> = None;

    if let Some(p) = custom_model_path.filter(|s| !s.trim().is_empty()) {
        let path = PathBuf::from(&p);
        if path.is_file() && path.extension().map_or(false, |e| e.to_string_lossy().to_lowercase() == "gguf") {
            resolved_model = Some(path);
        } else if path.is_dir() {
            if let Some(fname) = model_filename.filter(|s| !s.trim().is_empty()) {
                let direct_child = path.join(&fname);
                if direct_child.exists() {
                    resolved_model = Some(direct_child);
                }
            }
            if resolved_model.is_none() {
                // Find first non-projector .gguf in that directory (or subdirs)
                let mut found = Vec::new();
                scan_gguf_files(&path, 2, 0, &mut found);
                if let Some(best) = found.into_iter().find(|m| !m.is_vision) {
                    resolved_model = Some(PathBuf::from(best.path));
                }
            }
        }
    }

    if resolved_model.is_none() {
        let default_model = dir.join("model.gguf");
        if default_model.exists() {
            resolved_model = Some(default_model);
        } else {
            // Find any non-vision .gguf in ai_dir
            let mut found = Vec::new();
            scan_gguf_files(&dir, 1, 0, &mut found);
            if let Some(best) = found.into_iter().find(|m| !m.is_vision) {
                resolved_model = Some(PathBuf::from(best.path));
            }
        }
    }

    let model_path = match resolved_model {
        Some(p) => p,
        None => return Err("Kullanılabilir bir .gguf model dosyası bulunamadı. Lütfen bir model seçin veya indirin.".to_string()),
    };

    let mut process_guard = state.0.lock().unwrap();

    // Zaten çalışıyorsa durdur
    if let Some(mut child) = process_guard.take() {
        let _ = child.kill();
    }

    // Check if an mmproj vision projector file is in the same directory!
    let mut mmproj_arg: Option<PathBuf> = None;
    if let Some(parent) = model_path.parent() {
        if let Ok(entries) = std::fs::read_dir(parent) {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_lowercase();
                if name.starts_with("mmproj") && name.ends_with(".gguf") {
                    mmproj_arg = Some(entry.path());
                    break;
                }
            }
        }
    }
    // Aynı klasörde vision projector varsa da model seçimini mmproj dosyasına
    // YÖNLENDİRME — llama-server'a asıl modeli verirken mmproj dosyasını atla:
    if let Some(parent) = model_path.parent() {
        let name_lower = model_path.file_name().map(|n| n.to_string_lossy().to_lowercase()).unwrap_or_default();
        if name_lower.starts_with("mmproj") {
            return Err("Seçilen dosya bir vision projector (mmproj) dosyası. Lütfen asıl model .gguf dosyasını seçin.".to_string());
        }
    }

    // Log dosyası oluştur
    let log_path = dir.join("llama-server.log");
    let log_file = std::fs::OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(true)
        .open(&log_path)
        .map_err(|e| format!("Log dosyası oluşturulamadı: {}", e))?;
    let err_file = log_file.try_clone().map_err(|e| format!("Log dosyası klonlanamadı: {}", e))?;

    let mut cmd = Command::new(&server_path);
    cmd.arg("-m")
       .arg(&model_path)
       .arg("--port")
       .arg("8085")
       .arg("--host")
       .arg("127.0.0.1")
       .arg("-c")
       .arg("4096")
       .arg("-ngl")
       .arg("99"); // GPU layer offload

    // Vision (görsel anlama) desteği: aynı klasörde mmproj varsa etkinleştir.
    if let Some(proj) = mmproj_arg {
        cmd.arg("--mmproj").arg(proj);
    }

    cmd.current_dir(&dir)
       .stdout(Stdio::from(log_file))
       .stderr(Stdio::from(err_file));

    let child = cmd.spawn()
        .map_err(|e| format!("Yerel yapay zeka başlatılamadı: {}", e))?;

    *process_guard = Some(child);

    Ok(true)
}

#[tauri::command]
pub fn stop_local_ai(state: State<LocalAiProcess>) -> Result<bool, String> {
    let mut process_guard = state.0.lock().unwrap();
    if let Some(mut child) = process_guard.take() {
        let _ = child.kill();
    }
    Ok(true)
}

#[tauri::command]
pub fn reset_local_ai(app: AppHandle, state: State<LocalAiProcess>) -> Result<bool, String> {
    // 1. Önce sunucuyu durdur
    let mut process_guard = state.0.lock().unwrap();
    if let Some(mut child) = process_guard.take() {
        let _ = child.kill();
    }
    
    // 2. Klasörü temizle
    let dir = ai_dir(&app);
    let server_path = dir.join("llama-server.exe");
    let model_path = dir.join("model.gguf");

    if server_path.exists() {
        let _ = fs::remove_file(server_path);
    }
    if model_path.exists() {
        let _ = fs::remove_file(model_path);
    }

    // Yarım kalmış .tmp indirmelerini de temizle (örn. model.gguf.tmp)
    if let Ok(entries) = fs::read_dir(&dir) {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_lowercase();
            if name.ends_with(".tmp") {
                let _ = fs::remove_file(entry.path());
            }
        }
    }
    
    // Custom model kullanılıyorsa onun yolunu da temizlemek isteyebiliriz ama
    // sadece indirilenleri silmek yeterli, custom model kullanıcı dizinindedir.

    Ok(true)
}

#[tauri::command]
pub fn check_local_ai_running(state: State<LocalAiProcess>) -> bool {
    let mut process_guard = state.0.lock().unwrap();
    if let Some(child) = process_guard.as_mut() {
        match child.try_wait() {
            Ok(Some(_status)) => {
                // Sunucu kapanmış/çökmüş
                *process_guard = None;
                false
            }
            Ok(None) => true, // Süreç aktif çalışıyor
            Err(_) => false,
        }
    } else {
        // Süreç kaydı yoksa 8085 portuna doğrudan erişmeyi dene
        reqwest::blocking::Client::builder()
            .timeout(std::time::Duration::from_millis(400))
            .build()
            .ok()
            .and_then(|client| client.get("http://127.0.0.1:8085/v1/models").send().ok())
            .map(|r| r.status().is_success())
            .unwrap_or(false)
    }
}

#[derive(serde::Serialize)]
pub struct HardwareInfo {
    cpu_ram_gb: f64,
    gpu_name: String,
    gpu_vram_gb: f64,
    recommended_models: Vec<String>,
}

#[tauri::command]
pub async fn detect_hardware() -> Result<HardwareInfo, String> {
    use std::process::Command;

    // 1. RAM Miktarı
    let mut cpu_ram_gb = 0.0;
    if let Ok(out) = Command::new("powershell")
        .args(&["-NoProfile", "-Command", "(Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory"])
        .output()
    {
        let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
        if let Ok(bytes) = stdout.parse::<f64>() {
            cpu_ram_gb = bytes / (1024.0 * 1024.0 * 1024.0);
        }
    }

    // 2. GPU ve VRAM
    let mut gpu_name = "Bulunamadı".to_string();
    let mut gpu_vram_gb = 0.0;
    
    if let Ok(out) = Command::new("powershell")
        .args(&["-NoProfile", "-Command", "Get-CimInstance Win32_VideoController | Select-Object Name, AdapterRAM | ConvertTo-Json"])
        .output()
    {
        let stdout = String::from_utf8_lossy(&out.stdout).to_string();
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&stdout) {
            let parse_gpu = |v: &serde_json::Value| -> (String, f64) {
                let name = v["Name"].as_str().unwrap_or("").to_string();
                let vram = v["AdapterRAM"].as_f64().unwrap_or(0.0) / (1024.0 * 1024.0 * 1024.0);
                (name, vram)
            };

            if let Some(arr) = json.as_array() {
                // Harici ekran kartını bul (NVIDIA/AMD)
                for item in arr {
                    let (n, v) = parse_gpu(item);
                    if n.to_lowercase().contains("nvidia") || n.to_lowercase().contains("amd") {
                        gpu_name = n;
                        gpu_vram_gb = v;
                        break;
                    }
                }
                if gpu_name == "Bulunamadı" && !arr.is_empty() {
                    let (n, v) = parse_gpu(&arr[0]);
                    gpu_name = n;
                    gpu_vram_gb = v;
                }
            } else if json.is_object() {
                let (n, v) = parse_gpu(&json);
                gpu_name = n;
                gpu_vram_gb = v;
            }
        }
    }

    // 3. Önerilen Modeller (güncel GGUF kataloğu — HuggingFace repo adlarıyla)
    // Kullanıcı bu isimleri HuggingFace Model Tarayıcı'sında doğrudan aratabilir.
    let mut recommended_models = Vec::new();
    
    if gpu_vram_gb >= 20.0 {
        recommended_models.push("Qwen3.8-27B-GGUF (27B — Q6_K, üst düzey Türkçe)".to_string());
        recommended_models.push("unsloth/Qwen3-VL-32B-GGUF (görsel + metin)".to_string());
    } else if gpu_vram_gb >= 12.0 {
        recommended_models.push("lmstudio-community/Qwen3.8-27B-GGUF (27B — Q4_K_M)".to_string());
        recommended_models.push("unsloth/Qwen3-VL-8B-GGUF (8B görsel + metin)".to_string());
    } else if gpu_vram_gb >= 6.0 {
        recommended_models.push("unsloth/Qwen3-14B-GGUF (14B — Q4_K_M)".to_string());
        recommended_models.push("bartowski/Meta-Llama-3.1-8B-Instruct-GGUF".to_string());
    } else if gpu_vram_gb >= 3.5 {
        recommended_models.push("Qwen/Qwen3-8B-GGUF (8B — Q4_K_M hızlı)".to_string());
        recommended_models.push("google/gemma-3-4b-it-GGUF (4B hafif + görsel)".to_string());
    } else {
        if cpu_ram_gb >= 15.0 {
            recommended_models.push("Qwen/Qwen3-8B-GGUF (CPU ile orta hız)".to_string());
            recommended_models.push("bartowski/Phi-3.5-mini-instruct-GGUF (CPU hızlı)".to_string());
        } else {
            recommended_models.push("google/gemma-3-1b-it-GGUF (düşük donanım)".to_string());
            recommended_models.push("Qwen/Qwen3-1.7B-GGUF (düşük donanım)".to_string());
        }
    }

    Ok(HardwareInfo {
        cpu_ram_gb,
        gpu_name,
        gpu_vram_gb,
        recommended_models,
    })
}


#[tauri::command]
pub fn get_local_ai_dir(app: AppHandle) -> Result<String, String> {
    Ok(ai_dir(&app).to_string_lossy().to_string())
}

#[tauri::command]
pub fn list_local_models(app: AppHandle, custom_dir: Option<String>) -> Result<Vec<LocalModelInfo>, String> {
    let mut models = Vec::new();
    let default_dir = ai_dir(&app);
    scan_gguf_files(&default_dir, 1, 0, &mut models);

    if let Some(custom_str) = custom_dir.filter(|s| !s.trim().is_empty()) {
        let custom_path = PathBuf::from(custom_str);
        if custom_path.exists() {
            if custom_path.is_dir() {
                scan_gguf_files(&custom_path, 2, 0, &mut models);
            } else if custom_path.is_file() && custom_path.extension().map_or(false, |e| e.to_string_lossy().to_lowercase() == "gguf") {
                if let Ok(meta) = custom_path.metadata() {
                    let name = custom_path.file_name().unwrap_or_default().to_string_lossy().to_string();
                    let is_vision = name.to_lowercase().contains("mmproj");
                    models.push(LocalModelInfo {
                        name,
                        path: custom_path.to_string_lossy().to_string(),
                        size_bytes: meta.len(),
                        is_vision,
                    });
                }
            }
        }
    }

    models.sort_by(|a, b| a.name.cmp(&b.name));
    models.dedup_by(|a, b| a.path == b.path);

    Ok(models)
}

// ----------- HuggingFace Model Arama ve İndirme (Bionic tarzı) -----------

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct HfModel {
    pub id: String,
    pub downloads: u64,
    pub likes: u32,
    pub pipeline_tag: Option<String>,
    pub tags: Vec<String>,
    pub description: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct HfModelFile {
    pub filename: String,
    pub size_bytes: u64,
    pub download_url: String,
    pub quantization: String,
}

/// HuggingFace'den GGUF modelleri arar (Bionic'in yaptığı gibi)
#[tauri::command]
pub async fn search_hf_models(query: String, limit: Option<u32>) -> Result<Vec<HfModel>, String> {
    let limit = limit.unwrap_or(20);
    let client = reqwest::Client::builder()
        .user_agent("MizanNet/1.0")
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;

    // Bionic'in kullandığı aynı HuggingFace API uç noktası
    let url = if query.trim().is_empty() {
        // Sorgu yoksa en çok indirilen GGUF modellerini listele
        format!(
            "https://huggingface.co/api/models?filter=gguf&sort=downloads&direction=-1&limit={}&full=false",
            limit
        )
    } else {
        format!(
            "https://huggingface.co/api/models?search={}&filter=gguf&sort=downloads&direction=-1&limit={}&full=false",
            urlencoding::encode(&query),
            limit
        )
    };

    let resp = client.get(&url).send().await.map_err(|e| format!("HuggingFace'e bağlanılamadı: {}", e))?;
    let json: Vec<serde_json::Value> = resp.json().await.map_err(|e| format!("Yanıt okunamadı: {}", e))?;

    let models = json.iter().map(|v| {
        let id = v["id"].as_str().unwrap_or("").to_string();
        let downloads = v["downloads"].as_u64().unwrap_or(0);
        let likes = v["likes"].as_u64().unwrap_or(0) as u32;
        let pipeline_tag = v["pipeline_tag"].as_str().map(|s| s.to_string());
        let tags = v["tags"].as_array()
            .map(|arr| arr.iter().filter_map(|t| t.as_str()).map(|s| s.to_string()).collect())
            .unwrap_or_default();
        let description = format!("⬇ {} indirme | ♥ {} beğeni", format_number(downloads), likes);

        HfModel { id, downloads, likes, pipeline_tag, tags, description }
    }).collect();

    Ok(models)
}

/// Belirli bir HuggingFace repo'sunun GGUF dosyalarını listeler
#[tauri::command]
pub async fn get_hf_model_files(repo_id: String) -> Result<Vec<HfModelFile>, String> {
    let client = reqwest::Client::builder()
        .user_agent("MizanNet/1.0")
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;

    let url = format!("https://huggingface.co/api/models/{}", repo_id);
    let resp = client.get(&url).send().await.map_err(|e| format!("HuggingFace'e bağlanılamadı: {}", e))?;
    let json: serde_json::Value = resp.json().await.map_err(|e| format!("Yanıt okunamadı: {}", e))?;

    let siblings = json["siblings"].as_array().cloned().unwrap_or_default();
    
    let files: Vec<HfModelFile> = siblings.iter()
        .filter(|s| {
            s["rfilename"].as_str().map(|f| f.ends_with(".gguf")).unwrap_or(false)
        })
        .map(|s| {
            let filename = s["rfilename"].as_str().unwrap_or("").to_string();
            let size_bytes = s["size"].as_u64().unwrap_or(0);
            let download_url = format!("https://huggingface.co/{}/resolve/main/{}", repo_id, filename);
            let quantization = extract_quantization(&filename);
            HfModelFile { filename, size_bytes, download_url, quantization }
        })
        .collect();

    Ok(files)
}

/// HuggingFace URL'sinden GGUF dosyasını doğrudan indir
#[tauri::command]
pub async fn download_hf_model(
    app: AppHandle,
    download_url: String,
    filename: String,
    custom_dir: Option<String>,
) -> Result<String, String> {
    let dir = if let Some(cd) = custom_dir.filter(|s| !s.trim().is_empty()) {
        let p = PathBuf::from(cd);
        if p.exists() && p.is_dir() {
            p
        } else {
            ai_dir(&app)
        }
    } else {
        ai_dir(&app)
    };
    let dest = dir.join(&filename);
    download_file(&app, &download_url, &dest, &filename).await?;
    Ok(dest.to_string_lossy().to_string())
}

fn format_number(n: u64) -> String {
    if n >= 1_000_000 {
        format!("{:.1}M", n as f64 / 1_000_000.0)
    } else if n >= 1_000 {
        format!("{:.1}K", n as f64 / 1_000.0)
    } else {
        n.to_string()
    }
}

fn extract_quantization(filename: &str) -> String {
    let lower = filename.to_lowercase();
    for q in &["q2_k", "q3_k_m", "q3_k_s", "q4_0", "q4_k_m", "q4_k_s", "q5_0", "q5_k_m", "q6_k", "q8_0", "f16", "f32"] {
        if lower.contains(q) {
            return q.to_uppercase();
        }
    }
    "Standart".to_string()
}

