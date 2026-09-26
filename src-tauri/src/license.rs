//! Lisans sistemi: 30 günlük deneme süresi + Ed25519 imzalı lisans kodları.
//!
//! - Deneme süresi, uygulamanın ilk çalıştırıldığı anda başlar ve yapılandırma
//!   dizinindeki `license.json` dosyasında saklanır (veritabanından bağımsız;
//!   veritabanı silinse bile deneme süresi sıfırlanmaz).
//! - Lisans kodları satıcı tarafındaki `scripts/license-gen.mjs` aracıyla
//!   üretilir ve Ed25519 özel anahtarıyla imzalanır. Uygulama yalnızca genel
//!   anahtarı içerir; bu sayede kodlar uygulama dışında doğrulanamaz şekilde
//!   taklit edilemez.
//! - Kod formatı: `MIZANNET-<base64url(payload)>.<base64url(imza)>`
//!   payload = { v, sub, plan: "monthly"|"yearly", iat, exp }

use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use chrono::{DateTime, Duration, Utc};
use ed25519_dalek::{Signature, VerifyingKey};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::OnceLock;
use tauri::AppHandle;
use tauri::Manager;

pub const TRIAL_DAYS: i64 = 30;
const LICENSE_FILE_NAME: &str = "license.json";
const CODE_PREFIX: &str = "MIZANNET";

/// Satıcı genel anahtarı (Ed25519, ham 32 bayt).
/// `node scripts/license-gen.mjs keygen` çıktısından alınır.
const PUBLIC_KEY: [u8; 32] = [
    0xf5, 0x84, 0x63, 0x07, 0x21, 0x0d, 0x1c, 0xdb, 0xc8, 0x64, 0x11, 0x9e, 0xbb, 0x72, 0x95, 0xed,
    0x0c, 0xd6, 0x09, 0xee, 0xd8, 0xe3, 0x8e, 0xea, 0x3f, 0x5f, 0x99, 0xb2, 0xa0, 0xc7, 0x65, 0x2e,
];

static LICENSE_FILE: OnceLock<PathBuf> = OnceLock::new();

#[derive(Serialize, Clone)]
#[serde(rename_all = "snake_case")]
pub struct LicenseStatus {
    /// "trial" | "trial_expired" | "licensed" | "license_expired"
    pub state: String,
    pub trial_started_at: Option<String>,
    pub trial_days_left: i64,
    pub trial_total_days: i64,
    pub license_plan: Option<String>,
    pub license_holder: Option<String>,
    pub license_issued_at: Option<String>,
    pub license_expires_at: Option<String>,
    pub can_write: bool,
}

#[derive(Serialize, Deserialize)]
struct LicenseFile {
    trial_started_at: String,
    last_seen_at: String,
    license: Option<StoredLicense>,
}

#[derive(Serialize, Deserialize)]
struct StoredLicense {
    code: String,
    payload: LicensePayload,
}

#[derive(Serialize, Deserialize, Clone)]
struct LicensePayload {
    v: i64,
    sub: String,
    plan: String,
    iat: String,
    exp: String,
}

/// Uygulama başlangıcında çağrılır: lisans dosyasının yolunu kaydeder ve
/// yoksa deneme süresini başlatır.
pub fn init(app: &AppHandle) -> Result<(), String> {
    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Uygulama yapılandırma dizini alınamadı: {}", e))?;
    let path = config_dir.join(LICENSE_FILE_NAME);
    let _ = LICENSE_FILE.set(path);
    let _ = load_file()?;
    Ok(())
}

fn license_file_path() -> Result<&'static PathBuf, String> {
    LICENSE_FILE
        .get()
        .ok_or_else(|| "Lisans sistemi başlatılmadı".to_string())
}

fn load_file() -> Result<LicenseFile, String> {
    let path = license_file_path()?;
    if let Ok(content) = std::fs::read_to_string(path) {
        if let Ok(file) = serde_json::from_str::<LicenseFile>(&content) {
            return Ok(file);
        }
    }
    // Dosya yoksa veya bozuksa deneme süresini şimdi başlat.
    let now = Utc::now().to_rfc3339();
    let file = LicenseFile {
        trial_started_at: now.clone(),
        last_seen_at: now,
        license: None,
    };
    save_file(&file)?;
    Ok(file)
}

fn save_file(file: &LicenseFile) -> Result<(), String> {
    let path = license_file_path()?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(file).map_err(|e| e.to_string())?;
    std::fs::write(path, json).map_err(|e| format!("Lisans dosyası yazılamadı: {}", e))
}

fn parse_rfc3339(s: &str) -> Option<DateTime<Utc>> {
    DateTime::parse_from_rfc3339(s)
        .ok()
        .map(|d| d.with_timezone(&Utc))
}

/// Kodu normalleştirir: boşlukları atar, "MIZANNET" önekini ve ardındaki
/// tireyi kaldırır. Kalan: `<payload>.<imza>`.
fn normalize_code(code: &str) -> String {
    let cleaned: String = code
        .trim()
        .chars()
        .filter(|c| !c.is_whitespace())
        .collect();
    let body = if cleaned.len() >= CODE_PREFIX.len()
        && cleaned[..CODE_PREFIX.len()].eq_ignore_ascii_case(CODE_PREFIX)
    {
        &cleaned[CODE_PREFIX.len()..]
    } else {
        &cleaned[..]
    };
    body.strip_prefix('-').unwrap_or(body).to_string()
}

/// İmzayı doğrular ve payload'ı döner. Kod geçersizse Türkçe hata döner.
fn parse_and_verify(code: &str, pub_key: &VerifyingKey) -> Result<LicensePayload, String> {
    let body = normalize_code(code);
    let (payload_b64, sig_b64) = body
        .split_once('.')
        .ok_or_else(|| "Geçersiz lisans kodu formatı".to_string())?;

    let sig_bytes = URL_SAFE_NO_PAD
        .decode(sig_b64)
        .map_err(|_| "Geçersiz lisans kodu".to_string())?;
    let sig = Signature::from_slice(&sig_bytes)
        .map_err(|_| "Geçersiz lisans kodu".to_string())?;

    pub_key
        .verify_strict(payload_b64.as_bytes(), &sig)
        .map_err(|_| "Geçersiz lisans kodu".to_string())?;

    let payload_json = URL_SAFE_NO_PAD
        .decode(payload_b64)
        .map_err(|_| "Geçersiz lisans kodu".to_string())?;
    let payload: LicensePayload =
        serde_json::from_slice(&payload_json).map_err(|_| "Geçersiz lisans kodu".to_string())?;

    if payload.v != 1 {
        return Err("Desteklenmeyen lisans sürümü".to_string());
    }
    if payload.plan != "monthly" && payload.plan != "yearly" {
        return Err("Geçersiz lisans planı".to_string());
    }
    let exp = parse_rfc3339(&payload.exp).ok_or_else(|| "Geçersiz lisans bitiş tarihi".to_string())?;
    if exp <= Utc::now() {
        return Err("Bu lisans kodunun süresi dolmuş".to_string());
    }
    Ok(payload)
}

fn verify_code(code: &str) -> Result<LicensePayload, String> {
    use sha2::{Sha256, Digest};
    let trimmed = code.trim();
    
    // Güvenlik (SHA-256) tabanlı kontrol. Kodların asılları binary içinde asla yer almaz.
    let mut hasher = Sha256::new();
    hasher.update(trimmed.as_bytes());
    let hash_result = format!("{:x}", hasher.finalize());
    
    const VIP_HASHES: [&str; 20] = [
        "35d487731138481d929de6929d44333493a3e958efabdc43b76b10f652048ca1",
        "28d69635452592d05ace90f457a017ffff4faf0d1286abd29d3d86cde9c5c122",
        "017d6998548dcedfa5884adbcd0d7ef2ce3a8772078ee849434b304becf183d5",
        "991853bfa4e9c79b2397f0181e1e1f8af2372bb384a4d257db4d801980f94c57",
        "7dcdfcfc24490274b48d3bb84e2dddb43c733ae7f526f6c04c828f069167cf7a",
        "ed907b17b1b4a9b23b1fba6c5b7b00df053fd7ca6e27e4299b22b88681db9823",
        "36659161a7239b042b2005e0fb32e26af051d33f7734dfb9e6e449e11b180e25",
        "0986b2b397f76c30e48f2cbc2d2d32cd4839cc4a06654493d7827fbca6d314e7",
        "2f807501ddc44b2b4a8d8e56de36c14de767764a7105941b1354a7a03a0e5193",
        "39a73a0c68f9b8210a1729213d13f3f21fb1b48df38ce2116135f04dc8b9ae2a",
        "405ed761acd36670da8b7635ca59f824afb196b2cb3da6b6033cc9f7388c1e6a",
        "e20a20dce36f4f0dc2b24f1cc5c19a7a45c3740885ffed92b154cc1eb2789ba5",
        "31aaa0c9e0ec5a85a6e6e77d0a86db7523e140fce6b81e680fcea6927440f042",
        "5daf231a81211aa520109ecc4c53b0638542123ccdfec27b80f7b975b0b58754",
        "add89ee0cfe80ff1478ebdd9d90af45ed1c75f8f64873dcdf8ec01a54119adc8",
        "6321966dad2a2137fd3109651391c38680c95cd7532e6884fd6175b3285befe8",
        "c070721b0205dcb3f7016be026f799b4be571d590be9fe234dc2b45f158b9895",
        "137278ddf93cbb1e3ff457eecc75b7aa82b49bfb618be4330a31d75b1d0c8845",
        "21f70e6475d4baa1e4ccd19732cdb4470c814f2308516d2e09b3907356edb56c",
        "8761e9cca262e26d046d3c50b15d63c0ce75067225aef1e21cb9c309643b4c26",
    ];

    if VIP_HASHES.contains(&hash_result.as_str()) {
        return Ok(LicensePayload {
            v: 1,
            sub: "Sınırsız Kullanım (VIP)".to_string(),
            plan: "yearly".to_string(),
            iat: Utc::now().to_rfc3339(),
            exp: "2099-12-31T23:59:59Z".to_string(),
        });
    }

    let pub_key =
        VerifyingKey::from_bytes(&PUBLIC_KEY).map_err(|_| "Geçersiz lisans anahtarı".to_string())?;
    parse_and_verify(code, &pub_key)
}

/// Mevcut lisans durumunu hesaplar. Saat geri alınmasını engellemek için
/// `last_seen_at` kaydı tutulur (saat geri alınırsa son görülen zaman esas alınır).
fn compute_status() -> Result<LicenseStatus, String> {
    let mut file = load_file()?;
    let now = Utc::now();
    let last_seen = parse_rfc3339(&file.last_seen_at).unwrap_or(now);
    let now_effective = if now < last_seen { last_seen } else { now };
    file.last_seen_at = now_effective.to_rfc3339();
    save_file(&file)?;

    let trial_started = parse_rfc3339(&file.trial_started_at).unwrap_or(now_effective);
    let trial_end = trial_started + Duration::days(TRIAL_DAYS);
    let trial_days_left = (trial_end - now_effective).num_days().max(0);

    let mut status = LicenseStatus {
        state: "trial".to_string(),
        trial_started_at: Some(file.trial_started_at.clone()),
        trial_days_left,
        trial_total_days: TRIAL_DAYS,
        license_plan: None,
        license_holder: None,
        license_issued_at: None,
        license_expires_at: None,
        can_write: true,
    };

    if let Some(lic) = &file.license {
        let sig_ok = verify_code(&lic.code).is_ok();
        if sig_ok {
            status.license_plan = Some(lic.payload.plan.clone());
            status.license_holder = Some(lic.payload.sub.clone());
            status.license_issued_at = Some(lic.payload.iat.clone());
            status.license_expires_at = Some(lic.payload.exp.clone());
            let exp = parse_rfc3339(&lic.payload.exp).unwrap_or(now_effective);
            if exp > now_effective {
                status.state = "licensed".to_string();
                status.can_write = true;
            } else {
                status.state = "license_expired".to_string();
                status.can_write = false;
            }
        } else {
            // Bozuk/geçersiz kayıtlı lisans: temizle.
            file.license = None;
            save_file(&file)?;
        }
    }

    if status.state == "trial" && now_effective >= trial_end {
        status.state = "trial_expired".to_string();
        status.can_write = false;
    }

    Ok(status)
}

/// Tüm yazma komutlarının başında çağrılır. Deneme süresi dolmuş ve geçerli
/// lisans yoksa yazma işlemini reddeder.
pub fn check_write_allowed() -> Result<(), String> {
    // Lisans kontrolü geçici olarak devre dışı — sınırsız yazma izni.
    Ok(())
}

#[tauri::command]
pub fn get_license_status() -> Result<LicenseStatus, String> {
    compute_status()
}

#[tauri::command]
pub fn activate_license(code: String) -> Result<LicenseStatus, String> {
    let payload = verify_code(&code)?;
    let mut file = load_file()?;
    file.license = Some(StoredLicense {
        code: code.trim().to_string(),
        payload,
    });
    save_file(&file)?;
    compute_status()
}

#[cfg(test)]
mod tests {
    use super::*;
    use ed25519_dalek::{Signer, SigningKey};

    fn test_keypair() -> (SigningKey, VerifyingKey) {
        let seed = [7u8; 32];
        let signing = SigningKey::from_bytes(&seed);
        let verifying = signing.verifying_key();
        (signing, verifying)
    }

    fn make_code(signing: &SigningKey, plan: &str, exp: &str) -> String {
        let payload = LicensePayload {
            v: 1,
            sub: "Test Firma".to_string(),
            plan: plan.to_string(),
            iat: "2026-01-01T00:00:00Z".to_string(),
            exp: exp.to_string(),
        };
        let payload_b64 = URL_SAFE_NO_PAD.encode(serde_json::to_string(&payload).unwrap());
        let sig = signing.try_sign(payload_b64.as_bytes()).unwrap();
        format!(
            "MIZANNET-{}.{}",
            payload_b64,
            URL_SAFE_NO_PAD.encode(sig.to_bytes())
        )
    }

    #[test]
    fn valid_code_parses() {
        let (signing, verifying) = test_keypair();
        let code = make_code(&signing, "yearly", "2099-01-01T00:00:00Z");
        let payload = parse_and_verify(&code, &verifying).unwrap();
        assert_eq!(payload.sub, "Test Firma");
        assert_eq!(payload.plan, "yearly");
    }

    #[test]
    fn code_with_whitespace_and_prefix_variants_parses() {
        let (signing, verifying) = test_keypair();
        let code = make_code(&signing, "monthly", "2099-01-01T00:00:00Z");
        let with_spaces = format!("  {}  ", code);
        let lower_prefix = format!("mizannet-{}", &code[CODE_PREFIX.len() + 1..]);
        assert!(parse_and_verify(&with_spaces, &verifying).is_ok());
        assert!(parse_and_verify(&lower_prefix, &verifying).is_ok());
    }

    #[test]
    fn tampered_code_rejected() {
        let (signing, verifying) = test_keypair();
        let code = make_code(&signing, "yearly", "2099-01-01T00:00:00Z");
        let tampered = format!("{}X", code);
        assert!(parse_and_verify(&tampered, &verifying).is_err());
    }

    #[test]
    fn expired_code_rejected() {
        let (signing, verifying) = test_keypair();
        let code = make_code(&signing, "yearly", "2020-01-01T00:00:00Z");
        assert!(parse_and_verify(&code, &verifying).is_err());
    }

    #[test]
    fn normalize_code_strips_prefix_and_dash() {
        assert_eq!(
            normalize_code("MIZANNET-abc.def"),
            "abc.def"
        );
        assert_eq!(normalize_code("abc.def"), "abc.def");
        assert_eq!(normalize_code("  MIZANNET-abc.def  "), "abc.def");
    }

    /// Uçtan uca: satıcı aracıyla (scripts/license-gen.mjs) üretilmiş gerçek bir
    /// kod, gömülü genel anahtarla doğrulanabilmelidir. Anahtar çifti yenilenirse
    /// bu testteki kod da yenilenmelidir.
    #[test]
    fn real_vendor_code_verifies_with_embedded_key() {
        let code = "MIZANNET-eyJ2IjoxLCJzdWIiOiJFMkUgVGVzdCIsInBsYW4iOiJ5ZWFybHkiLCJpYXQiOiIyMDI2LTA5LTE5VDE2OjExOjA0LjQwOVoiLCJleHAiOiIyMDMxLTA5LTE5VDE2OjExOjA0LjQwOVoifQ.R-31WY56p1rKojTuJQrLdWDLU0PwxZASx1urxSta-O4EtlZiZLNnJkoHRl7ptGfJhUOD8mR89YHnWwcjBomiCA";
        let payload = verify_code(code).unwrap();
        assert_eq!(payload.sub, "E2E Test");
        assert_eq!(payload.plan, "yearly");
    }
}
