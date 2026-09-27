//! Ajan araçları: Asistanın bilgisayarı kontrol edebilmesini sağlar.
//! - Terminal komutu çalıştırma (timeout + çıktı sınırı ile)
//! - Dosya/klasör işlemleri (listele, oku, yaz, taşı, kopyala, sil, ara)
//! - Gerçek Excel (.xlsx) ve Word (.docx) dosyası üretimi
//! - Görsel üretimi (Pollinations)
//!
//! Güvenlik: Tüm ajan eylemleri `agent_event` ile sohbete yansıtılır;
//! terminal komutları zaman aşımıyla ve sınırlı çıktıyla çalışır.

use base64::{engine::general_purpose, Engine as _};
use serde::Serialize;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter, State};

use crate::db::DbPool;

const MAX_OUTPUT_BYTES: usize = 64 * 1024; // 64 KB terminal çıktısı sınırı
const COMMAND_TIMEOUT_SECS: u64 = 60;

/// Terminal komut sonucu
#[derive(Debug, Serialize, Clone)]
pub struct CommandResult {
    pub exit_code: Option<i32>,
    pub stdout: String,
    pub stderr: String,
    pub timed_out: bool,
    pub truncated: bool,
}

/// Dosya/klasör giriş bilgisi
#[derive(Debug, Serialize, Clone)]
pub struct DirEntryInfo {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub size_bytes: u64,
    pub modified: Option<String>,
}

// ---------------------------------------------------------------------------
// Sohbet içi ajan etkinliği (frontend'e canlı yayın)
// ---------------------------------------------------------------------------

/// Bir ajan aracının çalıştırıldığını/karar verdiğini sohbete yayınlar.
pub fn emit_agent_event(
    app: &AppHandle,
    session_id: &str,
    tool: &str,
    detail: &str,
    status: &str,
) {
    let _ = app.emit(
        "agent_event",
        serde_json::json!({
            "session_id": session_id,
            "tool": tool,
            "detail": detail,
            "status": status, // "running" | "done" | "error"
        }),
    );
}

// ---------------------------------------------------------------------------
// Yol güvenliği
// ---------------------------------------------------------------------------

/// Yasaklı sistem yolları: bunların altına yazma/silme yapılmaz.
const PROTECTED_PREFIXES: &[&str] = &[
    "C:\\Windows",
    "C:/Windows",
    "C:\\Program Files",
    "C:/Program Files",
    "C:\\Program Files (x86)",
    "C:/Program Files (x86)",
];

fn is_protected_path(path: &Path) -> bool {
    let p = path.to_string_lossy();
    PROTECTED_PREFIXES
        .iter()
        .any(|prefix| p.to_lowercase().starts_with(&prefix.to_lowercase()))
}

/// Kullanıcı masaüstünü döner (dosya kaydetme varsayılan hedefi).
pub fn desktop_dir() -> PathBuf {
    dirs::desktop_dir().unwrap_or_else(|| dirs::home_dir().unwrap_or_else(|| PathBuf::from(".")))
}

// ---------------------------------------------------------------------------
// 1) Terminal komutu çalıştırma
// ---------------------------------------------------------------------------

/// Bir terminal komutunu çalıştırır ve stdout/stderr/exit kodunu döner.
/// Windows'ta cmd, diğerlerinde sh kullanılır. Zaman aşımı 60 sn.
pub fn run_terminal(
    app: &AppHandle,
    session_id: &str,
    command: &str,
    working_dir: Option<&str>,
) -> Result<CommandResult, String> {
    let cmd = command.trim();
    if cmd.is_empty() {
        return Err("Boş komut çalıştırılamaz.".to_string());
    }

    emit_agent_event(app, session_id, "terminal", cmd, "running");

    let mut builder = std::process::Command::new("cmd");
    builder.arg("/C").arg(cmd);
    if let Some(dir) = working_dir {
        builder.current_dir(dir);
    }

    builder.stdin(std::process::Stdio::null());
    builder.stdout(std::process::Stdio::piped());
    builder.stderr(std::process::Stdio::piped());

    let mut child = builder
        .spawn()
        .map_err(|e| format!("Komut başlatılamadı: {}", e))?;

    let deadline = std::time::Instant::now() + std::time::Duration::from_secs(COMMAND_TIMEOUT_SECS);
    let mut timed_out = false;

    // Çıktıyı bekle (basit polling yaklaşımı; child.wait_with_output topluca bekler)
    let mut stdout_handle = child.stdout.take();
    let mut stderr_handle = child.stderr.take();
    let mut stdout_buf: Vec<u8> = Vec::new();
    let mut stderr_buf: Vec<u8> = Vec::new();

    let wait_result = loop {
        match child.try_wait() {
            Ok(Some(status)) => break Ok(Some(status)),
            Ok(None) => {
                // Parça parça okumaya çalış (hazırsa)
                let _ = read_available(&mut stdout_handle, &mut stdout_buf);
                let _ = read_available(&mut stderr_handle, &mut stderr_buf);
                if std::time::Instant::now() > deadline {
                    let _ = child.kill();
                    timed_out = true;
                    break Ok(None);
                }
                std::thread::sleep(std::time::Duration::from_millis(50));
            }
            Err(e) => break Err(e),
        }
    };

    // Kalan çıktıyı topla
    if let Some(ref mut s) = stdout_handle {
        let _ = s.read_to_end(&mut stdout_buf);
    }
    if let Some(ref mut s) = stderr_handle {
        let _ = s.read_to_end(&mut stderr_buf);
    }

    let exit_code = match wait_result {
        Ok(Some(status)) => status.code(),
        _ => None,
    };

    let (stdout, stderr) = (stdout_buf, stderr_buf);
    // Windows cmd UTF-8 döndürmeyebilir; kayıp karakterleri tolere et
    let stdout_str = String::from_utf8_lossy(&stdout).to_string();
    let stderr_str = String::from_utf8_lossy(&stderr).to_string();
    drop(stdout);
    drop(stderr);

    let mut truncated = false;
    let mut clamp = |s: String| -> String {
        if s.len() > MAX_OUTPUT_BYTES {
            truncated = true;
            s[..MAX_OUTPUT_BYTES].to_string()
        } else {
            s
        }
    };

    let result = CommandResult {
        exit_code,
        stdout: clamp(stdout_str),
        stderr: clamp(stderr_str),
        timed_out,
        truncated,
    };

    let summary = format!(
        "exit: {} | stdout: {} | stderr: {}",
        result
            .exit_code
            .map(|c| c.to_string())
            .unwrap_or_else(|| "yok".into()),
        truncate_for_log(&result.stdout),
        truncate_for_log(&result.stderr),
    );
    emit_agent_event(app, session_id, "terminal", &summary, "done");

    Ok(result)
}

fn read_available<R: Read>(reader: &mut Option<R>, buf: &mut Vec<u8>) -> std::io::Result<usize> {
    if let Some(reader) = reader.as_mut() {
        let mut tmp = [0u8; 8192];
        match reader.read(&mut tmp) {
            Ok(0) => Ok(0),
            Ok(n) => {
                buf.extend_from_slice(&tmp[..n]);
                Ok(n)
            }
            Err(e) => Err(e),
        }
    } else {
        Ok(0)
    }
}

fn truncate_for_log(s: &str) -> String {
    if s.len() > 300 {
        format!("{}...", &s[..300])
    } else {
        s.to_string()
    }
}

// ---------------------------------------------------------------------------
// 2) Dosya / klasör işlemleri
// ---------------------------------------------------------------------------

/// Klasör içeriğini listeler.
pub fn list_dir(
    app: &AppHandle,
    session_id: &str,
    path: &str,
) -> Result<Vec<DirEntryInfo>, String> {
    emit_agent_event(app, session_id, "list_dir", path, "running");

    let mut out = Vec::new();
    let entries = std::fs::read_dir(path).map_err(|e| format!("Klasör okunamadı: {}", e))?;
    for entry in entries.flatten() {
        let meta = entry.metadata().ok();
        let modified = meta
            .as_ref()
            .and_then(|m| m.modified().ok())
            .map(|t| {
                chrono::DateTime::<chrono::Local>::from(t)
                    .format("%Y-%m-%d %H:%M:%S")
                    .to_string()
            });
        out.push(DirEntryInfo {
            name: entry.file_name().to_string_lossy().to_string(),
            path: entry.path().to_string_lossy().to_string(),
            is_directory: meta.as_ref().map(|m| m.is_dir()).unwrap_or(false),
            size_bytes: meta.as_ref().map(|m| m.len()).unwrap_or(0),
            modified,
        });
    }
    out.sort_by(|a, b| b.is_directory.cmp(&a.is_directory).then(a.name.cmp(&b.name)));

    emit_agent_event(
        app,
        session_id,
        "list_dir",
        &format!("{} ({})", path, out.len()),
        "done",
    );
    Ok(out)
}

/// Dosya içeriğini okur (metin dosyaları; ikili dosyalarda uyarı döner).
pub fn read_file(
    app: &AppHandle,
    session_id: &str,
    path: &str,
) -> Result<String, String> {
    emit_agent_event(app, session_id, "read_file", path, "running");

    let meta = std::fs::metadata(path).map_err(|e| format!("Dosya bulunamadı: {}", e))?;
    if meta.is_dir() {
        return Err("Bu bir klasör; read_file yerine list_dir kullanın.".to_string());
    }
    if meta.len() > 2 * 1024 * 1024 {
        return Err(format!(
            "Dosya çok büyük ({} KB). Yalnızca 2 MB altındaki dosyalar okunabilir.",
            meta.len() / 1024
        ));
    }

    let bytes = std::fs::read(path).map_err(|e| format!("Dosya okuma hatası: {}", e))?;
    let text = String::from_utf8_lossy(&bytes).to_string();

    emit_agent_event(
        app,
        session_id,
        "read_file",
        &format!("{} ({} B)", path, meta.len()),
        "done",
    );
    Ok(text)
}

/// Dosyaya yazar (üst dizinleri otomatik oluşturur).
pub fn write_file_tool(
    app: &AppHandle,
    session_id: &str,
    path: &str,
    content: &str,
) -> Result<String, String> {
    let p = Path::new(path);
    if is_protected_path(p) {
        return Err("Güvenlik nedeniyle sistem klasörlerine yazılamaz.".to_string());
    }
    emit_agent_event(app, session_id, "write_file", path, "running");

    if let Some(parent) = p.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("Klasör oluşturulamadı: {}", e))?;
    }
    std::fs::write(p, content).map_err(|e| format!("Dosya yazma hatası: {}", e))?;

    emit_agent_event(app, session_id, "write_file", path, "done");
    Ok(format!("Dosya kaydedildi: {}", path))
}

/// Dosya veya klasör taşır (yeniden adlandırma dahil).
pub fn move_path(
    app: &AppHandle,
    session_id: &str,
    source: &str,
    destination: &str,
) -> Result<String, String> {
    let src = Path::new(source);
    let dst = Path::new(destination);
    if !src.exists() {
        return Err(format!("Kaynak bulunamadı: {}", source));
    }
    if is_protected_path(src) || is_protected_path(dst) {
        return Err("Güvenlik nedeniyle sistem klasörleri üzerinde işlem yapılamaz.".to_string());
    }
    emit_agent_event(
        app,
        session_id,
        "move",
        &format!("{} -> {}", source, destination),
        "running",
    );

    if let Some(parent) = dst.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("Hedef klasörü oluşturulamadı: {}", e))?;
    }
    std::fs::rename(src, dst).map_err(|e| format!("Taşıma hatası: {}", e))?;

    emit_agent_event(
        app,
        session_id,
        "move",
        &format!("{} -> {}", source, destination),
        "done",
    );
    Ok(format!("Taşındı: {} -> {}", source, destination))
}

/// Dosya veya klasörü kopyalar.
pub fn copy_path(
    app: &AppHandle,
    session_id: &str,
    source: &str,
    destination: &str,
) -> Result<String, String> {
    let src = Path::new(source);
    let dst = Path::new(destination);
    if !src.exists() {
        return Err(format!("Kaynak bulunamadı: {}", source));
    }
    if is_protected_path(src) || is_protected_path(dst) {
        return Err("Güvenlik nedeniyle sistem klasörleri üzerinde işlem yapılamaz.".to_string());
    }
    emit_agent_event(
        app,
        session_id,
        "copy",
        &format!("{} -> {}", source, destination),
        "running",
    );

    if src.is_dir() {
        copy_dir_recursive(src, dst).map_err(|e| format!("Klasör kopyalama hatası: {}", e))?;
    } else {
        if let Some(parent) = dst.parent() {
            std::fs::create_dir_all(parent).map_err(|e| format!("Hedef klasörü oluşturulamadı: {}", e))?;
        }
        std::fs::copy(src, dst).map_err(|e| format!("Dosya kopyalama hatası: {}", e))?;
    }

    emit_agent_event(
        app,
        session_id,
        "copy",
        &format!("{} -> {}", source, destination),
        "done",
    );
    Ok(format!("Kopyalandı: {} -> {}", source, destination))
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> std::io::Result<()> {
    std::fs::create_dir_all(dst)?;
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let target = dst.join(entry.file_name());
        if entry.path().is_dir() {
            copy_dir_recursive(&entry.path(), &target)?;
        } else {
            std::fs::copy(entry.path(), &target)?;
        }
    }
    Ok(())
}

/// Dosya veya klasörü siler (geri dönüşüm kutusuna değil, kalıcı silme).
pub fn delete_path(
    app: &AppHandle,
    session_id: &str,
    path: &str,
) -> Result<String, String> {
    let p = Path::new(path);
    if !p.exists() {
        return Err(format!("Bulunamadı: {}", path));
    }
    if is_protected_path(p) {
        return Err("Güvenlik nedeniyle sistem klasörleri silinemez.".to_string());
    }
    emit_agent_event(app, session_id, "delete", path, "running");

    if p.is_dir() {
        let count = count_entries(p);
        std::fs::remove_dir_all(p).map_err(|e| format!("Klasör silme hatası: {}", e))?;
        emit_agent_event(app, session_id, "delete", path, "done");
        Ok(format!("Klasör silindi ({} öğe): {}", count, path))
    } else {
        std::fs::remove_file(p).map_err(|e| format!("Dosya silme hatası: {}", e))?;
        emit_agent_event(app, session_id, "delete", path, "done");
        Ok(format!("Dosya silindi: {}", path))
    }
}

fn count_entries(dir: &Path) -> usize {
    let mut n = 0;
    if let Ok(entries) = std::fs::read_dir(dir) {
        for e in entries.flatten() {
            n += 1;
            if e.path().is_dir() {
                n += count_entries(&e.path());
            }
        }
    }
    n
}

/// Belirli bir klasörde ada göre arama yapar (alt klasörler dahil, en fazla 200 sonuç).
pub fn search_files(
    app: &AppHandle,
    session_id: &str,
    root: &str,
    pattern: &str,
) -> Result<Vec<String>, String> {
    emit_agent_event(
        app,
        session_id,
        "search_files",
        &format!("{} :: {}", root, pattern),
        "running",
    );

    let needle = pattern.to_lowercase();
    let mut results = Vec::new();
    search_recursive(Path::new(root), &needle, &mut results, 0);

    emit_agent_event(
        app,
        session_id,
        "search_files",
        &format!("{} :: {} ({} sonuç)", root, pattern, results.len()),
        "done",
    );
    Ok(results)
}

fn search_recursive(dir: &Path, needle: &str, results: &mut Vec<String>, depth: usize) {
    if depth > 6 || results.len() >= 200 {
        return;
    }
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_lowercase();
            let path_str = entry.path().to_string_lossy().to_string();
            if name.contains(needle) {
                results.push(path_str.clone());
            }
            if entry.path().is_dir() {
                search_recursive(&entry.path(), needle, results, depth + 1);
            }
        }
    }
}

// ---------------------------------------------------------------------------
// 3) Excel (.xlsx) üretimi
// ---------------------------------------------------------------------------

/// 2 boyutlu tabloyu gerçek .xlsx dosyası olarak kaydeder.
pub fn generate_excel(
    app: &AppHandle,
    session_id: &str,
    file_name: &str,
    rows: Vec<Vec<serde_json::Value>>,
    sheet_name: Option<String>,
) -> Result<String, String> {
    let (name, target) = resolve_save_target(file_name, ".xlsx")?;
    let _ = &name;

    emit_agent_event(app, session_id, "excel", &format!("{} ({} satır)", target.to_string_lossy(), rows.len()), "running");

    let mut workbook = rust_xlsxwriter::Workbook::new();
    let sheet = workbook.add_worksheet();
    sheet
        .set_name(sheet_name.unwrap_or_else(|| "Sayfa1".to_string()))
        .map_err(|e| format!("Sayfa adı hatası: {}", e))?;

    // Başlık satırını kalın yap
    let bold = rust_xlsxwriter::Format::new().set_bold();

    for (r, row) in rows.iter().enumerate() {
        for (c, value) in row.iter().enumerate() {
            let write_res = match value {
                serde_json::Value::Number(n) => {
                    if let Some(i) = n.as_i64() {
                        sheet.write(r as u32, c as u16, i)
                    } else if let Some(f) = n.as_f64() {
                        sheet.write(r as u32, c as u16, f)
                    } else {
                        sheet.write(r as u32, c as u16, n.to_string())
                    }
                }
                serde_json::Value::String(s) => sheet.write(r as u32, c as u16, s.as_str()),
                serde_json::Value::Bool(b) => sheet.write(r as u32, c as u16, *b),
                serde_json::Value::Null => sheet.write(r as u32, c as u16, ""),
                other => sheet.write(r as u32, c as u16, other.to_string().as_str()),
            };
            write_res.map_err(|e| format!("Hücre yazma hatası: {}", e))?;
        }
    }

    // Başlık satırını kalın yaz (ikinci geçiş: üzerine kalın formatta yaz)
    if !rows.is_empty() {
        for (c, value) in rows[0].iter().enumerate() {
            let text = match value {
                serde_json::Value::String(s) => s.clone(),
                serde_json::Value::Null => String::new(),
                other => other.to_string(),
            };
            let _ = sheet.write_with_format(0, c as u16, text.as_str(), &bold);
        }
    }

    // Sütun genişliklerini otomatik ayarla
    sheet.autofit();
    workbook
        .save(&target)
        .map_err(|e| format!("Excel kaydedilemedi: {}", e))?;

    emit_agent_event(app, session_id, "excel", &target.to_string_lossy(), "done");
    Ok(format!("Excel dosyası oluşturuldu: {}", target.display()))
}

// ---------------------------------------------------------------------------
// 4) Word (.docx) üretimi
// ---------------------------------------------------------------------------

/// Markdown benzeri metni gerçek .docx dosyası olarak kaydeder.
/// Desteklenen satır biçimleri: "# Başlık", "## Alt Başlık", "- liste", normal paragraf.
pub fn generate_word(
    app: &AppHandle,
    session_id: &str,
    file_name: &str,
    content: &str,
) -> Result<String, String> {
    let (name, target) = resolve_save_target(file_name, ".docx")?;
    let _ = &name;

    emit_agent_event(app, session_id, "word", &target.to_string_lossy(), "running");

    let doc_bytes = docx_from_markdown(content);
    std::fs::write(&target, doc_bytes)
        .map_err(|e| format!("Word dosyası kaydedilemedi: {}", e))?;

    emit_agent_event(app, session_id, "word", &target.to_string_lossy(), "done");
    Ok(format!("Word dosyası oluşturuldu: {}", target.display()))
}

fn resolve_save_target(file_name: &str, default_ext: &str) -> Result<(String, PathBuf), String> {
    let mut name = file_name.trim().to_string();
    if name.is_empty() {
        name = format!("mizannet_rapor{}", default_ext);
    }
    if !name.to_lowercase().ends_with(default_ext) {
        name.push_str(default_ext);
    }
    // Yol içeriği mi yoksa sadece dosya adı mı?
    let target: PathBuf = if name.contains('\\') || name.contains('/') {
        PathBuf::from(&name)
    } else {
        desktop_dir().join(&name)
    };
    Ok((name, target))
}

// ---------------------------------------------------------------------------
// 5) Görsel üretimi (Pollinations ücretsiz API)
// ---------------------------------------------------------------------------

/// Metin komutundan görsel üretir ve masaüstüne kaydeder.
pub fn generate_image_tool(
    app: &AppHandle,
    session_id: &str,
    prompt: &str,
    file_name: &str,
) -> Result<String, String> {
    let (_, target) = resolve_save_target(file_name, ".jpg")?;
    emit_agent_event(app, session_id, "gorsel", prompt, "running");

    let encoded = urlencoding::encode(prompt);
    let url = format!(
        "https://image.pollinations.ai/prompt/{}?width=1024&height=1024&nologo=true",
        encoded
    );

    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| format!("Client hatası: {}", e))?;
    let resp = client
        .get(&url)
        .send()
        .map_err(|e| format!("Görsel servisine bağlanılamadı: {}", e))?;
    if !resp.status().is_success() {
        return Err(format!("Görsel servisi hata döndürdü: {}", resp.status()));
    }
    let bytes = resp
        .bytes()
        .map_err(|e| format!("Görsel verisi okunamadı: {}", e))?;
    std::fs::write(&target, &bytes).map_err(|e| format!("Görsel kaydedilemedi: {}", e))?;

    emit_agent_event(app, session_id, "gorsel", &target.to_string_lossy(), "done");
    Ok(format!("Görsel oluşturuldu: {}", target.to_string_lossy()))
}

// ---------------------------------------------------------------------------
// 6) Veritabanı sorguları (SELECT-only okuma, güvenli yazma)
// ---------------------------------------------------------------------------

/// Yalnızca SELECT sorgusu çalıştırır.
pub fn query_database(pool: &DbPool, sql: &str) -> Result<Vec<serde_json::Map<String, serde_json::Value>>, String> {
    if !sql.trim().to_lowercase().starts_with("select") {
        return Err("Yalnızca SELECT sorguları desteklenir.".to_string());
    }
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let cols: Vec<String> = stmt.column_names().into_iter().map(|s| s.to_string()).collect();
    let mut rows = stmt.query([]).map_err(|e| e.to_string())?;
    let mut results = Vec::new();
    while let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let mut map = serde_json::Map::new();
        for (i, col) in cols.iter().enumerate() {
            let val: rusqlite::types::Value = row.get(i).unwrap_or(rusqlite::types::Value::Null);
            let json = match val {
                rusqlite::types::Value::Null => serde_json::Value::Null,
                rusqlite::types::Value::Integer(n) => serde_json::json!(n),
                rusqlite::types::Value::Real(f) => serde_json::json!(f),
                rusqlite::types::Value::Text(t) => serde_json::json!(t),
                rusqlite::types::Value::Blob(_) => serde_json::json!("<blob>"),
            };
            map.insert(col.clone(), json);
        }
        results.push(map);
    }
    Ok(results)
}

/// INSERT/UPDATE/DELETE çalıştırır; DROP/ALTER/CREATE engellenir.
pub fn write_database(pool: &DbPool, sql: &str) -> Result<usize, String> {
    let t = sql.trim().to_lowercase();
    if t.starts_with("drop") || t.starts_with("alter") || t.starts_with("create") || t.starts_with("attach") {
        return Err("DROP, ALTER, CREATE ve ATTACH güvenlik nedeniyle engellendi.".to_string());
    }
    if !(t.starts_with("insert") || t.starts_with("update") || t.starts_with("delete")) {
        return Err("Yalnızca INSERT, UPDATE veya DELETE desteklenir.".to_string());
    }
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    conn.execute(sql, []).map_err(|e| e.to_string())
}

// ---------------------------------------------------------------------------
// 7) Dosya indirme (base64 → disk) — sohbetteki dosya önizlemeleri için
// ---------------------------------------------------------------------------

/// Base64 veriyi diskteki hedef yola kaydeder (sohbette üretilen dosyalar için).
pub fn save_base64_file(
    app: &AppHandle,
    session_id: &str,
    file_name: &str,
    data_base64: &str,
) -> Result<String, String> {
    let (_, target) = resolve_save_target(file_name, ".bin")?;
    emit_agent_event(app, session_id, "dosya", file_name, "running");

    let bytes = general_purpose::STANDARD
        .decode(data_base64)
        .map_err(|e| format!("Base64 çözülemedi: {}", e))?;
    if let Some(parent) = target.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    std::fs::write(&target, &bytes).map_err(|e| format!("Dosya yazılamadı: {}", e))?;

    emit_agent_event(app, session_id, "dosya", &target.to_string_lossy(), "done");
    Ok(target.to_string_lossy().to_string())
}

// ---------------------------------------------------------------------------
// Word (.docx) üretim yardımcıları — zip + minimal OOXML
// ---------------------------------------------------------------------------

/// Markdown benzeri metni minimal ve geçerli bir .docx paketine çevirir.
fn docx_from_markdown(content: &str) -> Vec<u8> {
    let mut body = String::new();
    for line in content.lines() {
        let line = line.trim_end();
        let (xml, style) = if line.starts_with("## ") {
            (escape_xml(line[3..].trim()), "Heading2")
        } else if line.starts_with("# ") {
            (escape_xml(line[2..].trim()), "Heading1")
        } else if line.starts_with("### ") {
            (escape_xml(line[4..].trim()), "Heading3")
        } else if line.starts_with("- ") || line.starts_with("* ") {
            (escape_xml(line[2..].trim()), "ListParagraph")
        } else if line.is_empty() {
            (String::new(), "Normal")
        } else {
            (escape_xml(line), "Normal")
        };

        if line.is_empty() {
            body.push_str("<w:p/>");
            continue;
        }

        if style == "ListParagraph" {
            body.push_str(&format!(
                "<w:p><w:pPr><w:ind w:left=\"420\"/></w:pPr><w:r><w:t xml:space=\"preserve\">• {}</w:t></w:r></w:p>",
                xml
            ));
        } else if style == "Normal" {
            body.push_str(&format!(
                "<w:p><w:r><w:t xml:space=\"preserve\">{}</w:t></w:r></w:p>",
                xml
            ));
        } else {
            let size = if style == "Heading1" { "56" } else if style == "Heading2" { "40" } else { "32" };
            body.push_str(&format!(
                "<w:p><w:r><w:rPr><w:b/><w:sz w:val=\"{}\"/></w:rPr><w:t xml:space=\"preserve\">{}</w:t></w:r></w:p>",
                size, xml
            ));
        }
    }

    let document_xml = format!(
        r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>{}</w:body>
</w:document>"#,
        body
    );

    let content_types = r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>"#;

    let root_rels = r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>"#;

    let doc_rels = r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>"#;

    let styles_xml = r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/></w:style>
</w:styles>"#;

    let mut zip_buf = std::io::Cursor::new(Vec::new());
    {
        let mut zip = zip::ZipWriter::new(&mut zip_buf);
        let options: zip::write::SimpleFileOptions = zip::write::SimpleFileOptions::default();
        let _ = zip.start_file("[Content_Types].xml", options);
        let _ = zip.write_all(content_types.as_bytes());
        let _ = zip.start_file("_rels/.rels", options);
        let _ = zip.write_all(root_rels.as_bytes());
        let _ = zip.start_file("word/document.xml", options);
        let _ = zip.write_all(document_xml.as_bytes());
        let _ = zip.start_file("word/_rels/document.xml.rels", options);
        let _ = zip.write_all(doc_rels.as_bytes());
        let _ = zip.start_file("word/styles.xml", options);
        let _ = zip.write_all(styles_xml.as_bytes());
        let _ = zip.finish();
    }
    zip_buf.into_inner()
}

fn escape_xml(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

// ---------------------------------------------------------------------------
// Tauri komut sarmalayıcıları (frontend doğrudan da kullanabilir)
// ---------------------------------------------------------------------------

fn session_or_default(session_id: Option<String>) -> String {
    session_id.unwrap_or_else(|| "cmd".to_string())
}

#[tauri::command]
pub fn agent_run_terminal(
    app: AppHandle,
    command: String,
    working_dir: Option<String>,
    session_id: Option<String>,
) -> Result<CommandResult, String> {
    run_terminal(&app, &session_or_default(session_id), &command, working_dir.as_deref())
}

#[tauri::command]
pub fn agent_list_dir(
    app: AppHandle,
    path: String,
    session_id: Option<String>,
) -> Result<Vec<DirEntryInfo>, String> {
    list_dir(&app, &session_or_default(session_id), &path)
}

#[tauri::command]
pub fn agent_read_file(
    app: AppHandle,
    path: String,
    session_id: Option<String>,
) -> Result<String, String> {
    read_file(&app, &session_or_default(session_id), &path)
}

#[tauri::command]
pub fn agent_write_file(
    app: AppHandle,
    path: String,
    content: String,
    session_id: Option<String>,
) -> Result<String, String> {
    write_file_tool(&app, &session_or_default(session_id), &path, &content)
}

#[tauri::command]
pub fn agent_move_path(
    app: AppHandle,
    source: String,
    destination: String,
    session_id: Option<String>,
) -> Result<String, String> {
    move_path(&app, &session_or_default(session_id), &source, &destination)
}

#[tauri::command]
pub fn agent_copy_path(
    app: AppHandle,
    source: String,
    destination: String,
    session_id: Option<String>,
) -> Result<String, String> {
    copy_path(&app, &session_or_default(session_id), &source, &destination)
}

#[tauri::command]
pub fn agent_delete_path(
    app: AppHandle,
    path: String,
    session_id: Option<String>,
) -> Result<String, String> {
    delete_path(&app, &session_or_default(session_id), &path)
}

#[tauri::command]
pub fn agent_search_files(
    app: AppHandle,
    root: String,
    pattern: String,
    session_id: Option<String>,
) -> Result<Vec<String>, String> {
    search_files(&app, &session_or_default(session_id), &root, &pattern)
}

#[tauri::command]
pub fn agent_generate_excel(
    app: AppHandle,
    pool: State<DbPool>,
    file_name: String,
    rows: Vec<Vec<serde_json::Value>>,
    sheet_name: Option<String>,
    session_id: Option<String>,
) -> Result<String, String> {
    let _ = pool; // ileride doğrudan DB rapor üretimi için
    generate_excel(&app, &session_or_default(session_id), &file_name, rows, sheet_name)
}

#[tauri::command]
pub fn agent_generate_word(
    app: AppHandle,
    file_name: String,
    content: String,
    session_id: Option<String>,
) -> Result<String, String> {
    generate_word(&app, &session_or_default(session_id), &file_name, &content)
}

#[tauri::command]
pub fn agent_generate_image(
    app: AppHandle,
    prompt: String,
    file_name: String,
    session_id: Option<String>,
) -> Result<String, String> {
    generate_image_tool(&app, &session_or_default(session_id), &prompt, &file_name)
}

#[tauri::command]
pub fn agent_open_path(app: AppHandle, path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err("Dosya veya klasör bulunamadı.".to_string());
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Açılamadı: {}", e))?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Açılamadı: {}", e))?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Açılamadı: {}", e))?;
    }
    Ok(())
}
