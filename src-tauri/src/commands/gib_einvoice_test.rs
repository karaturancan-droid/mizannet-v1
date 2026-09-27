//! GİB e-Fatura modülü birim testleri (çevrimdışı).
//! Canlı portal testi elle yapılır (docs/e-fatura-kurulum-rehberi.md).

#[cfg(test)]
mod tests {
    use super::super::gib_einvoice::{build_invoice_payload, normalize_gib_date, parse_gib_number, EInvoice, EInvoiceItem};

    // ---- parse_gib_number ----
    #[test]
    fn test_parse_gib_number_turkish() {
        assert_eq!(parse_gib_number("1.234,56"), Some(1234.56));
        assert_eq!(parse_gib_number("12,5"), Some(12.5));
        assert_eq!(parse_gib_number("0,00"), Some(0.0));
        assert_eq!(parse_gib_number("  2.500,00  "), Some(2500.0));
    }

    #[test]
    fn test_parse_gib_number_plain() {
        assert_eq!(parse_gib_number("1234.56"), Some(1234.56));
        assert_eq!(parse_gib_number("100"), Some(100.0));
        assert_eq!(parse_gib_number(""), None);
        assert_eq!(parse_gib_number("abc"), None);
    }

    // ---- normalize_gib_date ----
    #[test]
    fn test_normalize_gib_date() {
        assert_eq!(normalize_gib_date("05/03/2026"), "2026-03-05");
        assert_eq!(normalize_gib_date("31/12/2026"), "2026-12-31");
        assert_eq!(normalize_gib_date("2026-03-05"), "2026-03-05"); // zaten ISO
        assert_eq!(normalize_gib_date(""), "");
    }

    // ---- build_invoice_payload ----
    fn sample_invoice() -> EInvoice {
        EInvoice {
            vkn_tckn: "1234567801".into(),
            alici_unvan: "Test A.Ş.".into(),
            alici_adi: String::new(),
            alici_soyadi: String::new(),
            vergi_dairesi: "Kadıköy".into(),
            mahalle_semt_ilce: "Kadıköy".into(),
            sehir: "İstanbul".into(),
            ulke: "Türkiye".into(),
            adres: "Test Cad. No 1".into(),
            eposta: "test@test.com".into(),
            tel: "5555555555".into(),
            not_aciklama: String::new(),
            para_birimi: "TRY".into(),
            doviz_kuru: 1.0,
            fatura_tipi: "SATIS".into(),
            tarih: "01/09/2026".into(),
            saat: "10:00:00".into(),
            items: vec![EInvoiceItem {
                mal_hizmet: "Danışmanlık".into(),
                miktar: 2.0,
                birim: "Adet".into(),
                birim_fiyat: 1000.0,
                kdv_orani: 20.0,
                iskonto_orani: 10.0,
            }],
        }
    }

    #[test]
    fn test_payload_totals() {
        let inv = sample_invoice();
        let p = build_invoice_payload(&inv).expect("payload oluşturulmalı");
        // Fiyat 2x1000 = 2000, iskonto %10 = 200 → matrah 1800, KDV %20 = 360, toplam 2160
        assert_eq!(p["matrah"], "1800.00");
        assert_eq!(p["hesaplanankdv"], "360.00");
        assert_eq!(p["odenecekTutar"], "2160.00");
        assert_eq!(p["toplamIskonto"], "200.00");
    }

    #[test]
    fn test_payload_kurumsal_alici() {
        let inv = sample_invoice(); // 10 hane VKN
        let p = build_invoice_payload(&inv).unwrap();
        assert_eq!(p["aliciUnvan"], "Test A.Ş.");
        assert_eq!(p["aliciAdi"], "");
    }

    #[test]
    fn test_payload_sahis_alici() {
        let mut inv = sample_invoice();
        inv.vkn_tckn = "12345678901".into(); // 11 hane TCKN
        inv.alici_unvan = String::new();
        inv.alici_adi = "Ahmet".into();
        inv.alici_soyadi = "Yılmaz".into();
        let p = build_invoice_payload(&inv).unwrap();
        assert_eq!(p["aliciUnvan"], "");
        assert_eq!(p["aliciAdi"], "Ahmet");
        assert_eq!(p["aliciSoyadi"], "Yılmaz");
    }

    #[test]
    fn test_payload_validation_errors() {
        let mut inv = sample_invoice();
        inv.vkn_tckn = "123".into();
        assert!(build_invoice_payload(&inv).is_err());

        let mut inv = sample_invoice();
        inv.items.clear();
        assert!(build_invoice_payload(&inv).is_err());

        let mut inv = sample_invoice();
        inv.ulke = "  ".into();
        assert!(build_invoice_payload(&inv).is_err());

        let mut inv = sample_invoice();
        inv.items[0].kdv_orani = 15.0; // geçersiz oran
        assert!(build_invoice_payload(&inv).is_err());
    }

    #[test]
    fn test_payload_multi_item_totals() {
        let mut inv = sample_invoice();
        inv.items.push(EInvoiceItem {
            mal_hizmet: "Kira".into(),
            miktar: 1.0,
            birim: "Adet".into(),
            birim_fiyat: 500.0,
            kdv_orani: 0.0,
            iskonto_orani: 0.0,
        });
        let p = build_invoice_payload(&inv).unwrap();
        // 1800 + 500 = 2300 matrah, KDV 360, toplam 2660
        assert_eq!(p["matrah"], "2300.00");
        assert_eq!(p["odenecekTutar"], "2660.00");
    }
}
