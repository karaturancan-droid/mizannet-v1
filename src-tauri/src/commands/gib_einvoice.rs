//! GİB e-Arşiv Portal entegrasyonu — resmi e-Fatura / e-SMM / e-Müstahsil gönderimi.
//!
//! Portal uçları (mlevent/fatura PHP kütüphanesiyle aynı protokol):
//! - Login:     POST https://earsivportal.efatura.gov.tr/earsiv-services/assos-login
//!              body: assoscmd=anologin, userid, sifre, sifre2, parola  → { token }
//! - Dispatch:  POST https://earsivportal.efatura.gov.tr/earsiv-services/dispatch
//!              body: callid=uuid, token, cmd, pageName, jp=<json payload>
//! - Download:  GET  https://earsivportal.efatura.gov.tr/earsiv-services/download
//!              ?token&ettn&onayDurumu&belgeTip&cmd=EARSIV_PORTAL_BELGE_INDIR
//!
//! Test portalı: https://earsivportaltest.efatura.gov.tr (assoscmd=login)
//!
//! Akış:
//!   1. login_gib            → token al (settings'e kaydet)
//!   2. create_e_invoice     → taslak oluştur (EARSIV_PORTAL_FATURA_OLUSTUR)
//!   3. sign_invoice_sms     → SMS doğrulama başlat + tamamlan (imzala/kes)
//!   4. list_gib_documents   → taslak listesi
//!   5. download_invoice_pdf → PDF/HTML indir

use crate::db::DbPool;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

const GIB_PROD: &str = "https://earsivportal.efatura.gov.tr";
const GIB_TEST: &str = "https://earsivportaltest.efatura.gov.tr";

/// Testlerde mock sunucu adresini enjekte etmek için override (yalnızca cfg(test)).
#[cfg(test)]
pub(crate) static GIB_BASE_OVERRIDE: std::sync::Mutex<Option<String>> = std::sync::Mutex::new(None);

#[cfg(test)]
fn gib_base(test_mode: bool) -> String {
    if let Some(url) = GIB_BASE_OVERRIDE.lock().unwrap().clone() {
        return url;
    }
    if test_mode { GIB_TEST.to_string() } else { GIB_PROD.to_string() }
}

#[cfg(test)]
pub(crate) fn gib_base_for_test() -> String {
    gib_base(false)
}

#[cfg(not(test))]
fn gib_base(test_mode: bool) -> String {
    if test_mode { GIB_TEST.to_string() } else { GIB_PROD.to_string() }
}

// ---------------------------------------------------------------------------
// Veri modelleri
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EInvoiceItem {
    pub mal_hizmet: String,     // Ürün/hizmet adı
    pub miktar: f64,
    pub birim: String,          // Adet, Ton, M3, Kg, Saat, Gun, PAket...
    pub birim_fiyat: f64,
    pub kdv_orani: f64,         // 0, 1, 8, 10, 20
    pub iskonto_orani: f64,     // 0-100
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EInvoice {
    pub vkn_tckn: String,       // Alıcı VKN/TCKN (10/11 hane)
    pub alici_unvan: String,    // Şirket adı (kurumsalsa)
    pub alici_adi: String,      // Şahıssa ad
    pub alici_soyadi: String,   // Şahıssa soyad
    pub vergi_dairesi: String,
    pub mahalle_semt_ilce: String,
    pub sehir: String,
    pub ulke: String,
    pub adres: String,
    pub eposta: String,
    pub tel: String,
    pub not_aciklama: String,
    pub para_birimi: String,    // TRY, USD, EUR
    pub doviz_kuru: f64,
    pub fatura_tipi: String,    // SATIS, IADE, TEVKIFAT, ISTISNA, OZELMATRAH
    pub tarih: String,          // gg/aa/yyyy
    pub saat: String,           // ss/dd/nn
    pub items: Vec<EInvoiceItem>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EInvoiceResult {
    pub uuid: String,
    pub belge_numarasi: Option<String>,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GibDocument {
    pub ettn: String,
    pub belge_numarasi: String,
    pub alici_vkn_tckn: String,
    pub alici_unvan_ad_soyad: String,
    pub belge_tarihi: String,
    pub belge_turu: String,
    pub onay_durumu: String, // "Onaylandı" | "Onaylanmadı" | "Silinmiş"
}

// ---------------------------------------------------------------------------
// Portal HTTP istemcisi
// ---------------------------------------------------------------------------

pub(crate) struct GibClient {
    token: String,
    base_url: String,
}

impl GibClient {
    /// GİB portal login. Test modu için test credentials da desteklenir.
    fn login(username: &str, password: &str, test_mode: bool) -> Result<String, String> {
        let base = gib_base(test_mode);
        let url = format!("{}/earsiv-services/assos-login", base);

        let params = [
            ("assoscmd", if test_mode { "login" } else { "anologin" }),
            ("userid", username),
            ("sifre", password),
            ("sifre2", password),
            ("parola", password),
            ("rtype", "json"),
        ];

        let client = reqwest::blocking::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .danger_accept_invalid_certs(false)
            .build()
            .map_err(|e| format!("Client hatası: {}", e))?;

        let resp = client
            .post(&url)
            .form(&params)
            .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
            .send()
            .map_err(|e| format!("GİB portalına bağlanılamadı: {}", e))?;

        let status = resp.status();
        let text = resp.text().map_err(|e| format!("Yanıt okunamadı: {}", e))?;

        if !status.is_success() {
            return Err(format!("GİB portal hatası ({}): {}", status, truncate(&text, 200)));
        }

        let json: serde_json::Value = serde_json::from_str(&text)
            .map_err(|_| format!("GİB yanıtı JSON değil: {}", truncate(&text, 200)))?;

        // Başarısızlık durumları
        if let Some(err) = json.get("token").and_then(|t| t.as_str()) {
            if err.contains("hata") || err.contains("HATA") {
                return Err(format!("GİB portal hatası: {}", err));
            }
        }
        if let Some(desc) = json.get("errorDescription").and_then(|e| e.as_str()) {
            if !desc.is_empty() && desc != "null" {
                return Err(format!("GİB portal hatası: {}", desc));
            }
        }

        let token = json["token"]
            .as_str()
            .filter(|t| !t.is_empty())
            .ok_or_else(|| format!("GİB token alınamadı. Kullanıcı kodu/şifre hatalı olabilir. Yanıt: {}", truncate(&text, 200)))?;

        Ok(token.to_string())
    }

    pub(crate) fn new(token: String, test_mode: bool) -> Self {
        Self {
            token,
            base_url: gib_base(test_mode),
        }
    }

    /// Dispatch servisine komut gönderir, `data` alanını döner.
    pub(crate) fn dispatch(&self, cmd: &str, page_name: &str, payload: serde_json::Value) -> Result<serde_json::Value, String> {
        let url = format!("{}/earsiv-services/dispatch", self.base_url);

        let body = serde_json::json!({
            "callid": Uuid::new_v4().to_string(),
            "token": self.token,
            "cmd": cmd,
            "pageName": page_name,
            "jp": payload.to_string(),
        });

        let client = reqwest::blocking::Client::builder()
            .timeout(std::time::Duration::from_secs(60))
            .build()
            .map_err(|e| format!("Client hatası: {}", e))?;

        let resp = client
            .post(&url)
            .json(&body)
            .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
            .send()
            .map_err(|e| format!("GİB portalına bağlanılamadı: {}", e))?;

        let status = resp.status();
        let text = resp.text().map_err(|e| format!("Yanıt okunamadı: {}", e))?;

        if !status.is_success() {
            // Test portalı geçersiz token'da 500 + HTML döndürüyor: oturum hatası olarak yorumla
            if text.trim_start().to_lowercase().contains("<html") {
                return Err("GİB oturumu geçersiz veya sonlanmış. Lütfen yeniden giriş yapın.".to_string());
            }
            return Err(format!("GİB portal hatası ({}): {}", status, truncate(&text, 300)));
        }

        if text.trim_start().to_lowercase().contains("<html") {
            return Err("GİB portalı geçersiz yanıt döndürdü (oturum geçersiz olabilir).".to_string());
        }

        let json: serde_json::Value = serde_json::from_str(&text)
            .map_err(|_| format!("GİB yanıtı JSON değil: {}", truncate(&text, 300)))?;

        // Oturum hatası kontrolü
        if let Some(err) = json.get("data").and_then(|d| d.as_str()) {
            if err.contains("Oturum geçersiz") || err.contains("token yok") {
                return Err("GİB oturumu sonlanmış. Lütfen yeniden giriş yapın.".to_string());
            }
        }

        Ok(json.get("data").cloned().unwrap_or(serde_json::Value::Null))
    }

    /// Belge indirme URL'si.
    fn download_url(&self, ettn: &str, onay_durumu: &str, belge_tip: &str) -> String {
        format!(
            "{}/earsiv-services/download?token={}&ettn={}&onayDurumu={}&belgeTip={}&cmd=EARSIV_PORTAL_BELGE_INDIR",
            self.base_url,
            self.token,
            ettn,
            urlencoding::encode(onay_durumu),
            urlencoding::encode(belge_tip)
        )
    }
}

fn truncate(s: &str, max: usize) -> String {
    if s.len() > max {
        format!("{}...", &s[..max])
    } else {
        s.to_string()
    }
}

// ---------------------------------------------------------------------------
// Fatura payload'ı oluşturma
// ---------------------------------------------------------------------------

/// Bir satırın hesaplanmış değerleri (GİB formatında).
pub(crate) fn calc_item(item: &EInvoiceItem) -> serde_json::Value {
    let fiyat = item.miktar * item.birim_fiyat;
    let iskonto_tutari = fiyat * item.iskonto_orani / 100.0;
    let mal_hizmet_tutari = fiyat - iskonto_tutari;
    let kdv_tutari = mal_hizmet_tutari * item.kdv_orani / 100.0;

    serde_json::json!({
        "malHizmet": item.mal_hizmet,
        "miktar": format_number(item.miktar),
        "birim": item.birim,
        "birimFiyat": format_number(item.birim_fiyat),
        "fiyat": format_number(fiyat),
        "iskontoArttm": "İskonto",
        "iskontoOrani": format_number(item.iskonto_orani),
        "iskontoTutari": format_number(iskonto_tutari),
        "iskontoNedeni": "",
        "malHizmetTutari": format_number(mal_hizmet_tutari),
        "kdvOrani": format_number(item.kdv_orani),
        "kdvTutari": format_number(kdv_tutari),
        "vergiOrani": 0,
        "vergiTutari": 0,
        "ozelMatrahNedeni": 0,
        "ozelMatrahTutari": 0,
        "gtip": "",
        "tevkifatKodu": 0,
    })
}

fn format_number(n: f64) -> String {
    format!("{:.2}", n)
}

/// EInvoice → GİB portal payload'ı.
pub(crate) fn build_invoice_payload(inv: &EInvoice) -> Result<serde_json::Value, String> {
    if inv.vkn_tckn.len() != 10 && inv.vkn_tckn.len() != 11 {
        return Err("Alıcı VKN/TCKN 10 veya 11 haneli olmalı.".to_string());
    }
    if inv.items.is_empty() {
        return Err("Faturada en az bir ürün/hizmet satırı olmalı.".to_string());
    }
    if inv.ulke.trim().is_empty() {
        return Err("Ülke bilgisi zorunlu.".to_string());
    }
    for item in &inv.items {
        if !matches!(item.kdv_orani, 0.0 | 1.0 | 8.0 | 10.0 | 20.0) {
            return Err(format!("Geçersiz KDV oranı: {}. Geçerliler: 0, 1, 8, 10, 20", item.kdv_orani));
        }
        if item.mal_hizmet.trim().is_empty() {
            return Err("Ürün/hizmet adı boş olamaz.".to_string());
        }
    }

    // Toplamları hesapla
    let mut matrah = 0.0f64;
    let mut toplam_iskonto = 0.0f64;
    let mut hesaplanan_kdv = 0.0f64;
    let mut mal_hizmet_liste = Vec::new();

    for item in &inv.items {
        let fiyat = item.miktar * item.birim_fiyat;
        let iskonto_tutari = fiyat * item.iskonto_orani / 100.0;
        let mal_hizmet_tutari = fiyat - iskonto_tutari;
        let kdv_tutari = mal_hizmet_tutari * item.kdv_orani / 100.0;

        matrah += mal_hizmet_tutari;
        toplam_iskonto += iskonto_tutari;
        hesaplanan_kdv += kdv_tutari;

        mal_hizmet_liste.push(calc_item(item));
    }

    let vergiler_toplami = hesaplanan_kdv;
    let vergiler_dahil = matrah + vergiler_toplami;
    let odenecek_tutar = vergiler_dahil;

    let now = chrono::Local::now();
    let tarih = if inv.tarih.trim().is_empty() {
        now.format("%d/%m/%Y").to_string()
    } else {
        inv.tarih.clone()
    };
    let saat = if inv.saat.trim().is_empty() {
        now.format("%H:%M:%S").to_string()
    } else {
        inv.saat.clone()
    };

    // Şahıs mı kurumsal mı?
    let is_person = inv.vkn_tckn.len() == 11;

    Ok(serde_json::json!({
        "vknTckn": inv.vkn_tckn,
        "hangiTip": "eArsivFatura",
        "faturaUuid": "",
        "belgeNumarasi": "",
        "faturaTarihi": tarih,
        "saat": saat,
        "paraBirimi": inv.para_birimi,
        "dovzTLkur": format_number(inv.doviz_kuru),
        "faturaTipi": inv.fatura_tipi.to_uppercase(),
        "siparisNumarasi": "",
        "siparisTarihi": "",
        "irsaliyeNumarasi": "",
        "irsaliyeTarihi": "",
        "fisNo": "",
        "fisTarihi": "",
        "fisSaati": "",
        "fisTipi": "",
        "zRaporNo": "",
        "okcSeriNo": "",
        "aliciUnvan": if is_person { "" } else { &inv.alici_unvan },
        "aliciAdi": if is_person { &inv.alici_adi } else { "" },
        "aliciSoyadi": if is_person { &inv.alici_soyadi } else { "" },
        "bulvarcaddesokak": inv.adres,
        "binaAdi": "",
        "binaNo": "",
        "kapiNo": "",
        "kasabaKoy": "",
        "mahalleSemtIlce": inv.mahalle_semt_ilce,
        "sehir": inv.sehir,
        "ulke": inv.ulke,
        "postaKodu": "",
        "tel": inv.tel,
        "fax": "",
        "eposta": inv.eposta,
        "websitesi": "",
        "vergiDairesi": inv.vergi_dairesi,
        "iadeTable": [],
        "malHizmetTable": mal_hizmet_liste,
        "not": inv.not_aciklama,
        "matrah": format_number(matrah),
        "malhizmetToplamTutari": format_number(matrah),
        "toplamIskonto": format_number(toplam_iskonto),
        "hesaplanankdv": format_number(hesaplanan_kdv),
        "vergilerToplami": format_number(vergiler_toplami),
        "vergilerDahilToplamTutar": format_number(vergiler_dahil),
        "toplamMasraflar": "0.00",
        "odenecekTutar": format_number(odenecek_tutar),
    }))
}

// ---------------------------------------------------------------------------
// Ayarlar (token + kimlik bilgileri settings tablosunda)
// ---------------------------------------------------------------------------

fn get_setting_str(conn: &rusqlite::Connection, key: &str) -> Option<String> {
    conn.query_row("SELECT value FROM settings WHERE key = ?1", [key], |r| r.get(0)).ok()
}

fn set_setting_str(conn: &rusqlite::Connection, key: &str, value: &str) {
    let _ = conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = ?2",
        rusqlite::params![key, value],
    );
}

// ---------------------------------------------------------------------------
// Tauri komutları
// ---------------------------------------------------------------------------

/// GİB portalına giriş yapar ve token'ı döner (settings'e kaydedilir).
#[tauri::command]
pub fn gib_login(
    pool: State<DbPool>,
    username: String,
    password: String,
    test_mode: bool,
) -> Result<String, String> {
    let token = GibClient::login(&username, &password, test_mode)?;

    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    set_setting_str(&conn, "gib_token", &token);
    set_setting_str(&conn, "gib_username", &username);
    set_setting_str(&conn, "gib_test_mode", if test_mode { "1" } else { "0" });
    set_setting_str(
        &conn,
        "gib_login_time",
        &chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
    );

    Ok(token)
}

/// Kayıtlı token ile portal bağlantısını test eder.
#[tauri::command]
pub fn gib_check_session(pool: State<DbPool>) -> Result<bool, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let token = get_setting_str(&conn, "gib_token").filter(|t| !t.is_empty());
    let test_mode = get_setting_str(&conn, "gib_test_mode").map(|v| v == "1").unwrap_or(false);

    let Some(token) = token else {
        return Ok(false);
    };

    let client = GibClient::new(token, test_mode);
    // Profil bilgisi çekmeyi dene — başarılıysa oturum canlı
    // (oturum hata mesajı da "yanıt alındı" sayılır ama false dönmeli)
    match client.dispatch("EARSIV_PORTAL_KULLANICI_BILGILERI_GETIR", "RG_KULLANICI", serde_json::json!({})) {
        Ok(data) => Ok(!data.is_null()),
        Err(e) => {
            let _ = e;
            Ok(false)
        }
    }
}

/// GİB oturumunu kapatır.
#[tauri::command]
pub fn gib_logout(pool: State<DbPool>) -> Result<(), String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    set_setting_str(&conn, "gib_token", "");
    Ok(())
}

/// Alıcı VKN/TCKN'den GİB kayıtlı bilgilerini sorgular (isim/unvan/vergi dairesi).
#[tauri::command]
pub fn gib_query_recipient(pool: State<DbPool>, vkn_tckn: String) -> Result<serde_json::Value, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let token = get_setting_str(&conn, "gib_token").filter(|t| !t.is_empty())
        .ok_or("GİB oturumu yok. Önce giriş yapın.")?;
    let test_mode = get_setting_str(&conn, "gib_test_mode").map(|v| v == "1").unwrap_or(false);

    let client = GibClient::new(token, test_mode);
    let data = client.dispatch(
        "SICIL_VEYA_MERNISTEN_BILGILERI_GETIR",
        "RG_BASITFATURA",
        serde_json::json!({ "vknTcknn": vkn_tckn }),
    )?;
    Ok(data)
}

/// e-Fatura taslağı oluşturur ve UUID'sini döner.
#[tauri::command]
pub fn gib_create_invoice(pool: State<DbPool>, invoice: EInvoice) -> Result<EInvoiceResult, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let token = get_setting_str(&conn, "gib_token").filter(|t| !t.is_empty())
        .ok_or("GİB oturumu yok. Önce giriş yapın.")?;
    let test_mode = get_setting_str(&conn, "gib_test_mode").map(|v| v == "1").unwrap_or(false);

    let payload = build_invoice_payload(&invoice)?;
    let client = GibClient::new(token, test_mode);

    let data = client.dispatch("EARSIV_PORTAL_FATURA_OLUSTUR", "RG_BASITFATURA", payload)?;

    // Yanıt "başarıyla" içermeli
    let message = data.as_str().unwrap_or("").to_string();
    if !message.contains("başarıyla") && !message.contains("basariyla") {
        return Err(format!("Fatura oluşturulamadı: {}", message));
    }

    // UUID'yi son belgeden al
    let list = client.dispatch(
        "EARSIV_PORTAL_TASLAKLARI_GETIR",
        "RG_TASLAKLAR",
        serde_json::json!({
            "baslangic": chrono::Local::now().format("%d/%m/%Y").to_string(),
            "bitis": chrono::Local::now().format("%d/%m/%Y").to_string(),
            "hangiTip": "eArsivFatura",
        }),
    )?;

    let uuid = list
        .as_array()
        .and_then(|arr| arr.first())
        .and_then(|d| d["ettn"].as_str())
        .unwrap_or("")
        .to_string();

    Ok(EInvoiceResult {
        uuid,
        belge_numarasi: list
            .as_array()
            .and_then(|arr| arr.first())
            .and_then(|d| d["belgeNumarasi"].as_str())
            .map(|s| s.to_string()),
        message,
    })
}

/// SMS doğrulaması başlatır — imzalama (fatura kesme) için gereklidir.
/// Döndürülen operasyon ID'si, kullanıcıdan gelen SMS koduyla `gib_complete_sms_sign`'e verilir.
#[tauri::command]
pub fn gib_start_sms_sign(pool: State<DbPool>) -> Result<String, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let token = get_setting_str(&conn, "gib_token").filter(|t| !t.is_empty())
        .ok_or("GİB oturumu yok.")?;
    let test_mode = get_setting_str(&conn, "gib_test_mode").map(|v| v == "1").unwrap_or(false);

    let client = GibClient::new(token, test_mode);

    // Kayıtlı GSM numarasını al
    let data = client.dispatch("EARSIV_PORTAL_TELEFONNO_SORGULA", "RG_BASITTASLAKLAR", serde_json::json!({}))?;
    let phone = data["telefon"].as_str().unwrap_or("").to_string();
    if phone.is_empty() {
        return Err("Portala kayıtlı GSM numarası bulunamadı.".to_string());
    }

    // SMS gönder
    let data = client.dispatch(
        "EARSIV_PORTAL_SMSSIFRE_GONDER",
        "RG_SMSONAY",
        serde_json::json!({
            "CEPTEL": phone,
            "KCEPTEL": false,
            "TIP": "",
        }),
    )?;

    let oid = data["oid"].as_str().unwrap_or("").to_string();
    if oid.is_empty() {
        return Err("SMS doğrulama başlatılamadı.".to_string());
    }

    Ok(oid)
}

/// SMS kodunu doğrulayıp faturaları imzalar (keser).
/// İmzalanan her fatura için invoices tablosuna kayıt + cari hesaba ledger_entry işlenir.
#[tauri::command]
pub fn gib_complete_sms_sign(
    pool: State<DbPool>,
    sms_code: String,
    operation_id: String,
    uuids: Vec<String>,
) -> Result<usize, String> {
    gib_complete_sms_sign_inner(&pool, sms_code, operation_id, uuids)
}

/// Test edilebilir iç sürüm: State yerine doğrudan pool alır.
pub(crate) fn gib_complete_sms_sign_inner(
    pool: &DbPool,
    sms_code: String,
    operation_id: String,
    uuids: Vec<String>,
) -> Result<usize, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let token = get_setting_str(&conn, "gib_token").filter(|t| !t.is_empty())
        .ok_or("GİB oturumu yok.")?;
    let test_mode = get_setting_str(&conn, "gib_test_mode").map(|v| v == "1").unwrap_or(false);

    let client = GibClient::new(token, test_mode);

    let docs: Vec<serde_json::Value> = uuids
        .iter()
        .map(|u| serde_json::json!({ "belgeTuru": "FATURA", "ettn": u }))
        .collect();

    let data = client.dispatch(
        "0lhozfib5410mp", // GİB'in SMS imzalama cmd kodu
        "RG_SMSONAY",
        serde_json::json!({
            "DATA": docs,
            "SIFRE": sms_code,
            "OID": operation_id,
            "OPR": 1,
        }),
    )?;

    if data["sonuc"].as_str() != Some("1") {
        return Err("SMS kodu hatalı veya doğrulama başarısız.".to_string());
    }

    // ---- İmzalanan faturaları uygulama veritabanına işle ----
    let mut recorded = 0usize;
    for uuid in &uuids {
        // Fatura kaydını çakışma olmayacak şekilde işle (aynı uuid tekrar gelirse atlama)
        let exists: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM invoices WHERE raw_data LIKE ?1",
                [format!("%{}%", uuid)],
                |r| r.get(0),
            )
            .unwrap_or(0);
        if exists > 0 {
            continue;
        }

        match record_signed_invoice(&conn, uuid) {
            Ok(()) => recorded += 1,
            Err(e) => {
                // Kayıt hatası faturayı bozmaz; loglayıp devam et
                eprintln!("e-Fatura {} cari işlemi başarısız: {}", uuid, e);
            }
        }
    }

    Ok(uuids.len().max(recorded))
}

/// İmzalanmış bir GİB faturasını invoices + ledger_entries + companies tablolarına işler.
fn record_signed_invoice(conn: &rusqlite::Connection, ettn: &str) -> Result<(), String> {
    let token = get_setting_str(conn, "gib_token").filter(|t| !t.is_empty())
        .ok_or("GİB oturumu yok.")?;
    let test_mode = get_setting_str(conn, "gib_test_mode").map(|v| v == "1").unwrap_or(false);
    let client = GibClient::new(token, test_mode);

    // Fatura detayını portaldan al (toplamlar, alıcı, tarih)
    let doc = client.dispatch("EARSIV_PORTAL_FATURA_GETIR", "RG_TASLAKLAR", serde_json::json!({ "ettn": ettn }))?;

    let belge_no = doc["belgeNumarasi"].as_str().unwrap_or("").to_string();
    let tarih = doc["faturaTarihi"].as_str().unwrap_or("").to_string();
    let vkn = doc["vknTckn"].as_str().or(doc["aliciVknTckn"].as_str()).unwrap_or("").to_string();
    let unvan = doc["aliciUnvan"].as_str().unwrap_or("").to_string();
    let ad = doc["aliciAdi"].as_str().unwrap_or("").to_string();
    let soyad = doc["aliciSoyadi"].as_str().unwrap_or("").to_string();
    let alici_adi = if unvan.is_empty() { format!("{} {}", ad, soyad).trim().to_string() } else { unvan };

    // Toplamlar (GİB sayıları string olarak döner)
    let total = doc["odenecekTutar"].as_str().and_then(|s| parse_gib_number(s)).unwrap_or(0.0);
    let kdv = doc["hesaplanankdv"].as_str().and_then(|s| parse_gib_number(s)).unwrap_or(0.0);
    let matrah = doc["matrah"].as_str().and_then(|s| parse_gib_number(s)).unwrap_or(0.0);

    if total <= 0.0 {
        return Err(format!("Fatura tutarı okunamadı ({})", ettn));
    }

    // ---- 1) Cari hesabı bul veya oluştur (VKN/TCKN eşleşmesi) ----
    let company_id = match conn
        .query_row("SELECT id FROM companies WHERE tax_no = ?1 LIMIT 1", [&vkn], |r| r.get::<_, String>(0))
    {
        Ok(id) => id,
        Err(_) => {
            let new_id = uuid::Uuid::new_v4().to_string();
            let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
            conn.execute(
                "INSERT INTO companies (id, name, tax_no, balance, created_at) VALUES (?1, ?2, ?3, 0, ?4)",
                rusqlite::params![new_id, alici_adi, vkn, now],
            )
            .map_err(|e| format!("Cari oluşturulamadı: {}", e))?;
            new_id
        }
    };

    // ---- 2) invoices tablosuna kaydet ----
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    // GİB tarihi dd/mm/yyyy → yyyy-mm-dd
    let date_iso = normalize_gib_date(&tarih);

    let invoice_id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO invoices (id, company_id, invoice_no, date, subtotal, vat_amount, total, iban, raw_data, status, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, NULL, ?8, 'onaylandı', ?9)",
        rusqlite::params![invoice_id, company_id, belge_no, date_iso, matrah, kdv, total, doc.to_string(), now],
    )
    .map_err(|e| format!("Fatura kaydedilemedi: {}", e))?;

    // ---- 3) Cari hesaba ledger_entry işle (satış faturası = alacak/debit) ----
    let entry_id = uuid::Uuid::new_v4().to_string();
    let desc = format!("e-Fatura #{} (GİB)", if belge_no.is_empty() { ettn } else { &belge_no });
    conn.execute(
        "INSERT INTO ledger_entries (id, company_id, date, document_no, description, debit, credit, entry_type, running_balance, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, 'e_fatura', 0, ?7)",
        rusqlite::params![entry_id, company_id, date_iso, belge_no, desc, total, now],
    )
    .map_err(|e| format!("Cari hareket işlenemedi: {}", e))?;

    // ---- 4) Bakiyeleri güncelle ----
    crate::commands::ledger::recompute_running_balances(conn, &company_id)?;

    Ok(())
}

/// GİB sayı formatını çözer ("1.234,56" → 1234.56, "1234.56" → 1234.56).
pub(crate) fn parse_gib_number(s: &str) -> Option<f64> {
    let cleaned: String = s.chars().filter(|c| !c.is_whitespace()).collect();
    if cleaned.contains(',') {
        Some(cleaned.replace('.', "").replace(',', ".").parse().ok()?)
    } else {
        cleaned.parse().ok()
    }
}

/// GİB tarih formatını (dd/mm/yyyy) ISO'ya (yyyy-mm-dd) çevirir.
pub(crate) fn normalize_gib_date(s: &str) -> String {
    let parts: Vec<&str> = s.trim().split('/').collect();
    if parts.len() == 3 && parts[2].len() == 4 {
        return format!("{}-{:0>2}-{:0>2}", parts[2], parts[1], parts[0]);
    }
    s.to_string()
}

/// Belirli tarih aralığındaki GİB belgelerini listeler.
#[tauri::command]
pub fn gib_list_documents(
    pool: State<DbPool>,
    start_date: String, // gg/aa/yyyy
    end_date: String,
) -> Result<Vec<GibDocument>, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let token = get_setting_str(&conn, "gib_token").filter(|t| !t.is_empty())
        .ok_or("GİB oturumu yok.")?;
    let test_mode = get_setting_str(&conn, "gib_test_mode").map(|v| v == "1").unwrap_or(false);

    let client = GibClient::new(token, test_mode);
    let data = client.dispatch(
        "EARSIV_PORTAL_TASLAKLARI_GETIR",
        "RG_TASLAKLAR",
        serde_json::json!({
            "baslangic": start_date,
            "bitis": end_date,
            "hangiTip": "eArsivFatura",
        }),
    )?;

    let arr = data.as_array().cloned().unwrap_or_default();
    let docs = arr
        .iter()
        .map(|d| GibDocument {
            ettn: d["ettn"].as_str().unwrap_or("").to_string(),
            belge_numarasi: d["belgeNumarasi"].as_str().unwrap_or("").to_string(),
            alici_vkn_tckn: d["aliciVknTckn"].as_str().unwrap_or("").to_string(),
            alici_unvan_ad_soyad: d["aliciUnvanAdSoyad"].as_str().unwrap_or("").to_string(),
            belge_tarihi: d["belgeTarihi"].as_str().unwrap_or("").to_string(),
            belge_turu: d["belgeTuru"].as_str().unwrap_or("").to_string(),
            onay_durumu: d["onayDurumu"].as_str().unwrap_or("").to_string(),
        })
        .collect();

    Ok(docs)
}

/// Belgenin HTML/PDF çıktısını indirir.
#[tauri::command]
pub fn gib_download_invoice(
    pool: State<DbPool>,
    ettn: String,
    onay_durumu: String,
    file_name: String,
) -> Result<String, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let token = get_setting_str(&conn, "gib_token").filter(|t| !t.is_empty())
        .ok_or("GİB oturumu yok.")?;
    let test_mode = get_setting_str(&conn, "gib_test_mode").map(|v| v == "1").unwrap_or(false);

    let client = GibClient::new(token, test_mode);
    let url = client.download_url(&ettn, &onay_durumu, "FATURA");

    let http = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(|e| e.to_string())?;
    let resp = http
        .get(&url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
        .send()
        .map_err(|e| format!("İndirme hatası: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("İndirme başarısız: {}", resp.status()));
    }

    let bytes = resp.bytes().map_err(|e| format!("Veri okunamadı: {}", e))?;

    let desktop = dirs::desktop_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
    let safe_name = if file_name.trim().is_empty() { format!("{}.zip", ettn) } else { file_name };
    let target = desktop.join(&safe_name);
    std::fs::write(&target, &bytes).map_err(|e| format!("Dosya yazılamadı: {}", e))?;

    Ok(target.to_string_lossy().to_string())
}

/// Taslak belgeyi siler (yalnızca onaylanmamışlar).
#[tauri::command]
pub fn gib_delete_draft(pool: State<DbPool>, ettn: String, reason: Option<String>) -> Result<String, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let token = get_setting_str(&conn, "gib_token").filter(|t| !t.is_empty())
        .ok_or("GİB oturumu yok.")?;
    let test_mode = get_setting_str(&conn, "gib_test_mode").map(|v| v == "1").unwrap_or(false);

    let client = GibClient::new(token, test_mode);
    let data = client.dispatch(
        "EARSIV_PORTAL_FATURA_SIL",
        "RG_TASLAKLAR",
        serde_json::json!({
            "silinecekler": [{ "belgeTuru": "FATURA", "ettn": ettn }],
            "aciklama": reason.unwrap_or_else(|| "Hatalı İşlem".to_string()),
        }),
    )?;

    Ok(data.as_str().unwrap_or("Silindi").to_string())
}
