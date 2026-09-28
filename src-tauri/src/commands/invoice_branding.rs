//! Fatura şablonu markalaşma — logo, renk, not ve firma bilgileri settings'te
//! saklanır; fatura çıktılarında (PDF/HTML) kullanılır.
//!
//! Ayar anahtarları:
//!   brand_logo_path   → yerel dosya yolu (logo görseli)
//!   brand_color       → #RRGGBB (fatura vurgu rengi)
//!   brand_note        → fatura alt notu (ör. "Ödeme 10 gün içinde")
//!   brand_footer      → fatura alt bilgisi (ör. banka IBAN, yasal metin)
//!   brand_show_logo   → "1" / "0"
//!   brand_template    → "classic" | "modern"

use crate::db::DbPool;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct InvoiceBranding {
    pub logo_path: Option<String>,
    pub color: Option<String>,
    pub note: Option<String>,
    pub footer: Option<String>,
    pub show_logo: bool,
    pub template: String,
}

const KEYS: [&str; 6] = [
    "brand_logo_path",
    "brand_color",
    "brand_note",
    "brand_footer",
    "brand_show_logo",
    "brand_template",
];

fn get_str(conn: &rusqlite::Connection, key: &str) -> Option<String> {
    conn.query_row("SELECT value FROM settings WHERE key = ?1", [key], |r| r.get(0))
        .ok()
        .filter(|v: &String| !v.is_empty())
}

fn set_str(conn: &rusqlite::Connection, key: &str, value: &str) {
    let _ = conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = ?2",
        rusqlite::params![key, value],
    );
}

fn load_branding(conn: &rusqlite::Connection) -> InvoiceBranding {
    InvoiceBranding {
        logo_path: get_str(conn, "brand_logo_path"),
        color: get_str(conn, "brand_color"),
        note: get_str(conn, "brand_note"),
        footer: get_str(conn, "brand_footer"),
        show_logo: get_str(conn, "brand_show_logo").map(|v| v == "1").unwrap_or(true),
        template: get_str(conn, "brand_template").unwrap_or_else(|| "modern".to_string()),
    }
}

/// Marka ayarlarını okur.
#[tauri::command]
pub fn get_invoice_branding(pool: State<DbPool>) -> Result<InvoiceBranding, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    Ok(load_branding(&conn))
}

/// Marka ayarlarını kaydeder.
#[tauri::command]
pub fn set_invoice_branding(
    pool: State<DbPool>,
    logo_path: Option<String>,
    color: Option<String>,
    note: Option<String>,
    footer: Option<String>,
    show_logo: Option<bool>,
    template: Option<String>,
) -> Result<InvoiceBranding, String> {
    // Renk formatını doğrula
    if let Some(c) = &color {
        let t = c.trim();
        if !t.is_empty()
            && !(t.len() == 7 && t.starts_with('#') && t[1..].chars().all(|ch| ch.is_ascii_hexdigit()))
        {
            return Err("Renk formatı #RRGGBB olmalı (ör. #0EA5E9).".to_string());
        }
    }
    if let Some(t) = &template {
        if !matches!(t.as_str(), "classic" | "modern") {
            return Err("Şablon 'classic' veya 'modern' olmalı.".to_string());
        }
    }

    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    if let Some(v) = logo_path {
        set_str(&conn, "brand_logo_path", v.trim());
    }
    if let Some(v) = color {
        set_str(&conn, "brand_color", v.trim());
    }
    if let Some(v) = note {
        set_str(&conn, "brand_note", &v);
    }
    if let Some(v) = footer {
        set_str(&conn, "brand_footer", &v);
    }
    if let Some(v) = show_logo {
        set_str(&conn, "brand_show_logo", if v { "1" } else { "0" });
    }
    if let Some(v) = template {
        set_str(&conn, "brand_template", v.trim());
    }

    Ok(load_branding(&conn))
}

/// Verilen fatura verisinden markalı HTML çıktısı üretir (yazdırma/PDF için).
#[tauri::command]
pub fn render_branded_invoice_html(
    pool: State<DbPool>,
    title: String,
    invoice_no: String,
    date: String,
    company_name: String,
    items: serde_json::Value, // [{name, quantity, unit_price, total}]
    subtotal: f64,
    vat_amount: f64,
    total: f64,
) -> Result<String, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let branding = load_branding(&conn);

    let accent = branding.color.clone().unwrap_or_else(|| "#0EA5E9".to_string());
    let company = get_str(&conn, "company_name").unwrap_or_else(|| "Firma Adı".to_string());
    let tax_no = get_str(&conn, "tax_no").unwrap_or_default();
    let phone = get_str(&conn, "phone").unwrap_or_default();
    let email = get_str(&conn, "email").unwrap_or_default();

    let logo_html = if branding.show_logo {
        match &branding.logo_path {
            Some(p) if !p.is_empty() => format!(
                r#"<img src="file://{}" alt="logo" style="max-height:64px;max-width:200px;object-fit:contain;" />"#,
                p.replace('\\', "/")
            ),
            _ => String::new(),
        }
    } else {
        String::new()
    };

    let mut rows = String::new();
    if let serde_json::Value::Array(list) = &items {
        for it in list {
            let name = it.get("name").and_then(|v| v.as_str()).unwrap_or("-");
            let qty = it.get("quantity").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let unit_price = it.get("unit_price").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let row_total = it.get("total").and_then(|v| v.as_f64()).unwrap_or(qty * unit_price);
            rows.push_str(&format!(
                r#"<tr><td>{}</td><td style="text-align:right">{:.2}</td><td style="text-align:right">{:.2} ₺</td><td style="text-align:right">{:.2} ₺</td></tr>"#,
                html_escape(name), qty, unit_price, row_total
            ));
        }
    }

    Ok(format!(
        include_str!("invoice_template.html"),
        accent = accent,
        logo = logo_html,
        company = html_escape(&company),
        tax_no = html_escape(&tax_no),
        phone = html_escape(&phone),
        email = html_escape(&email),
        title = html_escape(&title),
        invoice_no = html_escape(&invoice_no),
        date = html_escape(&date),
        client = html_escape(&company_name),
        rows = rows,
        subtotal = format!("{:.2}", subtotal),
        vat = format!("{:.2}", vat_amount),
        total = format!("{:.2}", total),
        note = html_escape(branding.note.as_deref().unwrap_or("")),
        footer = html_escape(branding.footer.as_deref().unwrap_or("")),
    ))
}

fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_html_escape() {
        assert_eq!(html_escape("<b>\"x\" & </b>"), "&lt;b&gt;&quot;x&quot; &amp; &lt;/b&gt;");
    }
}
