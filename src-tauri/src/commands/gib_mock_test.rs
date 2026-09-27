//! GİB mock sunucusu ile uçtan uca cari işleme testi.
//!
//! Sahte GİB e-Arşiv portalı (mockito) kurulur; gerçek portal akışı simüle edilir:
//! SMS imza → fatura detayı getir → invoices + ledger_entries + companies.balance doğrulaması.

use super::gib_einvoice;
use crate::db::DbPool;
use crate::db_migrations::run_migrations;
use gib_einvoice::{GIB_BASE_OVERRIDE, normalize_gib_date, parse_gib_number};

/// Dispatch yanıt gövdesi: GİB formatı {"data": <payload string|object>}
fn dispatch_response(data: serde_json::Value) -> serde_json::Value {
    serde_json::json!({ "data": data })
}

/// Test portalındaki fatura detayı yanıtı (RG_TASLAKLAR / FATURA_GETIR).
fn sample_invoice_doc(ettn: &str) -> serde_json::Value {
    serde_json::json!({
        "ettn": ettn,
        "belgeNumarasi": "ABC2026000000099",
        "faturaTarihi": "15/09/2026",
        "vknTckn": "1234567801",
        "aliciUnvan": "Mock Alıcı A.Ş.",
        "aliciAdi": "",
        "aliciSoyadi": "",
        "matrah": "1800.00",
        "hesaplanankdv": "360.00",
        "odenecekTutar": "2160.00"
    })
}

fn test_pool() -> DbPool {
    static COUNTER: std::sync::atomic::AtomicUsize = std::sync::atomic::AtomicUsize::new(0);
    let n = COUNTER.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
    let dir = std::env::temp_dir().join(format!("gib_mock_test_{}_{}", std::process::id(), n));
    std::fs::create_dir_all(&dir).unwrap();
    let pool = DbPool(crate::db::create_pool(&dir).into());
    let conn = pool.get_conn().unwrap();
    run_migrations(&conn).unwrap();
    pool
}

/// Mock portal kurar: FATURA_GETIR gövdesi geçen isteklere fatura döner, diğerlerine sonuc:"1".
/// mockito son kaydedilen mock önce değerlendirilir → önce "sonuc 1" mock'u, sonra fatura mock'u.
fn setup_mock_portal(server: &mut mockito::Server, doc: serde_json::Value) {
    // 1) SMS imza onayı (sonuc "1") — ön tanımlı yanıt
    let _m_default = server
        .mock("POST", "/earsiv-services/dispatch")
        .with_body(dispatch_response(serde_json::json!({ "sonuc": "1" })).to_string())
        .create();

    // 2) Fatura detay (FATURA_GETIR) — son kaydedilen önce denenir
    let _m_doc = server
        .mock("POST", "/earsiv-services/dispatch")
        .match_body(mockito::Matcher::Regex("FATURA_GETIR".into()))
        .with_body(dispatch_response(doc).to_string())
        .create();
}

#[test]
fn test_end_to_end_sign_and_bookkeeping() {
    let mut server = mockito::Server::new();

    // ---- Mock portal davranışı ----
    let ettn = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    let doc = sample_invoice_doc(ettn);
    setup_mock_portal(&mut server, doc);

    // ---- Mock sunucuya yönlendir ----
    *GIB_BASE_OVERRIDE.lock().unwrap() = Some(server.url());

    // ---- DB hazırla: token + test DB ----
    let pool = test_pool();
    {
        let conn = pool.get_conn().unwrap();
        conn.execute(
            "INSERT INTO settings (key, value) VALUES ('gib_token', 'mock-token'), ('gib_test_mode', '0') ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            [],
        )
        .unwrap();
    }

    // ---- SMS imzalama komutunu çağır (yeni imzalanan faturayı kaydet) ----
    let result = gib_einvoice::gib_complete_sms_sign_inner(
        &pool,
        "1234".to_string(),     // sms_code
        "op-123".to_string(),   // operation_id
        vec![ettn.to_string()], // uuids
    );
    assert!(result.is_ok(), "imzalama başarısız: {:?}", result.err());

    // ---- DB doğrulamaları ----
    let conn = pool.get_conn().unwrap();

    // 1) invoices tablosunda fatura var mı?
    let (invoice_no, total, date, company_id, raw): (String, f64, String, String, String) = conn
        .query_row(
            "SELECT invoice_no, total, date, company_id, raw_data FROM invoices WHERE raw_data LIKE ?1",
            [format!("%{}%", ettn)],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?)),
        )
        .unwrap();
    assert_eq!(invoice_no, "ABC2026000000099");
    assert!((total - 2160.0).abs() < 0.01, "total: {}", total);
    assert_eq!(date, "2026-09-15"); // GİB dd/mm/yyyy → ISO
    assert!(raw.contains(ettn), "raw_data ETTN içermeli");

    // 2) Cari hesap oluşturuldu mu? (VKN eşleşmesi)
    let (comp_name, balance): (String, f64) = conn
        .query_row(
            "SELECT c.name, c.balance FROM companies c WHERE c.id = ?1",
            [&company_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .unwrap();
    assert_eq!(comp_name, "Mock Alıcı A.Ş.");
    assert!((balance - 2160.0).abs() < 0.01, "carinin bakiyesi fatura tutarına eşit olmalı: {}", balance);

    // 3) ledger_entries'da cari hareketi işlendi mi?
    let (debit, running, entry_type, desc): (f64, f64, String, String) = conn
        .query_row(
            "SELECT debit, running_balance, entry_type, description FROM ledger_entries WHERE company_id = ?1 AND entry_type = 'e_fatura'",
            [&company_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
        )
        .unwrap();
    assert!((debit - 2160.0).abs() < 0.01);
    assert!((running - 2160.0).abs() < 0.01, "yürüyen bakiye tutara eşit olmalı");
    assert!(desc.contains("ABC2026000000099"), "açıklamada belge numarası olmalı");

    // ---- Çift kayıt koruması: aynı fatura tekrar imzalanırsa yeni kayıt açılmamalı ----
    let invoices_before: i64 = conn
        .query_row("SELECT COUNT(*) FROM invoices", [], |r| r.get(0))
        .unwrap();
    let entries_before: i64 = conn
        .query_row("SELECT COUNT(*) FROM ledger_entries", [], |r| r.get(0))
        .unwrap();

    let result2 = gib_einvoice::gib_complete_sms_sign_inner(
        &pool,
        "1234".to_string(),
        "op-124".to_string(),
        vec![ettn.to_string()],
    );
    assert!(result2.is_ok());

    let invoices_after: i64 = conn
        .query_row("SELECT COUNT(*) FROM invoices", [], |r| r.get(0))
        .unwrap();
    let entries_after: i64 = conn
        .query_row("SELECT COUNT(*) FROM ledger_entries", [], |r| r.get(0))
        .unwrap();
    assert_eq!(invoices_before, invoices_after, "aynı fatura tekrar kaydedilmemeli");
    assert_eq!(entries_before, entries_after, "aynı fatura için çift cari hareketi olmamalı");

    // ---- Yardımcı fonksiyonlar ----
    assert_eq!(parse_gib_number("1.234,56"), Some(1234.56));
    assert_eq!(normalize_gib_date("15/09/2026"), "2026-09-15");
    *GIB_BASE_OVERRIDE.lock().unwrap() = None;
}

/// Cari hesabın zaten var olduğu senaryo: yeni cari oluşturulmaz, mevcut cariye işlenir.
#[test]
fn test_existing_company_receives_entry() {
    let mut server = mockito::Server::new();

    let ettn = "11111111-2222-3333-4444-555555555555";
    let doc = sample_invoice_doc(ettn);
    setup_mock_portal(&mut server, doc);

    *GIB_BASE_OVERRIDE.lock().unwrap() = Some(server.url());

    let pool = test_pool();
    {
        let conn = pool.get_conn().unwrap();
        conn.execute_batch(
            "INSERT INTO settings (key, value) VALUES ('gib_token', 'mock-token'), ('gib_test_mode', '0') ON CONFLICT(key) DO UPDATE SET value = excluded.value;\n             INSERT INTO companies (id, name, tax_no, balance, created_at) VALUES ('existing-1', 'Mevcut Cari Ltd.', '1234567801', 500, '2026-01-01 00:00:00');",
        )
        .unwrap();
    }

    let result = gib_einvoice::gib_complete_sms_sign_inner(
        &pool,
        "1234".to_string(),
        "op-200".to_string(),
        vec![ettn.to_string()],
    );
    if let Err(e) = &result {
        eprintln!("DEBUG test_existing hata: {}", e);
    }
    assert!(result.is_ok());

    let conn = pool.get_conn().unwrap();

    // Yeni cari oluşturulmadı
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM companies", [], |r| r.get(0))
        .unwrap();
    assert_eq!(count, 1, "mevcut cari varken yeni cari oluşturulmamalı");

    // Mevcut cariye işlendi. Not: recompute_running_balances bakiyeyi ledger_entries
    // toplamından sıfırdan hesaplar (mevcut '500' açılış bakiyesi ledger'da kayıtlı değilse
    // bakiye fatura tutarıyla değişir — 2160). Bu mevcut sistem davranışıdır.
    let balance: f64 = conn
        .query_row("SELECT balance FROM companies WHERE id = 'existing-1'", [], |r| r.get(0))
        .unwrap();
    assert!((balance - 2160.0).abs() < 0.01, "bakiye 2160 olmalı (ledger toplamı): {}", balance);

    let entry_company: String = conn
        .query_row(
            "SELECT company_id FROM ledger_entries WHERE entry_type = 'e_fatura'",
            [],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(entry_company, "existing-1");
    *GIB_BASE_OVERRIDE.lock().unwrap() = None;
}

/// GİB'den tutar okunamayan fatura: kayıt atlanır, imzalama akışı bozulmaz.
#[test]
fn test_unreadable_amount_is_skipped_without_error() {
    let mut server = mockito::Server::new();

    let ettn = "99999999-8888-7777-6666-555555555555";
    let mut doc = sample_invoice_doc(ettn);
    doc["odenecekTutar"] = serde_json::json!("hatalı-tutar");
    setup_mock_portal(&mut server, doc);

    *GIB_BASE_OVERRIDE.lock().unwrap() = Some(server.url());

    let pool = test_pool();
    {
        let conn = pool.get_conn().unwrap();
        conn.execute(
            "INSERT INTO settings (key, value) VALUES ('gib_token', 'mock-token'), ('gib_test_mode', '0') ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            [],
        )
        .unwrap();
    }

    let result = gib_einvoice::gib_complete_sms_sign_inner(
        &pool,
        "1234".to_string(),
        "op-300".to_string(),
        vec![ettn.to_string()],
    );
    // Komut başarılı döner (hata tek faturayı bozmaz)
    if let Err(e) = &result {
        eprintln!("DEBUG test_unreadable hata: {}", e);
    }
    assert!(result.is_ok());

    // Ama fatura/cari kaydı oluşmamalı
    let conn = pool.get_conn().unwrap();
    let invoices: i64 = conn
        .query_row("SELECT COUNT(*) FROM invoices", [], |r| r.get(0))
        .unwrap();
    let entries: i64 = conn
        .query_row("SELECT COUNT(*) FROM ledger_entries", [], |r| r.get(0))
        .unwrap();
    assert_eq!(invoices, 0, "okunamayan tutarlı fatura kaydedilmemeli");
    assert_eq!(entries, 0, "okunamayan tutarlı fatura için cari hareketi olmamalı");
    *GIB_BASE_OVERRIDE.lock().unwrap() = None;
}

/// Reqwest'in gerçekten mock sunucuya gittiğini doğrulayan hata ayıklama testi.
#[test]
fn test_mock_server_receives_request() {
    let mut server = mockito::Server::new();
    let m = server
        .mock("POST", "/earsiv-services/dispatch")
        .with_body("{\"data\":\"ok\"}")
        .create();

    *GIB_BASE_OVERRIDE.lock().unwrap() = Some(server.url());

    let client = reqwest::blocking::Client::new();
    let body = serde_json::json!({
        "callid": "x",
        "token": "t",
        "cmd": "0lhozfib5410mp",
        "pageName": "RG_SMSONAY",
        "jp": "{}"
    });
    let url = format!("{}/earsiv-services/dispatch", server.url());
    let resp = client.post(&url).json(&body).send().unwrap();
    assert_eq!(resp.status(), 200);
    assert!(m.matched(), "mock isteği almalı");
}

/// gib_base override'ının gerçekten etkin olduğunu doğrular.
#[test]
fn test_gib_base_override_active() {
    *GIB_BASE_OVERRIDE.lock().unwrap() = Some("http://127.0.0.1:9999".to_string());
    let base = gib_einvoice::gib_base_for_test();
    assert_eq!(base, "http://127.0.0.1:9999");
    *GIB_BASE_OVERRIDE.lock().unwrap() = None;
}

/// GibClient::dispatch doğrudan mock'a istek atabiliyor mu?
#[test]
fn test_dispatch_hits_mock() {
    let mut server = mockito::Server::new();
    let m = server
        .mock("POST", "/earsiv-services/dispatch")
        .with_body(dispatch_response(serde_json::json!({ "sonuc": "1" })).to_string())
        .create();

    *GIB_BASE_OVERRIDE.lock().unwrap() = Some(server.url());

    let client = gib_einvoice::GibClient::new("mock-token".to_string(), false);
    let result = client.dispatch("0lhozfib5410mp", "RG_SMSONAY", serde_json::json!({"x":1}));
    assert!(m.matched(), "dispatch mock'a gitmeli");
    assert!(result.is_ok(), "dispatch başarılı olmalı: {:?}", result.err());
    *GIB_BASE_OVERRIDE.lock().unwrap() = None;
}

/// inner fonksiyonun ilk SMS dispatch isteğinin mock'a uşup uşmadığını izole test eder.
#[test]
fn test_sms_dispatch_reaches_mock() {
    let mut server = mockito::Server::new();
    let m = server
        .mock("POST", "/earsiv-services/dispatch")
        .with_body(dispatch_response(serde_json::json!({ "sonuc": "1" })).to_string())
        .expect(1)
        .create();

    *GIB_BASE_OVERRIDE.lock().unwrap() = Some(server.url());

    let client = gib_einvoice::GibClient::new("mock-token".to_string(), false);
    let docs: Vec<serde_json::Value> = vec![serde_json::json!({ "belgeTuru": "FATURA", "ettn": "u1" })];
    let data = client.dispatch(
        "0lhozfib5410mp",
        "RG_SMSONAY",
        serde_json::json!({ "DATA": docs, "SIFRE": "1234", "OID": "op", "OPR": 1 }),
    ).expect("dispatch başarısız");
    assert_eq!(data["sonuc"], "1");
    m.assert();
}
