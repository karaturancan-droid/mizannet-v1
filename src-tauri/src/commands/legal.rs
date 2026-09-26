use crate::db::DbPool;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Serialize, Deserialize)]
pub struct HesapPlani {
    pub kod: String,
    pub ad: String,
    pub sinif: String,
    pub grup: String,
    pub tur: String,
}

#[derive(Serialize, Deserialize)]
pub struct KanuniParametre {
    pub parametre: String,
    pub deger: f64,
    pub yil: i64,
    pub aciklama: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct IsKanunuKural {
    pub madde: String,
    pub baslik: String,
    pub ozet: String,
    pub kategori: String,
    pub uygulanabilir: bool,
}

#[derive(Serialize, Deserialize)]
pub struct MaasHesaplamaInput {
    pub brut_maas: f64,
    pub calisilan_gun: Option<i32>,
    pub fazla_mesai_saat: Option<f64>,
    pub tatil_calisma_saat: Option<f64>,
}

#[derive(Serialize, Deserialize)]
pub struct MaasHesaplamaResult {
    pub brut_maas: f64,
    pub sgk_isci_payi: f64,
    pub issizlik_isci_payi: f64,
    pub gelir_vergisi_matrahi: f64,
    pub gelir_vergisi: f64,
    pub damga_vergisi: f64,
    pub toplam_kesinti: f64,
    pub net_maas: f64,
    pub sgk_isveren_payi: f64,
    pub isveren_toplam_maliyeti: f64,
    pub fazla_mesai_ucreti: f64,
    pub tatil_calisma_ucreti: f64,
    pub aciklama: Vec<String>,
}

#[derive(Serialize, Deserialize)]
pub struct YillikIzinHesaplama {
    pub hizmet_yili: f64,
    pub hizmet_ay: i64,
    pub hizmet_gun: i64,
    pub izin_hakki_gun: f64,
    pub kullanilan_izin: f64,
    pub kalan_izin: f64,
    pub aciklama: String,
    pub kanun_maddesi: String,
}

#[derive(Serialize, Deserialize)]
pub struct IhbarSuresi {
    pub hafta: f64,
    pub gun: f64,
    pub tazminat_tutari: f64,
    pub aciklama: String,
}

// ──────────────────────────────────────────
// Hesap Planı
// ──────────────────────────────────────────

#[tauri::command]
pub fn list_hesap_plani(
    pool: State<DbPool>,
    sinif_filter: Option<String>,
    tur_filter: Option<String>,
    search: Option<String>,
) -> Result<Vec<HesapPlani>, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let mut conditions = vec![];
    if let Some(s) = &sinif_filter {
        conditions.push(format!("sinif LIKE '%{}%'", s.replace('\'', "''")));
    }
    if let Some(t) = &tur_filter {
        conditions.push(format!("tur = '{}'", t.replace('\'', "''")));
    }
    if let Some(q) = &search {
        conditions.push(format!(
            "(kod LIKE '%{q}%' OR ad LIKE '%{q}%')",
            q = q.replace('\'', "''")
        ));
    }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    let sql = format!(
        "SELECT kod, ad, sinif, grup, tur FROM hesap_plani {} ORDER BY kod ASC",
        where_clause
    );

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(HesapPlani {
                kod: row.get(0)?,
                ad: row.get(1)?,
                sinif: row.get(2)?,
                grup: row.get(3)?,
                tur: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

// ──────────────────────────────────────────
// Kanuni Parametreler
// ──────────────────────────────────────────

#[tauri::command]
pub fn list_kanuni_parametreler(pool: State<DbPool>) -> Result<Vec<KanuniParametre>, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT parametre, deger, yil, aciklama FROM kanuni_parametreler ORDER BY parametre ASC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(KanuniParametre {
                parametre: row.get(0)?,
                deger: row.get(1)?,
                yil: row.get(2)?,
                aciklama: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_kanuni_parametre(
    pool: State<DbPool>,
    parametre: String,
    deger: f64,
    yil: i64,
) -> Result<(), String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE kanuni_parametreler SET deger = ?1, yil = ?2 WHERE parametre = ?3",
        rusqlite::params![deger, yil, parametre],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

// ──────────────────────────────────────────
// İş Kanunu Kuralları
// ──────────────────────────────────────────

#[tauri::command]
pub fn list_is_kanunu_kurallar(
    pool: State<DbPool>,
    kategori: Option<String>,
) -> Result<Vec<IsKanunuKural>, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let sql = if let Some(k) = &kategori {
        format!(
            "SELECT madde, baslik, ozet, kategori, uygulanabilir FROM is_kanunu_kurallar WHERE kategori = '{}' ORDER BY madde ASC",
            k.replace('\'', "''")
        )
    } else {
        "SELECT madde, baslik, ozet, kategori, uygulanabilir FROM is_kanunu_kurallar ORDER BY madde ASC".to_string()
    };

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(IsKanunuKural {
                madde: row.get(0)?,
                baslik: row.get(1)?,
                ozet: row.get(2)?,
                kategori: row.get(3)?,
                uygulanabilir: row.get::<_, i64>(4)? == 1,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

// ──────────────────────────────────────────
// Maaş Hesaplama Motoru (4857 + GVK + SGK)
// ──────────────────────────────────────────

fn get_param(conn: &rusqlite::Connection, parametre: &str) -> f64 {
    conn.query_row(
        "SELECT deger FROM kanuni_parametreler WHERE parametre = ?1",
        rusqlite::params![parametre],
        |r| r.get::<_, f64>(0),
    )
    .unwrap_or(0.0)
}

#[tauri::command]
pub fn hesapla_net_maas(
    pool: State<DbPool>,
    input: MaasHesaplamaInput,
) -> Result<MaasHesaplamaResult, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;

    let sgk_isci_orani = get_param(&conn, "sgk_isci_payi"); // 0.14
    let issizlik_isci_orani = 0.01_f64; // %1 işçi işsizlik
    let sgk_isveren_orani = get_param(&conn, "sgk_isveren_payi"); // 0.205
    let issizlik_isveren_orani = 0.02_f64;
    let damga_orani = get_param(&conn, "damga_vergisi_orani"); // 0.00759
    let fazla_katsayi = get_param(&conn, "fazla_mesai_katsayi_normal"); // 1.5
    let tatil_katsayi = get_param(&conn, "fazla_mesai_katsayi_tatil"); // 2.0

    // Günlük ve saatlik ücret
    let gunluk = input.brut_maas / 30.0;
    let saatlik = gunluk / 7.5;

    // Fazla mesai ücreti (4857/41)
    let fazla_mesai_ucreti = input.fazla_mesai_saat.unwrap_or(0.0) * saatlik * fazla_katsayi;
    // Tatil çalışma ücreti (4857/47)
    let tatil_calisma_ucreti = input.tatil_calisma_saat.unwrap_or(0.0) * saatlik * tatil_katsayi;

    let toplam_brut = input.brut_maas + fazla_mesai_ucreti + tatil_calisma_ucreti;

    // SGK kesintileri
    let sgk_isci = toplam_brut * sgk_isci_orani;
    let issizlik_isci = toplam_brut * issizlik_isci_orani;

    // Gelir vergisi matrahı = Brüt - SGK/İşsizlik işçi payları
    let gv_matrahi = toplam_brut - sgk_isci - issizlik_isci;

    // Kümülatif GV hesabı (2025 dilimleri, aylık)
    // Yıllık dilimleri 12'ye bölüyoruz → aylık sınırlar
    let (dilim1_ust, dilim2_ust, dilim3_ust) = (158_000.0 / 12.0, 330_000.0 / 12.0, 1_200_000.0 / 12.0);
    let gelir_vergisi = if gv_matrahi <= dilim1_ust {
        gv_matrahi * 0.15
    } else if gv_matrahi <= dilim2_ust {
        dilim1_ust * 0.15 + (gv_matrahi - dilim1_ust) * 0.20
    } else if gv_matrahi <= dilim3_ust {
        dilim1_ust * 0.15 + (dilim2_ust - dilim1_ust) * 0.20 + (gv_matrahi - dilim2_ust) * 0.27
    } else {
        dilim1_ust * 0.15 + (dilim2_ust - dilim1_ust) * 0.20 + (dilim3_ust - dilim2_ust) * 0.27
            + (gv_matrahi - dilim3_ust) * 0.35
    };

    let damga_vergisi = toplam_brut * damga_orani;

    let toplam_kesinti = sgk_isci + issizlik_isci + gelir_vergisi + damga_vergisi;
    let net_maas = toplam_brut - toplam_kesinti;

    // İşveren maliyeti
    let sgk_isveren = toplam_brut * sgk_isveren_orani;
    let issizlik_isveren = toplam_brut * issizlik_isveren_orani;
    let isveren_toplam = toplam_brut + sgk_isveren + issizlik_isveren;

    let mut aciklama = vec![
        format!("Brüt Maaş: {:.2} TL", input.brut_maas),
        format!("SGK İşçi Payı (%{}): -{:.2} TL", sgk_isci_orani * 100.0, sgk_isci),
        format!("İşsizlik Sigortası İşçi (%1): -{:.2} TL", issizlik_isci),
        format!("GV Matrahı: {:.2} TL", gv_matrahi),
        format!("Gelir Vergisi: -{:.2} TL", gelir_vergisi),
        format!("Damga Vergisi (%0.759): -{:.2} TL", damga_vergisi),
        format!("NET MAAŞ: {:.2} TL", net_maas),
        format!("İşveren SGK (%{}): {:.2} TL", sgk_isveren_orani * 100.0, sgk_isveren),
        format!("İşveren Toplam Maliyeti: {:.2} TL", isveren_toplam),
    ];

    if fazla_mesai_ucreti > 0.0 {
        aciklama.push(format!("Fazla Mesai (4857/41 +%50): +{:.2} TL", fazla_mesai_ucreti));
    }
    if tatil_calisma_ucreti > 0.0 {
        aciklama.push(format!("Tatil Çalışması (4857/47 +%100): +{:.2} TL", tatil_calisma_ucreti));
    }

    Ok(MaasHesaplamaResult {
        brut_maas: input.brut_maas,
        sgk_isci_payi: sgk_isci,
        issizlik_isci_payi: issizlik_isci,
        gelir_vergisi_matrahi: gv_matrahi,
        gelir_vergisi,
        damga_vergisi,
        toplam_kesinti,
        net_maas,
        sgk_isveren_payi: sgk_isveren,
        isveren_toplam_maliyeti: isveren_toplam,
        fazla_mesai_ucreti,
        tatil_calisma_ucreti,
        aciklama,
    })
}

// ──────────────────────────────────────────
// Yıllık İzin Hesaplama (4857/53)
// ──────────────────────────────────────────

#[tauri::command]
pub fn hesapla_yillik_izin(
    pool: State<DbPool>,
    hire_date: String,
    kullanilan_izin: Option<f64>,
) -> Result<YillikIzinHesaplama, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let ise_giris = chrono::NaiveDate::parse_from_str(&hire_date, "%Y-%m-%d")
        .map_err(|_| "Geçersiz tarih formatı. YYYY-MM-DD kullanın.".to_string())?;
    let bugun = chrono::Local::now().date_naive();
    let toplam_gun = (bugun - ise_giris).num_days().max(0);
    let toplam_ay = toplam_gun / 30;
    let hizmet_yili = toplam_gun as f64 / 365.25;

    let izin_hakki = get_param(&conn, if hizmet_yili < 1.0 {
        "yillik_izin_1_5_yil_gun" // Henüz hak kazanmadı
    } else if hizmet_yili < 5.0 {
        "yillik_izin_1_5_yil_gun"
    } else if hizmet_yili < 15.0 {
        "yillik_izin_5_15_yil_gun"
    } else {
        "yillik_izin_15_plus_yil_gun"
    });

    let izin_hakki_gun = if hizmet_yili < 1.0 { 0.0 } else { izin_hakki };
    let kullanilan = kullanilan_izin.unwrap_or(0.0);
    let kalan = (izin_hakki_gun - kullanilan).max(0.0);

    let aciklama = if hizmet_yili < 1.0 {
        "1 yılı doldurmadığı için yıllık izin hakkı doğmamıştır (4857/54).".to_string()
    } else if hizmet_yili < 5.0 {
        format!("1-5 yıl arası hizmet → 14 gün izin hakkı (4857/53). Kalan: {} gün.", kalan)
    } else if hizmet_yili < 15.0 {
        format!("5-15 yıl arası hizmet → 20 gün izin hakkı (4857/53). Kalan: {} gün.", kalan)
    } else {
        format!("15+ yıl hizmet → 26 gün izin hakkı (4857/53). Kalan: {} gün.", kalan)
    };

    Ok(YillikIzinHesaplama {
        hizmet_yili,
        hizmet_ay: toplam_ay,
        hizmet_gun: toplam_gun,
        izin_hakki_gun,
        kullanilan_izin: kullanilan,
        kalan_izin: kalan,
        aciklama,
        kanun_maddesi: "4857/53, 4857/54".to_string(),
    })
}

// ──────────────────────────────────────────
// İhbar Süresi Hesaplama (4857/17)
// ──────────────────────────────────────────

#[tauri::command]
pub fn hesapla_ihbar_suresi(
    pool: State<DbPool>,
    hire_date: String,
    brut_maas: f64,
) -> Result<IhbarSuresi, String> {
    let conn = pool.get_conn().map_err(|e| e.to_string())?;
    let ise_giris = chrono::NaiveDate::parse_from_str(&hire_date, "%Y-%m-%d")
        .map_err(|_| "Geçersiz tarih formatı. YYYY-MM-DD kullanın.".to_string())?;
    let bugun = chrono::Local::now().date_naive();
    let toplam_ay = ((bugun - ise_giris).num_days() / 30) as f64;

    let param_key = if toplam_ay < 6.0 {
        "ihbar_suresi_0_6_ay_gun"
    } else if toplam_ay < 18.0 {
        "ihbar_suresi_6_18_ay_gun"
    } else if toplam_ay < 36.0 {
        "ihbar_suresi_18_36_ay_gun"
    } else {
        "ihbar_suresi_36_plus_ay_gun"
    };

    let hafta = get_param(&conn, param_key);
    let gun = hafta * 7.0;
    let gunluk_ucret = brut_maas / 30.0;
    let tazminat_tutari = gun * gunluk_ucret;

    let aciklama = format!(
        "Çalışma süresi: {:.0} ay. 4857/17'ye göre ihbar süresi: {:.0} hafta ({:.0} gün). İhbar tazminatı: {:.2} TL",
        toplam_ay, hafta, gun, tazminat_tutari
    );

    Ok(IhbarSuresi {
        hafta,
        gun,
        tazminat_tutari,
        aciklama,
    })
}

// ──────────────────────────────────────────
// PDF Kanun Metni Açma
// ──────────────────────────────────────────

#[tauri::command]
pub fn open_kanun_pdf(app: tauri::AppHandle, kanun: String) -> Result<(), String> {
    let file_name = match kanun.as_str() {
        "is_kanunu" => "is-kanunu-4857.pdf",
        "vuk" => "vuk-213.pdf",
        "hesap_plani" => "tek-duzen-hesap-plani.pdf",
        _ => return Err("Bilinmeyen kanun türü".to_string()),
    };

    let resource_path = app
        .path()
        .resource_dir()
        .map_err(|e| e.to_string())?
        .join(file_name);

    if !resource_path.exists() {
        return Err(format!("PDF dosyası bulunamadı: {}", resource_path.display()));
    }

    std::process::Command::new("cmd")
        .args(["/C", "start", "", &resource_path.to_string_lossy()])
        .spawn()
        .map_err(|e| e.to_string())?;

    Ok(())
}
