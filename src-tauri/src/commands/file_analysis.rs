use crate::ai;
use crate::db::DbPool;
use base64::Engine;
use calamine::Reader;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct FileAnalysis {
    pub entity_type: String, // "company" | "product" | "invoice" | "vehicle" | "worker" | "tax_item" | "document"
    pub items: Vec<serde_json::Value>,
    pub summary: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ImportResult {
    pub imported: usize,
    pub entity_type: String,
}

fn decode_base64(data: &str) -> Result<Vec<u8>, String> {
    base64::engine::general_purpose::STANDARD
        .decode(data)
        .map_err(|e| format!("Dosya verisi çözülemedi: {}", e))
}

fn mime_from_name(file_name: &str) -> &'static str {
    let lower = file_name.to_lowercase();
    if lower.ends_with(".png") {
        "image/png"
    } else if lower.ends_with(".jpg") || lower.ends_with(".jpeg") {
        "image/jpeg"
    } else if lower.ends_with(".webp") {
        "image/webp"
    } else if lower.ends_with(".pdf") {
        "application/pdf"
    } else if lower.ends_with(".docx") {
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    } else if lower.ends_with(".xlsx") {
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    } else {
        "application/octet-stream"
    }
}

/// PDF'den metin çıkarır.
fn extract_pdf_text(bytes: &[u8]) -> Result<String, String> {
    let temp_dir = std::env::temp_dir();
    let temp_file = temp_dir.join(format!("mizannet_analyze_{}.pdf", uuid::Uuid::new_v4()));
    std::fs::write(&temp_file, bytes).map_err(|e| e.to_string())?;

    let result = pdf_extract::extract_text(&temp_file).map_err(|e| format!("PDF okunamadı: {}", e));
    std::fs::remove_file(&temp_file).ok();
    result
}

/// DOCX'ten metin çıkarır (zip içindeki word/document.xml).
fn extract_docx_text(bytes: &[u8]) -> Result<String, String> {
    let cursor = std::io::Cursor::new(bytes.to_vec());
    let mut archive = zip::ZipArchive::new(cursor).map_err(|e| format!("DOCX açılamadı: {}", e))?;

    let mut doc = archive
        .by_name("word/document.xml")
        .map_err(|e| format!("DOCX içeriği okunamadı: {}", e))?;

    let mut xml = String::new();
    std::io::Read::read_to_string(&mut doc, &mut xml)
        .map_err(|e| format!("DOCX XML okunamadı: {}", e))?;

    // <w:t> etiketlerinin içeriğini topla
    let mut text = String::new();
    for part in xml.split("<w:t") {
        if let Some(start) = part.find('>') {
            let content = &part[start + 1..];
            if let Some(end) = content.find("</w:t>") {
                text.push_str(&content[..end]);
                text.push(' ');
            }
        }
    }

    if text.trim().is_empty() {
        return Err("DOCX içinde metin bulunamadı.".to_string());
    }
    Ok(text)
}

/// XLSX'ten hücreleri metin olarak çıkarır.
fn extract_xlsx_text(bytes: &[u8]) -> Result<String, String> {
    let cursor = std::io::Cursor::new(bytes.to_vec());
    let mut workbook: calamine::Xlsx<_> =
        calamine::open_workbook_from_rs(cursor).map_err(|e| format!("XLSX açılamadı: {}", e))?;

    let mut output = String::new();
    let sheet_names = workbook.sheet_names().to_vec();

    for name in sheet_names {
        if let Ok(range) = workbook.worksheet_range(&name) {
            output.push_str(&format!("--- Sayfa: {} ---\n", name));
            for row in range.rows() {
                let cells: Vec<String> = row
                    .iter()
                    .map(|c| match c {
                        calamine::Data::String(s) => s.clone(),
                        calamine::Data::Float(f) => f.to_string(),
                        calamine::Data::Int(i) => i.to_string(),
                        calamine::Data::Bool(b) => b.to_string(),
                        calamine::Data::DateTime(d) => d.to_string(),
                        calamine::Data::DateTimeIso(d) => d.to_string(),
                        calamine::Data::DurationIso(d) => d.to_string(),
                        calamine::Data::Error(e) => format!("HATA:{}", e),
                        calamine::Data::Empty => String::new(),
                    })
                    .collect();
                output.push_str(&cells.join("\t"));
                output.push('\n');
            }
        }
    }

    if output.trim().is_empty() {
        return Err("XLSX içinde veri bulunamadı.".to_string());
    }
    Ok(output)
}

/// Yüklenen dosyayı çözümler ve yapılandırılmış veriye dönüştürür.
#[tauri::command]
pub fn analyze_file(
    pool: State<DbPool>,
    file_data: String,
    file_name: String,
) -> Result<FileAnalysis, String> {
    let bytes = decode_base64(&file_data)?;
    let mime = mime_from_name(&file_name);
    let lower = file_name.to_lowercase();

    let analysis_prompt = "Aşağıdaki belge/görsel bir maden işletmesinin verilerini içeriyor olabilir. \
        İçeriği incele ve şu varlık türlerinden hangisine uyduğunu belirle: \
        company (firma), product (ürün), invoice (fatura), vehicle (araç), worker (çalışan), \
        tax_item (vergi), document (belge), ledger_entry (borç/alacak cari hareket). \
        SADECE geçerli JSON döndür, başka hiçbir metin yazma. Format: \
        {\"entity_type\": \"...\", \"items\": [ {varlık alanları} ], \"summary\": \"kısa Türkçe özet\"}. \
        Eğer ledger_entry ise şu alanları kullan: company_id (işletme bağlamında veya resimde eşleşen firmanın id'si), date, debit (borç miktarı f64), credit (alacak miktarı f64), description. \
        Eğer veri bir varlık listesi değilse entity_type olarak 'document' kullan ve items'a tek bir \
        kayıt koy: {\"title\": \"...\", \"category\": \"...\", \"notes\": \"içerik özeti\"}.";

    // Görsel dosyalar vision ile analiz edilir
    let extracted = if mime.starts_with("image/") {
        let base64_str = base64::engine::general_purpose::STANDARD.encode(&bytes);
        ai::ai_chat_with_image(&pool, analysis_prompt, &base64_str, mime)?
    } else {
        let text = if lower.ends_with(".pdf") {
            extract_pdf_text(&bytes)?
        } else if lower.ends_with(".docx") {
            extract_docx_text(&bytes)?
        } else if lower.ends_with(".xlsx") {
            extract_xlsx_text(&bytes)?
        } else {
            return Err(format!(
                "Desteklenmeyen dosya türü: {}. Desteklenen: görsel (png/jpg/webp), PDF, DOCX, XLSX.",
                file_name
            ));
        };

        let messages = vec![
            ai::ChatMessage {
                role: "system".to_string(),
                content: "Sen belge çözümleme uzmanısın. SADECE geçerli JSON döndürürsün.".to_string(),
            },
            ai::ChatMessage {
                role: "user".to_string(),
                content: format!("{}\n\nBELGE İÇERİÄİ:\n{}", analysis_prompt, text),
            },
        ];
        ai::ai_chat(&pool, &messages)?
    };

    // AI yanıtından JSON'u ayıkla (```json ... ``` sarmalayıcılarına karşı dayanıklı)
    let json_str = extract_json(&extracted)?;
    let parsed: serde_json::Value =
        serde_json::from_str(&json_str).map_err(|e| format!("AI yanıtı JSON değil: {}", e))?;

    let entity_type = parsed
        .get("entity_type")
        .and_then(|v| v.as_str())
        .unwrap_or("document")
        .to_string();

    let items = parsed
        .get("items")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    let summary = parsed
        .get("summary")
        .and_then(|v| v.as_str())
        .unwrap_or("Çözümleme tamamlandı.")
        .to_string();

    Ok(FileAnalysis {
        entity_type,
        items,
        summary,
    })
}

fn extract_json(text: &str) -> Result<String, String> {
    let trimmed = text.trim();
    // ```json ... ``` sarmalayıcısı varsa içini al
    if let Some(start) = trimmed.find('{') {
        if let Some(end) = trimmed.rfind('}') {
            if end > start {
                return Ok(trimmed[start..=end].to_string());
            }
        }
    }
    Err("AI yanıtında JSON bulunamadı.".to_string())
}

/// Toplu fiş/görsel analiz: birden fazla dosyayı sırayla analiz eder.
/// Her dosya bağımsız analiz edilir; başarısız olanlar hata listesinde döner.
#[tauri::command]
pub fn analyze_files_batch(
    pool: State<DbPool>,
    files: Vec<BatchFileInput>,
) -> Result<BatchAnalysisResult, String> {
    let mut results: Vec<BatchFileResult> = Vec::new();

    for f in &files {
        match analyze_file(pool.clone(), f.file_data.clone(), f.file_name.clone()) {
            Ok(analysis) => results.push(BatchFileResult {
                file_name: f.file_name.clone(),
                success: true,
                error: None,
                analysis: Some(analysis),
            }),
            Err(e) => results.push(BatchFileResult {
                file_name: f.file_name.clone(),
                success: false,
                error: Some(e),
                analysis: None,
            }),
        }
    }

    let success_count = results.iter().filter(|r| r.success).count();
    Ok(BatchAnalysisResult { results, success_count, total: files.len() })
}

#[derive(Debug, Deserialize)]
pub struct BatchFileInput {
    pub file_data: String,
    pub file_name: String,
}

#[derive(Debug, Serialize)]
pub struct BatchFileResult {
    pub file_name: String,
    pub success: bool,
    pub error: Option<String>,
    pub analysis: Option<FileAnalysis>,
}

#[derive(Debug, Serialize)]
pub struct BatchAnalysisResult {
    pub results: Vec<BatchFileResult>,
    pub success_count: usize,
    pub total: usize,
}

/// Onaylanan çözümleme sonucunu veritabanına aktarır.
#[tauri::command]
pub fn import_analyzed_data(
    pool: State<DbPool>,
    entity_type: String,
    items: Vec<serde_json::Value>,
) -> Result<ImportResult, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let mut imported = 0usize;

    for item in items {
        let ok = match entity_type.as_str() {
            "company" => insert_company(&conn, &item, &now),
            "product" => insert_product(&conn, &item, &now),
            "invoice" => insert_invoice(&conn, &item, &now),
            "vehicle" => insert_vehicle(&conn, &item, &now),
            "worker" => insert_worker(&conn, &item, &now),
            "tax_item" => insert_tax_item(&conn, &item, &now),
            "document" => insert_document(&conn, &item, &now),
            "ledger_entry" => insert_ledger_entry(&conn, &item, &now),
            other => Err(format!("Bilinmeyen varlık türü: {}", other)),
        };
        if ok.is_ok() {
            imported += 1;
        }
    }

    Ok(ImportResult {
        imported,
        entity_type,
    })
}

fn get_str<'a>(item: &'a serde_json::Value, key: &str) -> Option<String> {
    item.get(key)
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .filter(|s| !s.trim().is_empty())
}

fn get_f64(item: &serde_json::Value, key: &str) -> f64 {
    item.get(key)
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0)
}

fn insert_company(
    conn: &rusqlite::Connection,
    item: &serde_json::Value,
    now: &str,
) -> Result<(), String> {
    let name = get_str(item, "name")
        .or_else(|| get_str(item, "firma_adi"))
        .or_else(|| get_str(item, "company_name"))
        .ok_or("Firma adı eksik")?;
    let id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO companies (id, name, tax_no, phone, email, contact_person, balance, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7)",
        rusqlite::params![
            id,
            name,
            get_str(item, "tax_no").or_else(|| get_str(item, "vkn")),
            get_str(item, "phone").or_else(|| get_str(item, "telefon")),
            get_str(item, "email"),
            get_str(item, "contact_person").or_else(|| get_str(item, "yetkili")),
            now
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn insert_product(
    conn: &rusqlite::Connection,
    item: &serde_json::Value,
    now: &str,
) -> Result<(), String> {
    let name = get_str(item, "name")
        .or_else(|| get_str(item, "urun_adi"))
        .or_else(|| get_str(item, "product_name"))
        .ok_or("Ürün adı eksik")?;
    let id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO products (id, name, sku, category, unit, purchase_price, sale_price, min_stock, current_stock, supplier, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        rusqlite::params![
            id,
            name,
            get_str(item, "sku"),
            get_str(item, "category").or_else(|| get_str(item, "kategori")),
            get_str(item, "unit").or_else(|| get_str(item, "birim")),
            get_f64(item, "purchase_price"),
            get_f64(item, "sale_price"),
            get_f64(item, "min_stock"),
            get_f64(item, "current_stock"),
            get_str(item, "supplier").or_else(|| get_str(item, "tedarikci")),
            now
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn insert_invoice(
    conn: &rusqlite::Connection,
    item: &serde_json::Value,
    now: &str,
) -> Result<(), String> {
    let mut company_id = get_str(item, "company_id");
    
    // Firma ID yoksa adından bul veya oluştur
    if company_id.is_none() {
        if let Some(c_name) = get_str(item, "company_name").or_else(|| get_str(item, "firma")) {
            let id: Result<String, _> = conn.query_row(
                "SELECT id FROM companies WHERE name LIKE ?1 LIMIT 1",
                rusqlite::params![format!("%{}%", c_name)],
                |r| r.get(0),
            );
            match id {
                Ok(i) => company_id = Some(i),
                Err(_) => {
                    let new_id = uuid::Uuid::new_v4().to_string();
                    let _ = conn.execute(
                        "INSERT INTO companies (id, name, type, balance, created_at) VALUES (?1, ?2, 'müşteri', 0, ?3)",
                        rusqlite::params![new_id, c_name, now],
                    );
                    company_id = Some(new_id);
                }
            }
        }
    }
    
    // Eğer description/aciklama'da "TECHTO" gibi bir şey geçiyorsa ve hala company_id yoksa, description'dan firma oluşturmayı da deneyebiliriz.
    let desc = get_str(item, "description").unwrap_or_default();
    if company_id.is_none() {
        if !desc.is_empty() {
             let first_word = desc.split_whitespace().next().unwrap_or("");
             if first_word.len() > 3 {
                 let id: Result<String, _> = conn.query_row("SELECT id FROM companies WHERE name LIKE ?1 LIMIT 1", rusqlite::params![format!("%{}%", first_word)], |r| r.get(0));
                 if let Ok(i) = id { company_id = Some(i); }
             }
        }
    }
    
    let final_company_id = company_id.unwrap_or_else(|| {
        let new_id = uuid::Uuid::new_v4().to_string();
        let fallback_name = if desc.len() > 3 {
            desc.clone()
        } else {
            "Bilinmeyen Cari (Fatura)".to_string()
        };
        let _ = conn.execute("INSERT INTO companies (id, name, type, balance, created_at) VALUES (?1, ?2, 'müşteri', 0, ?3)", rusqlite::params![new_id, fallback_name, now]);
        new_id
    });

    let id = uuid::Uuid::new_v4().to_string();
    let total = get_f64(item, "total");
    let invoice_no = get_str(item, "invoice_no").or_else(|| get_str(item, "fatura_no"));
    let date = get_str(item, "date").or_else(|| get_str(item, "tarih")).unwrap_or_else(|| now.to_string());
    
    conn.execute(
        "INSERT INTO invoices (id, company_id, invoice_no, date, subtotal, vat_amount, total, iban, raw_data, status, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'onaylandı', ?10)",
        rusqlite::params![
            id,
            final_company_id.clone(),
            invoice_no.clone(),
            date.clone(),
            get_f64(item, "subtotal"),
            get_f64(item, "vat_amount"),
            total,
            get_str(item, "iban"),
            serde_json::to_string(item).unwrap_or_default(),
            now
        ],
    )
    .map_err(|e| e.to_string())?;

    // Otomatik olarak ledger_entry oluştur
    let description = match &invoice_no {
        Some(no) => format!("Fatura #{} eklendi", no),
        None => "Fatura eklendi".to_string(),
    };
    
    let f_type = get_str(item, "type").unwrap_or_else(|| "sales".to_string());
    let (debit, credit) = if f_type == "sales" {
        (total, 0.0)
    } else {
        (0.0, total)
    };

    let entry_id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO ledger_entries (id, company_id, date, document_no, description, debit, credit, running_balance, entry_type, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 0, 'fatura', ?8)",
        rusqlite::params![entry_id, final_company_id.clone(), date.clone(), invoice_no.clone(), description, debit, credit, now],
    )
    .map_err(|e| e.to_string())?;

    // Stok işlemleri
    if f_type == "purchase" {
        if let Some(items) = item.get("items").and_then(|v| v.as_array()) {
            for item_val in items {
                if let Some(p_name) = item_val.get("name").and_then(|v| v.as_str()) {
                    let qty = item_val.get("quantity").and_then(|v| v.as_f64()).unwrap_or(1.0);
                    let unit = item_val.get("unit").and_then(|v| v.as_str()).unwrap_or("adet");
                    let price = item_val.get("unit_price").and_then(|v| v.as_f64()).unwrap_or(0.0);

                    let p_id_res: Result<String, _> = conn.query_row(
                        "SELECT id FROM products WHERE name LIKE ?1 LIMIT 1",
                        rusqlite::params![format!("%{}%", p_name)],
                        |r| r.get(0),
                    );

                    let p_id = match p_id_res {
                        Ok(id) => id,
                        Err(_) => {
                            let new_p_id = uuid::Uuid::new_v4().to_string();
                            let _ = conn.execute(
                                "INSERT INTO products (id, name, sku, category, unit, purchase_price, sale_price, min_stock, current_stock, supplier, created_at) VALUES (?1, ?2, '', 'Genel', ?3, ?4, ?4, 0, 0, ?5, ?6)",
                                rusqlite::params![new_p_id, p_name, unit, price, final_company_id.clone(), now]
                            );
                            new_p_id
                        }
                    };

                    let sm_id = uuid::Uuid::new_v4().to_string();
                    let _ = conn.execute(
                        "INSERT INTO stock_movements (id, product_id, date, type, quantity, unit_price, document_no, description, created_at) VALUES (?1, ?2, ?3, 'giriş', ?4, ?5, ?6, 'Fatura Otomatik Aktarım', ?7)",
                        rusqlite::params![sm_id, p_id, date.clone(), qty, price, invoice_no.clone(), now]
                    );

                    let _ = conn.execute(
                        "UPDATE products SET current_stock = current_stock + ?1 WHERE id = ?2",
                        rusqlite::params![qty, p_id]
                    );
                }
            }
        }
    }

    Ok(())
}

fn insert_vehicle(
    conn: &rusqlite::Connection,
    item: &serde_json::Value,
    now: &str,
) -> Result<(), String> {
    let plate = get_str(item, "plate")
        .or_else(|| get_str(item, "plaka"))
        .ok_or("Araç plakası eksik")?;
    let id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO vehicles (id, plate, brand, model, year, status, km, inspection_due_date, insurance_due_date, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        rusqlite::params![
            id,
            plate,
            get_str(item, "brand").or_else(|| get_str(item, "marka")),
            get_str(item, "model"),
            item.get("year").and_then(|v| v.as_i64()),
            get_str(item, "status").or_else(|| get_str(item, "durum")),
            get_f64(item, "km"),
            get_str(item, "inspection_due_date").or_else(|| get_str(item, "muayene_tarihi")),
            get_str(item, "insurance_due_date").or_else(|| get_str(item, "sigorta_tarihi")),
            now
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn insert_worker(
    conn: &rusqlite::Connection,
    item: &serde_json::Value,
    now: &str,
) -> Result<(), String> {
    let full_name = get_str(item, "full_name")
        .or_else(|| get_str(item, "name"))
        .or_else(|| get_str(item, "ad_soyad"))
        .ok_or("Çalışan adı eksik")?;
    let id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO workers (id, full_name, tc_no, birth_date, hire_date, position, sgk_no, iban, salary, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        rusqlite::params![
            id,
            full_name,
            get_str(item, "tc_no"),
            get_str(item, "birth_date").or_else(|| get_str(item, "dogum_tarihi")),
            get_str(item, "hire_date").or_else(|| get_str(item, "ise_giris")),
            get_str(item, "position").or_else(|| get_str(item, "pozisyon")),
            get_str(item, "sgk_no"),
            get_str(item, "iban"),
            get_f64(item, "salary"),
            now
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn insert_tax_item(
    conn: &rusqlite::Connection,
    item: &serde_json::Value,
    now: &str,
) -> Result<(), String> {
    let id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO tax_items (id, type, period, amount, due_date, status, notes, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 'bekliyor', ?6, ?7)",
        rusqlite::params![
            id,
            get_str(item, "type").or_else(|| get_str(item, "tur")).unwrap_or_else(|| "vergi".to_string()),
            get_str(item, "period").or_else(|| get_str(item, "donem")),
            get_f64(item, "amount"),
            get_str(item, "due_date").or_else(|| get_str(item, "son_tarih")),
            get_str(item, "notes").or_else(|| get_str(item, "notlar")),
            now
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn insert_document(
    conn: &rusqlite::Connection,
    item: &serde_json::Value,
    now: &str,
) -> Result<(), String> {
    let title = get_str(item, "title")
        .or_else(|| get_str(item, "baslik"))
        .ok_or("Belge başlığı eksik")?;
    let id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO documents (id, title, category, file_type, notes, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![
            id,
            title,
            get_str(item, "category").or_else(|| get_str(item, "kategori")),
            get_str(item, "file_type").or_else(|| get_str(item, "dosya_turu")),
            get_str(item, "notes").or_else(|| get_str(item, "notlar")),
            now
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn insert_ledger_entry(
    conn: &rusqlite::Connection,
    item: &serde_json::Value,
    now: &str,
) -> Result<(), String> {
    let desc = get_str(item, "description").or_else(|| get_str(item, "açıklama")).or_else(|| get_str(item, "aciklama")).unwrap_or_else(|| "Excel İçe Aktarım".to_string());
    
    let mut company_id = get_str(item, "company_id");
    
    if company_id.is_none() {
        if let Some(c_name) = get_str(item, "company_name").or_else(|| get_str(item, "firma")) {
            let id: Result<String, _> = conn.query_row("SELECT id FROM companies WHERE name LIKE ?1 LIMIT 1", rusqlite::params![format!("%{}%", c_name)], |r| r.get(0));
            if let Ok(i) = id { company_id = Some(i); }
        }
    }
    
    // Fuzzy match in description if still no company
    if company_id.is_none() {
        let first_word = desc.split_whitespace().next().unwrap_or("");
        if first_word.len() > 3 {
            let id: Result<String, _> = conn.query_row("SELECT id FROM companies WHERE name LIKE ?1 LIMIT 1", rusqlite::params![format!("%{}%", first_word)], |r| r.get(0));
            if let Ok(i) = id { company_id = Some(i); }
        }
    }
    
    let final_company_id = company_id.unwrap_or_else(|| {
        let new_id = uuid::Uuid::new_v4().to_string();
        
        // Eğer description'dan bulamadıysak, ilk kelimeyi veya tamamını firma ismi yapabiliriz.
        let fallback_name = if desc.len() > 3 {
            // Örn: "Techto Enerji Faturası" -> "Techto Enerji" yapmaya çalış, veya direkt desc kullan
            desc.clone()
        } else {
            "Bilinmeyen Cari (Asistan/Excel)".to_string()
        };

        let _ = conn.execute("INSERT INTO companies (id, name, type, balance, created_at) VALUES (?1, ?2, 'müşteri', 0, ?3)", rusqlite::params![new_id, fallback_name, now]);
        new_id
    });

    let id = uuid::Uuid::new_v4().to_string();
    
    let amount = get_f64(item, "tutar").max(get_f64(item, "amount"));
    let debit = get_f64(item, "debit").max(if amount > 0.0 { amount } else { 0.0 });
    let credit = get_f64(item, "credit").max(if amount < 0.0 { amount.abs() } else { 0.0 });

    conn.execute(
        "INSERT INTO ledger_entries (id, company_id, date, document_no, description, debit, credit, entry_type, running_balance, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 0.0, ?9)",
        rusqlite::params![
            id,
            final_company_id,
            get_str(item, "date").or_else(|| get_str(item, "tarih")).unwrap_or_else(|| now[0..10].to_string()),
            get_str(item, "document_no").or_else(|| get_str(item, "belge_no")),
            desc,
            debit,
            credit,
            get_str(item, "entry_type").unwrap_or_else(|| "excel_import".to_string()),
            now
        ],
    )
    .map_err(|e| e.to_string())?;

    // Update balances
    crate::commands::ledger::recompute_running_balances(conn, &final_company_id)?;
    Ok(())
}

#[tauri::command]
pub fn parse_excel_file(
    file_data: String,
    _file_name: String,
) -> Result<Vec<std::collections::HashMap<String, String>>, String> {
    use calamine::Reader;
    let bytes = decode_base64(&file_data)?;
    let cursor = std::io::Cursor::new(bytes.to_vec());
    let mut workbook: calamine::Xlsx<_> =
        calamine::open_workbook_from_rs(cursor).map_err(|e| format!("XLSX açılamadı: {}", e))?;

    let mut result = Vec::new();
    let sheet_names = workbook.sheet_names().to_vec();
    if let Some(name) = sheet_names.first() {
        if let Ok(range) = workbook.worksheet_range(name) {
            let mut headers = Vec::new();
            for (i, row) in range.rows().enumerate() {
                if i == 0 {
                    for cell in row.iter() {
                        headers.push(cell.to_string());
                    }
                } else {
                    let mut row_map = std::collections::HashMap::new();
                    for (j, cell) in row.iter().enumerate() {
                        if let Some(header) = headers.get(j) {
                            if !header.is_empty() {
                                row_map.insert(header.clone(), cell.to_string());
                            }
                        }
                    }
                    result.push(row_map);
                }
            }
        }
    }

    Ok(result)
}

#[tauri::command]
pub fn ai_auto_map_excel(
    pool: State<DbPool>,
    headers: Vec<String>,
    sample_row: String,
) -> Result<String, String> {
    let prompt = format!(
        "Aşağıda bir Excel tablosunun sütun başlıkları ve ilk satır örneği var.
Sütunlar: {}
Örnek Satır: {}

Lütfen bu verinin HANGİ Varlık Türüne (\"company\", \"ledger_entry\", \"product\", \"vehicle\", \"worker\") ait olduğunu ve sütun eşleşmelerini analiz et. SADECE JSON dön!
Format:
{{
  \"entity_type\": \"...\",
  \"mapping\": {{
     \"hedef_alan\": \"excel_sutun_adi\"
  }}
}}
Hedef alanlar:
company: name, tax_no, phone, email, contact_person
ledger_entry: company_name, date, document_no, description, tutar, debit, credit
product: name, sku, category, purchase_price, sale_price, current_stock
vehicle: plate, brand, model, year, km
worker: full_name, tc_no, position, salary",
        headers.join(", "),
        sample_row
    );

    let messages = vec![
        crate::ai::ChatMessage {
            role: "system".to_string(),
            content: "Sen bir veri analiz uzmanısın. Yalnızca geçerli JSON döndürürsün.".to_string(),
        },
        crate::ai::ChatMessage {
            role: "user".to_string(),
            content: prompt,
        },
    ];

    let extracted = crate::ai::ai_chat(&pool, &messages)?;
    
    // Extract JSON part
    let json_str = extract_json(&extracted)?;
    Ok(json_str)
}
