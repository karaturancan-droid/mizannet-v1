use rusqlite::Connection;

/// Runs all migrations idempotently. Safe to call on every app startup.
pub fn run_migrations(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch("PRAGMA foreign_keys = ON;")?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            applied_at TEXT NOT NULL
        )",
        [],
    )?;

    let migrations: Vec<(i64, &str)> = vec![
        (1, "initial_schema"),
        (2, "legal_data"),
        (3, "chat_sessions_schema"),
        (4, "telegram_integration"),
        (5, "media_support"),
        (6, "product_image"),
        (7, "worker_salary_details"),
        (8, "worker_photo"),
        (9, "licensing_settings"),
        (10, "vehicle_category"),
        (11, "whatsapp_approvals"),
        (12, "workflow_jobs"),
        (13, "worker_contact"),
        (14, "branches"),
        (15, "asistan_library"),
        (16, "accounts_and_bank_statements"),
    ];

    for (version, _name) in migrations {
        let already_applied: bool = conn
            .query_row(
                "SELECT COUNT(*) FROM schema_migrations WHERE version = ?1",
                [version],
                |row| row.get::<_, i64>(0),
            )
            .map(|c| c > 0)
            .unwrap_or(false);

        if !already_applied {
            match version {
                1 => migration_1_initial_schema(conn)?,
                2 => migration_2_legal_data(conn)?,
                3 => migration_3_chat_sessions(conn)?,
                4 => migration_4_telegram(conn)?,
                5 => migration_5_media_support(conn)?,
                6 => migration_6_product_image(conn)?,
                7 => migration_7_worker_salary_details(conn)?,
                8 => migration_8_worker_photo(conn)?,
                9 => migration_9_licensing(conn)?,
                10 => migration_10_vehicle_category(conn)?,
                11 => migration_11_whatsapp_approvals(conn)?,
                12 => migration_12_workflow_jobs(conn)?,
                13 => migration_13_worker_contact(conn)?,
                14 => migration_14_branches(conn)?,
                15 => migration_15_asistan_library(conn)?,
                16 => migration_16_accounts_bank_statements(conn)?,
                _ => {}
            }
            conn.execute(
                "INSERT INTO schema_migrations (version, applied_at) VALUES (?1, ?2)",
                rusqlite::params![version, chrono::Utc::now().to_rfc3339()],
            )?;
        }
    }

    Ok(())
}

fn migration_1_initial_schema(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS companies (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            tax_no TEXT,
            phone TEXT,
            email TEXT,
            contact_person TEXT,
            balance REAL NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS ledger_entries (
            id TEXT PRIMARY KEY,
            company_id TEXT NOT NULL,
            date TEXT NOT NULL,
            document_no TEXT,
            description TEXT,
            debit REAL NOT NULL DEFAULT 0,
            credit REAL NOT NULL DEFAULT 0,
            running_balance REAL NOT NULL DEFAULT 0,
            entry_type TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS recycle_bin (
            id TEXT PRIMARY KEY,
            entity_type TEXT NOT NULL,
            record_data TEXT NOT NULL,
            deleted_at TEXT NOT NULL,
            restore_deadline TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            sku TEXT,
            category TEXT,
            unit TEXT,
            purchase_price REAL DEFAULT 0,
            sale_price REAL DEFAULT 0,
            min_stock REAL DEFAULT 0,
            current_stock REAL DEFAULT 0,
            supplier TEXT,
            image_path TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS stock_movements (
            id TEXT PRIMARY KEY,
            product_id TEXT NOT NULL,
            type TEXT NOT NULL,
            quantity REAL NOT NULL,
            date TEXT NOT NULL,
            note TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS vehicles (
            id TEXT PRIMARY KEY,
            plate TEXT NOT NULL,
            brand TEXT,
            model TEXT,
            year INTEGER,
            status TEXT,
            km REAL,
            inspection_due_date TEXT,
            insurance_due_date TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS vehicle_expenses (
            id TEXT PRIMARY KEY,
            vehicle_id TEXT NOT NULL,
            type TEXT,
            amount REAL NOT NULL DEFAULT 0,
            date TEXT NOT NULL,
            note TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS tires (
            id TEXT PRIMARY KEY,
            vehicle_id TEXT NOT NULL,
            position TEXT,
            dot_code TEXT,
            tread_depth REAL,
            change_date TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS tax_items (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            period TEXT,
            amount REAL NOT NULL DEFAULT 0,
            due_date TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'bekliyor',
            receipt_path TEXT,
            notes TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS workers (
            id TEXT PRIMARY KEY,
            full_name TEXT NOT NULL,
            tc_no TEXT,
            birth_date TEXT,
            hire_date TEXT,
            exit_date TEXT,
            position TEXT,
            sgk_no TEXT,
            iban TEXT,
            salary REAL DEFAULT 0,
            contract_end_date TEXT,
            payment_day INTEGER DEFAULT 5,
            phone TEXT,
            email TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS leaves (
            id TEXT PRIMARY KEY,
            worker_id TEXT NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            type TEXT,
            days REAL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS overtimes (
            id TEXT PRIMARY KEY,
            worker_id TEXT NOT NULL,
            date TEXT NOT NULL,
            hours REAL NOT NULL,
            rate REAL NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS payrolls (
            id TEXT PRIMARY KEY,
            worker_id TEXT NOT NULL,
            period TEXT NOT NULL,
            gross REAL,
            net REAL,
            deductions REAL,
            status TEXT,
            receipt_path TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS documents (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            category TEXT,
            file_type TEXT,
            file_path TEXT,
            related_type TEXT,
            related_id TEXT,
            expiry_date TEXT,
            tags TEXT,
            notes TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS worker_advances (
            id TEXT PRIMARY KEY,
            worker_id TEXT NOT NULL,
            amount REAL NOT NULL,
            date TEXT NOT NULL,
            description TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            module TEXT NOT NULL,
            related_id TEXT,
            due_date TEXT,
            days_left INTEGER,
            status TEXT NOT NULL DEFAULT 'aktif',
            source_type TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS invoices (
            id TEXT PRIMARY KEY,
            company_id TEXT,
            invoice_no TEXT,
            date TEXT,
            subtotal REAL,
            vat_amount REAL,
            total REAL,
            iban TEXT,
            raw_data TEXT,
            status TEXT NOT NULL DEFAULT 'taslak',
            file_path TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        );

        CREATE TABLE IF NOT EXISTS import_hashes (
            id TEXT PRIMARY KEY,
            file_hash TEXT NOT NULL UNIQUE,
            file_name TEXT,
            imported_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS asistan_messages (
            id TEXT PRIMARY KEY,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            suggested_action TEXT,
            session_id TEXT -- Eklendi
        );
        "#,
    )
}

fn migration_3_chat_sessions(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS chat_sessions (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        "#
    )?;
    
    // Asistan_messages'da session_id yoksa ekle (eski sürümler için yedek güvence, normalde migration_1 de güncellendi)
    let _ = conn.execute("ALTER TABLE asistan_messages ADD COLUMN session_id TEXT", []);
    
    // Eski mesajları tek bir default session'a topla
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM asistan_messages WHERE session_id IS NULL", [], |r| r.get(0)).unwrap_or(0);
    if count > 0 {
        let default_session_id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
        conn.execute(
            "INSERT INTO chat_sessions (id, title, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
            [&default_session_id, "Eski Sohbetler", &now, &now],
        )?;
        conn.execute(
            "UPDATE asistan_messages SET session_id = ?1 WHERE session_id IS NULL",
            [&default_session_id],
        )?;
    }
    
    
    Ok(())
}

fn migration_4_telegram(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS telegram_bots (
            id TEXT PRIMARY KEY,
            bot_token TEXT NOT NULL,
            username TEXT,
            first_name TEXT,
            status TEXT NOT NULL DEFAULT 'active',
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS telegram_allowlist (
            id TEXT PRIMARY KEY,
            telegram_user_id TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            role TEXT,
            task TEXT,
            group_name TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS telegram_users (
            id TEXT PRIMARY KEY,
            telegram_user_id TEXT NOT NULL UNIQUE,
            username TEXT,
            first_name TEXT,
            last_name TEXT,
            language_code TEXT,
            chat_id TEXT,
            message_count INTEGER NOT NULL DEFAULT 0,
            last_message_at TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS telegram_messages (
            id TEXT PRIMARY KEY,
            telegram_user_id TEXT NOT NULL,
            chat_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS telegram_drafts (
            id TEXT PRIMARY KEY,
            telegram_user_id TEXT NOT NULL,
            target_module TEXT NOT NULL,
            title TEXT NOT NULL,
            payload_json TEXT NOT NULL,
            uncertainties_json TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS telegram_requests (
            id TEXT PRIMARY KEY,
            telegram_user_id TEXT NOT NULL,
            username TEXT,
            display_name TEXT,
            phone_number TEXT,
            text TEXT,
            request_type TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL
        );
        "#
    )?;
    Ok(())
}

fn migration_7_worker_salary_details(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS worker_advances (
            id TEXT PRIMARY KEY,
            worker_id TEXT NOT NULL,
            amount REAL NOT NULL,
            date TEXT NOT NULL,
            description TEXT,
            created_at TEXT NOT NULL
        );
        "#
    )?;
    
    // Add payment_day if it doesn't exist
    let mut stmt = conn.prepare("PRAGMA table_info(workers)")?;
    let mut has_payment_day = false;
    let mut rows = stmt.query([])?;
    while let Ok(Some(row)) = rows.next() {
        let name: String = row.get(1)?;
        if name == "payment_day" {
            has_payment_day = true;
            break;
        }
    }
    drop(rows);
    drop(stmt);

    if !has_payment_day {
        conn.execute("ALTER TABLE workers ADD COLUMN payment_day INTEGER DEFAULT 5", [])?;
    }

    Ok(())
}

fn migration_2_legal_data(conn: &Connection) -> rusqlite::Result<()> {
    // 1. Tabloları oluştur
    conn.execute_batch(r#"
        CREATE TABLE IF NOT EXISTS hesap_plani (
            kod TEXT PRIMARY KEY,
            ad TEXT NOT NULL,
            sinif TEXT NOT NULL,
            grup TEXT NOT NULL,
            tur TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS kanuni_parametreler (
            parametre TEXT PRIMARY KEY,
            deger REAL NOT NULL,
            yil INTEGER NOT NULL,
            aciklama TEXT
        );

        CREATE TABLE IF NOT EXISTS is_kanunu_kurallar (
            madde TEXT PRIMARY KEY,
            baslik TEXT NOT NULL,
            ozet TEXT NOT NULL,
            kategori TEXT NOT NULL,
            uygulanabilir INTEGER NOT NULL DEFAULT 0
        );
    "#)?;

    // 2. Tek Düzen Hesap Planı Seed Verileri
    let hesaplar = vec![
        ("100","Kasa","1-Dönen Varlıklar","10-Hazır Değerler","aktif"),
        ("101","Alınan Çekler","1-Dönen Varlıklar","10-Hazır Değerler","aktif"),
        ("102","Bankalar","1-Dönen Varlıklar","10-Hazır Değerler","aktif"),
        ("103","Verilen Çek ve Ödeme Emirleri (-)","1-Dönen Varlıklar","10-Hazır Değerler","aktif"),
        ("108","Diğer Hazır Değerler","1-Dönen Varlıklar","10-Hazır Değerler","aktif"),
        ("110","Hisse Senetleri","1-Dönen Varlıklar","11-Menkul Kıymetler","aktif"),
        ("111","Özel Kesim Tahvil Senet ve Bonoları","1-Dönen Varlıklar","11-Menkul Kıymetler","aktif"),
        ("112","Kamu Kesimi Tahvil Senet ve Bonoları","1-Dönen Varlıklar","11-Menkul Kıymetler","aktif"),
        ("118","Diğer Menkul Kıymetler","1-Dönen Varlıklar","11-Menkul Kıymetler","aktif"),
        ("120","Alıcılar","1-Dönen Varlıklar","12-Ticari Alacaklar","aktif"),
        ("121","Alacak Senetleri","1-Dönen Varlıklar","12-Ticari Alacaklar","aktif"),
        ("126","Verilen Depozito ve Teminatlar","1-Dönen Varlıklar","12-Ticari Alacaklar","aktif"),
        ("128","Şüpheli Ticari Alacaklar","1-Dönen Varlıklar","12-Ticari Alacaklar","aktif"),
        ("131","Ortaklardan Alacaklar","1-Dönen Varlıklar","13-Diğer Alacaklar","aktif"),
        ("135","Personelden Alacaklar","1-Dönen Varlıklar","13-Diğer Alacaklar","aktif"),
        ("150","İlk Madde ve Malzeme","1-Dönen Varlıklar","15-Stoklar","aktif"),
        ("151","Yarı Mamuller","1-Dönen Varlıklar","15-Stoklar","aktif"),
        ("152","Mamuller","1-Dönen Varlıklar","15-Stoklar","aktif"),
        ("153","Ticari Mallar","1-Dönen Varlıklar","15-Stoklar","aktif"),
        ("157","Diğer Stoklar","1-Dönen Varlıklar","15-Stoklar","aktif"),
        ("159","Verilen Sipariş Avansları","1-Dönen Varlıklar","15-Stoklar","aktif"),
        ("180","Gelecek Aylara Ait Giderler","1-Dönen Varlıklar","18-Gelecek Aylara Ait Gider ve Gelir Tahakkukları","aktif"),
        ("181","Gelir Tahakkukları","1-Dönen Varlıklar","18-Gelecek Aylara Ait Gider ve Gelir Tahakkukları","aktif"),
        ("191","İndirilecek KDV","1-Dönen Varlıklar","19-Diğer Dönen Varlıklar","aktif"),
        ("192","Diğer KDV","1-Dönen Varlıklar","19-Diğer Dönen Varlıklar","aktif"),
        ("193","Peşin Ödenen Vergi ve Fonlar","1-Dönen Varlıklar","19-Diğer Dönen Varlıklar","aktif"),
        ("195","İş Avansları","1-Dönen Varlıklar","19-Diğer Dönen Varlıklar","aktif"),
        ("196","Personel Avansları","1-Dönen Varlıklar","19-Diğer Dönen Varlıklar","aktif"),
        ("200","Arazi ve Arsalar","2-Duran Varlıklar","20-Mali Duran Varlıklar","aktif"),
        ("252","Binalar","2-Duran Varlıklar","25-Maddi Duran Varlıklar","aktif"),
        ("253","Tesis Makine ve Cihazlar","2-Duran Varlıklar","25-Maddi Duran Varlıklar","aktif"),
        ("254","Taşıtlar","2-Duran Varlıklar","25-Maddi Duran Varlıklar","aktif"),
        ("255","Demirbaşlar","2-Duran Varlıklar","25-Maddi Duran Varlıklar","aktif"),
        ("257","Birikmiş Amortismanlar (-)","2-Duran Varlıklar","25-Maddi Duran Varlıklar","aktif"),
        ("264","Özel Maliyetler","2-Duran Varlıklar","26-Maddi Olmayan Duran Varlıklar","aktif"),
        ("268","Birikmiş Amortismanlar (-)","2-Duran Varlıklar","26-Maddi Olmayan Duran Varlıklar","aktif"),
        ("300","Banka Kredileri","3-Kısa Vadeli Yabancı Kaynaklar","30-Mali Borçlar","pasif"),
        ("320","Satıcılar","3-Kısa Vadeli Yabancı Kaynaklar","32-Ticari Borçlar","pasif"),
        ("321","Borç Senetleri","3-Kısa Vadeli Yabancı Kaynaklar","32-Ticari Borçlar","pasif"),
        ("331","Ortaklara Borçlar","3-Kısa Vadeli Yabancı Kaynaklar","33-Diğer Borçlar","pasif"),
        ("335","Personele Borçlar","3-Kısa Vadeli Yabancı Kaynaklar","33-Diğer Borçlar","pasif"),
        ("340","Alınan Sipariş Avansları","3-Kısa Vadeli Yabancı Kaynaklar","34-Alınan Avanslar","pasif"),
        ("360","Ödenecek Vergi ve Fonlar","3-Kısa Vadeli Yabancı Kaynaklar","36-Ödenecek Vergi ve Diğer Yükümlülükler","pasif"),
        ("361","Ödenecek Sosyal Güvenlik Kesintileri","3-Kısa Vadeli Yabancı Kaynaklar","36-Ödenecek Vergi ve Diğer Yükümlülükler","pasif"),
        ("371","Dönem Kârı Vergi ve Diğer Yasal Yükümlülük Karşılıkları","3-Kısa Vadeli Yabancı Kaynaklar","37-Borç ve Gider Karşılıkları","pasif"),
        ("380","Gelecek Aylara Ait Gelirler","3-Kısa Vadeli Yabancı Kaynaklar","38-Gelecek Aylara Ait Gelirler ve Gider Tahakkukları","pasif"),
        ("381","Gider Tahakkukları","3-Kısa Vadeli Yabancı Kaynaklar","38-Gelecek Aylara Ait Gelirler ve Gider Tahakkukları","pasif"),
        ("391","Hesaplanan KDV","3-Kısa Vadeli Yabancı Kaynaklar","39-Diğer Kısa Vadeli Yabancı Kaynaklar","pasif"),
        ("400","Banka Kredileri","4-Uzun Vadeli Yabancı Kaynaklar","40-Mali Borçlar","pasif"),
        ("420","Satıcılar","4-Uzun Vadeli Yabancı Kaynaklar","42-Ticari Borçlar","pasif"),
        ("500","Sermaye","5-Özkaynaklar","50-Ödenmiş Sermaye","pasif"),
        ("570","Geçmiş Yıllar Kârları","5-Özkaynaklar","57-Geçmiş Yıllar Kârları","pasif"),
        ("580","Geçmiş Yıllar Zararları (-)","5-Özkaynaklar","58-Geçmiş Yıllar Zararları","pasif"),
        ("590","Dönem Net Kârı (Zararı)","5-Özkaynaklar","59-Dönem Net Kârı (Zararı)","pasif"),
        ("600","Yurt İçi Satışlar","6-Gelir Tablosu Hesapları","60-Brüt Satışlar","gelir"),
        ("601","Yurt Dışı Satışlar","6-Gelir Tablosu Hesapları","60-Brüt Satışlar","gelir"),
        ("610","Satıştan İadeler (-)","6-Gelir Tablosu Hesapları","61-Satış İndirimleri","gider"),
        ("611","Satış İskontoları (-)","6-Gelir Tablosu Hesapları","61-Satış İndirimleri","gider"),
        ("620","Satılan Mamuller Maliyeti","6-Gelir Tablosu Hesapları","62-Satışların Maliyeti","gider"),
        ("621","Satılan Ticari Mallar Maliyeti","6-Gelir Tablosu Hesapları","62-Satışların Maliyeti","gider"),
        ("622","Satılan Hizmet Maliyeti","6-Gelir Tablosu Hesapları","62-Satışların Maliyeti","gider"),
        ("630","Araştırma ve Geliştirme Giderleri","6-Gelir Tablosu Hesapları","63-Faaliyet Giderleri","gider"),
        ("631","Pazarlama Satış ve Dağıtım Giderleri","6-Gelir Tablosu Hesapları","63-Faaliyet Giderleri","gider"),
        ("632","Genel Yönetim Giderleri","6-Gelir Tablosu Hesapları","63-Faaliyet Giderleri","gider"),
        ("640","İştiraklerden Temettü Gelirleri","6-Gelir Tablosu Hesapları","64-Diğer Faaliyetlerden Olağan Gelir ve Kârlar","gelir"),
        ("642","Faiz Gelirleri","6-Gelir Tablosu Hesapları","64-Diğer Faaliyetlerden Olağan Gelir ve Kârlar","gelir"),
        ("644","Konusu Kalmayan Karşılıklar","6-Gelir Tablosu Hesapları","64-Diğer Faaliyetlerden Olağan Gelir ve Kârlar","gelir"),
        ("645","Menkul Kıymet Satış Kârları","6-Gelir Tablosu Hesapları","64-Diğer Faaliyetlerden Olağan Gelir ve Kârlar","gelir"),
        ("646","Kambiyo Kârları","6-Gelir Tablosu Hesapları","64-Diğer Faaliyetlerden Olağan Gelir ve Kârlar","gelir"),
        ("649","Diğer Olağan Gelir ve Kârlar","6-Gelir Tablosu Hesapları","64-Diğer Faaliyetlerden Olağan Gelir ve Kârlar","gelir"),
        ("654","Karşılık Giderleri","6-Gelir Tablosu Hesapları","65-Diğer Faaliyetlerden Olağan Gider ve Zararlar","gider"),
        ("655","Menkul Kıymet Satış Zararları","6-Gelir Tablosu Hesapları","65-Diğer Faaliyetlerden Olağan Gider ve Zararlar","gider"),
        ("656","Kambiyo Zararları","6-Gelir Tablosu Hesapları","65-Diğer Faaliyetlerden Olağan Gider ve Zararlar","gider"),
        ("657","Reeskont Faiz Giderleri","6-Gelir Tablosu Hesapları","65-Diğer Faaliyetlerden Olağan Gider ve Zararlar","gider"),
        ("659","Diğer Olağan Gider ve Zararlar","6-Gelir Tablosu Hesapları","65-Diğer Faaliyetlerden Olağan Gider ve Zararlar","gider"),
        ("660","Kısa Vadeli Borçlanma Giderleri","6-Gelir Tablosu Hesapları","66-Finansman Giderleri","gider"),
        ("661","Uzun Vadeli Borçlanma Giderleri","6-Gelir Tablosu Hesapları","66-Finansman Giderleri","gider"),
        ("671","Önceki Dönem Gelir ve Kârları","6-Gelir Tablosu Hesapları","67-Olağan Dışı Gelir ve Kârlar","gelir"),
        ("679","Diğer Olağan Dışı Gelir ve Kârlar","6-Gelir Tablosu Hesapları","67-Olağan Dışı Gelir ve Kârlar","gelir"),
        ("680","Çalışmayan Kısım Gider ve Zararları","6-Gelir Tablosu Hesapları","68-Olağan Dışı Gider ve Zararlar","gider"),
        ("681","Önceki Dönem Gider ve Zararları","6-Gelir Tablosu Hesapları","68-Olağan Dışı Gider ve Zararlar","gider"),
        ("689","Diğer Olağan Dışı Gider ve Zararlar","6-Gelir Tablosu Hesapları","68-Olağan Dışı Gider ve Zararlar","gider"),
        ("690","Dönem Kârı veya Zararı","6-Gelir Tablosu Hesapları","69-Dönem Net Kârı veya Zararı","gelir"),
        ("691","Dönem Kârı Vergi ve Diğer Yasal Yük. Karş.","6-Gelir Tablosu Hesapları","69-Dönem Net Kârı veya Zararı","gider"),
        ("692","Dönem Net Kârı veya Zararı","6-Gelir Tablosu Hesapları","69-Dönem Net Kârı veya Zararı","gelir"),
        ("700","Maliyet Muhasebesi Bağlantı Hesabı","7-Maliyet Hesapları","70-Maliyet Muhasebesi Bağlantı Hesapları","gider"),
        ("710","Direkt İlk Madde ve Malzeme Giderleri","7-Maliyet Hesapları","71-Direkt İlk Madde ve Malzeme Giderleri","gider"),
        ("720","Direkt İşçilik Giderleri","7-Maliyet Hesapları","72-Direkt İşçilik Giderleri","gider"),
        ("730","Genel Üretim Giderleri","7-Maliyet Hesapları","73-Genel Üretim Giderleri","gider"),
        ("740","Hizmet Üretim Maliyeti","7-Maliyet Hesapları","74-Hizmet Üretim Maliyeti","gider"),
        ("750","Araştırma ve Geliştirme Giderleri","7-Maliyet Hesapları","75-Araştırma ve Geliştirme Giderleri","gider"),
        ("760","Pazarlama Satış ve Dağıtım Giderleri","7-Maliyet Hesapları","76-Pazarlama Satış ve Dağıtım Giderleri","gider"),
        ("770","Genel Yönetim Giderleri","7-Maliyet Hesapları","77-Genel Yönetim Giderleri","gider"),
        ("780","Finansman Giderleri","7-Maliyet Hesapları","78-Finansman Giderleri","gider"),
    ];

    for (kod, ad, sinif, grup, tur) in &hesaplar {
        conn.execute(
            "INSERT OR IGNORE INTO hesap_plani (kod, ad, sinif, grup, tur) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![kod, ad, sinif, grup, tur],
        )?;
    }

    // 3. Kanuni Parametreler (2025 yılı değerleri)
    let parametreler = vec![
        ("asgari_ucret_brut", 22104.67_f64, 2025, "4857 sayılı İş Kanunu - Aylık brüt asgari ücret (TL)"),
        ("asgari_ucret_net", 17002.12_f64, 2025, "4857 sayılı İş Kanunu - Aylık net asgari ücret (TL)"),
        ("sgk_isci_payi", 0.14_f64, 2025, "5510 - SGK işçi payı (%14 = Emeklilik %9 + Sağlık %5)"),
        ("sgk_isveren_payi", 0.205_f64, 2025, "5510 - SGK işveren payı (%20.5)"),
        ("isveren_hissesi_toplam", 0.345_f64, 2025, "5510 - Toplam SGK yükü (%34.5)"),
        ("damga_vergisi_orani", 0.00759_f64, 2025, "488 Sayılı Kanun - Maaş üzerinden damga vergisi oranı (%0.759)"),
        ("gelir_vergisi_dilim_1_oran", 0.15_f64, 2025, "GVK Md.103 - 0-158.000 TL arası gelir vergisi oranı (%15)"),
        ("gelir_vergisi_dilim_2_oran", 0.20_f64, 2025, "GVK Md.103 - 158.000-330.000 TL arası gelir vergisi oranı (%20)"),
        ("gelir_vergisi_dilim_3_oran", 0.27_f64, 2025, "GVK Md.103 - 330.000-1.200.000 TL arası gelir vergisi oranı (%27)"),
        ("gelir_vergisi_dilim_4_oran", 0.35_f64, 2025, "GVK Md.103 - 1.200.000+ TL gelir vergisi oranı (%35)"),
        ("fazla_mesai_katsayi_normal", 1.5_f64, 2025, "4857 Md.41 - Haftalık 45 saati geçen fazla mesai katsayısı (%50 fazla)"),
        ("fazla_mesai_katsayi_tatil", 2.0_f64, 2025, "4857 Md.41 - Tatil günü çalışma katsayısı (%100 fazla)"),
        ("haftalik_azami_calisma_saati", 45.0_f64, 2025, "4857 Md.63 - Haftalık azami çalışma süresi (saat)"),
        ("kidem_tazminati_tavan", 42823.50_f64, 2025, "4857 Md.120 - Kıdem tazminatı yıllık tavan tutarı (TL)"),
        ("ihbar_suresi_0_6_ay_gun", 2.0_f64, 2025, "4857 Md.17 - 0-6 ay çalışan işçi için ihbar süresi (hafta)"),
        ("ihbar_suresi_6_18_ay_gun", 4.0_f64, 2025, "4857 Md.17 - 6-18 ay çalışan işçi için ihbar süresi (hafta)"),
        ("ihbar_suresi_18_36_ay_gun", 6.0_f64, 2025, "4857 Md.17 - 18-36 ay çalışan işçi için ihbar süresi (hafta)"),
        ("ihbar_suresi_36_plus_ay_gun", 8.0_f64, 2025, "4857 Md.17 - 36+ ay çalışan işçi için ihbar süresi (hafta)"),
        ("yillik_izin_1_5_yil_gun", 14.0_f64, 2025, "4857 Md.53 - 1-5 yıl hizmet için yıllık izin (gün)"),
        ("yillik_izin_5_15_yil_gun", 20.0_f64, 2025, "4857 Md.53 - 5-15 yıl hizmet için yıllık izin (gün)"),
        ("yillik_izin_15_plus_yil_gun", 26.0_f64, 2025, "4857 Md.53 - 15+ yıl hizmet için yıllık izin (gün)"),
        ("kdv_orani_genel", 0.20_f64, 2025, "KDV Kanunu - Genel KDV oranı (%20)"),
        ("kdv_orani_indirimli_1", 0.10_f64, 2025, "KDV Kanunu - İndirimli KDV oranı (%10)"),
        ("kdv_orani_indirimli_2", 0.01_f64, 2025, "KDV Kanunu - Düşük KDV oranı (%1)"),
    ];

    for (parametre, deger, yil, aciklama) in &parametreler {
        conn.execute(
            "INSERT OR IGNORE INTO kanuni_parametreler (parametre, deger, yil, aciklama) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![parametre, deger, yil, aciklama],
        )?;
    }

    // 4. İş Kanunu Kuralları
    let kurallar = vec![
        ("4857/1", "Amaç ve Kapsam", "İşverenler ile iş sözleşmesiyle çalıştırılanların çalışma koşulları ve haklarını düzenler.", "genel", 0),
        ("4857/17", "İhbar Süresi", "İş sözleşmesi feshinde işveren veya işçi bildirim sürelerine uymakla yükümlüdür. Süre: 0-6 ay=2 hafta, 6-18 ay=4 hafta, 18-36 ay=6 hafta, 36+ ay=8 hafta.", "ihbar", 1),
        ("4857/25", "İşverenin Haklı Fesih Hakkı", "Sağlık sebepleri, ahlak ve iyiniyet kurallarına aykırılık, zorlayıcı sebepler halinde işveren iş sözleşmesini tazminatsız feshedebilir.", "fesih", 1),
        ("4857/41", "Fazla Çalışma Ücreti", "Haftalık 45 saati aşan çalışmalar için saat başı %50 zam uygulanır. Tatil günleri için %100 zam yapılır.", "fazla_mesai", 1),
        ("4857/46", "Haftalık Tatil", "İşçi haftada en az 24 saat kesintisiz dinlenme hakkına sahiptir. Tatil ücreti tam yevmiye olarak ödenir.", "tatil", 1),
        ("4857/47", "Genel Tatil Ücreti", "Resmi tatil günlerinde çalışan işçiye bir günlük ücretine ek olarak çalışması karşılığı ücret ödenir.", "tatil", 1),
        ("4857/53", "Yıllık Ücretli İzin", "1-5 yıl: 14 gün, 5-15 yıl: 20 gün, 15+ yıl: 26 gün yıllık izin hakkı doğar. 18 yaş altı ve 50 yaş üstü için en az 20 gün.", "izin", 1),
        ("4857/54", "İzin Hakkı Kazanma", "İşçinin izin hakkı kazanabilmesi için işe başlama tarihinden itibaren en az 1 yıl çalışmış olması şarttır.", "izin", 1),
        ("4857/57", "İzin Ücreti", "Yıllık izin kullandırılırken işçiye bir günlük brüt ücreti üzerinden izin ücreti peşin ödenir.", "izin", 1),
        ("4857/63", "Çalışma Süresi", "Genel çalışma süresi haftada en çok 45 saat. Günlük çalışma süresi 11 saati geçemez.", "calisma_suresi", 1),
        ("4857/68", "Ara Dinlenmesi", "4 saatten az çalışmalarda 15 dk, 4-7.5 saat için 30 dk, 7.5+ saat için 1 saat ara dinlenmesi zorunludur.", "calisma_suresi", 1),
        ("4857/74", "Analık İzni", "Kadın işçi doğumdan önce 8 hafta, doğumdan sonra 8 hafta olmak üzere toplam 16 hafta izin kullanır.", "izin", 1),
        ("4857/120", "Kıdem Tazminatı", "Her tam yıl için 30 günlük brüt ücret tutarında kıdem tazminatı ödenir. Tavan: Her yıl güncellenen kıdem tazminatı tavanı aşılamaz.", "tazminat", 1),
        ("4857/8", "İş Sözleşmesinin Şekli", "İş sözleşmesi özel bir şekle tabi değildir. Bir yıl veya daha uzun süreli sözleşmeler yazılı yapılmalıdır.", "sozlesme", 0),
        ("4857/15", "Deneme Süresi", "Deneme süresi 2 ayı geçemez. Toplu iş sözleşmesiyle 4 aya kadar uzatılabilir. Deneme süresinde tazminatsız fesih mümkündür.", "sozlesme", 1),
        ("4857/32", "Ücretin Ödenmesi", "Ücret en geç ayda bir ödenir. Mücbir sebepler olmaksızın 20 gün gecikme halinde işçi iş görmekten kaçınabilir.", "ucret", 1),
        ("4857/39", "Asgari Ücret", "İş sözleşmesiyle çalışan ve bu Kanun kapsamındaki her işçiye Asgari Ücret Tespit Komisyonu kararı uygulanır.", "ucret", 1),
    ];

    for (madde, baslik, ozet, kategori, uygulanabilir) in &kurallar {
        conn.execute(
            "INSERT OR IGNORE INTO is_kanunu_kurallar (madde, baslik, ozet, kategori, uygulanabilir) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![madde, baslik, ozet, kategori, uygulanabilir],
        )?;
    }

    Ok(())
}

fn migration_5_media_support(conn: &Connection) -> rusqlite::Result<()> {
    // telegram_messages tablosuna media_path ekleme (eğer yoksa)
    let _ = conn.execute("ALTER TABLE telegram_messages ADD COLUMN media_path TEXT", []);
    let _ = conn.execute("ALTER TABLE asistan_messages ADD COLUMN media_path TEXT", []);
    Ok(())
}

fn migration_6_product_image(conn: &Connection) -> rusqlite::Result<()> {
    let _ = conn.execute("ALTER TABLE leaves ADD COLUMN type TEXT;", []);
    Ok(())
}

fn migration_8_worker_photo(conn: &Connection) -> rusqlite::Result<()> {
    let _ = conn.execute("ALTER TABLE workers ADD COLUMN image_path TEXT;", []);
    Ok(())
}

fn migration_9_licensing(conn: &rusqlite::Connection) -> rusqlite::Result<()> {
    conn.execute(
        "INSERT OR IGNORE INTO settings (key, value) VALUES (?1, ?2)",
        rusqlite::params!["license_key", ""],
    )?;
    conn.execute(
        "INSERT OR IGNORE INTO settings (key, value) VALUES (?1, ?2)",
        rusqlite::params!["license_status", "DEMO"],
    )?;
    Ok(())
}

fn migration_10_vehicle_category(conn: &rusqlite::Connection) -> rusqlite::Result<()> {
    let _ = conn.execute("ALTER TABLE vehicles ADD COLUMN category TEXT", []);
    Ok(())
}

fn migration_11_whatsapp_approvals(conn: &rusqlite::Connection) -> rusqlite::Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS whatsapp_approvals (
            id TEXT PRIMARY KEY,
            sender_number TEXT NOT NULL,
            sender_name TEXT,
            original_message TEXT NOT NULL,
            suggested_action TEXT,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL
        )",
        [],
    )?;
    Ok(())
}

fn migration_12_workflow_jobs(conn: &rusqlite::Connection) -> rusqlite::Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS workflow_jobs (
            id TEXT PRIMARY KEY,
            job_type TEXT NOT NULL,
            payload TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            error_msg TEXT,
            result_payload TEXT,
            retry_count INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )",
        [],
    )?;
    Ok(())
}

fn migration_13_worker_contact(conn: &rusqlite::Connection) -> rusqlite::Result<()> {
    let _ = conn.execute("ALTER TABLE workers ADD COLUMN phone TEXT;", []);
    let _ = conn.execute("ALTER TABLE workers ADD COLUMN email TEXT;", []);
    Ok(())
}

fn migration_14_branches(conn: &rusqlite::Connection) -> rusqlite::Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS branches (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            created_at TEXT NOT NULL
        )",
        [],
    )?;

    // Insert a default branch
    let default_branch_id = crate::helpers::new_id();
    let created_at = crate::helpers::now_iso();
    
    // Check if any branch exists
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM branches", [], |row| row.get(0)).unwrap_or(0);
    
    if count == 0 {
        conn.execute(
            "INSERT INTO branches (id, name, created_at) VALUES (?1, 'Merkez Şube', ?2)",
            rusqlite::params![default_branch_id, created_at],
        )?;
    }

    // Determine which branch ID to use as default for existing records
    let center_id: String = conn.query_row(
        "SELECT id FROM branches ORDER BY created_at ASC LIMIT 1",
        [],
        |row| row.get(0),
    ).unwrap_or(default_branch_id);

    // Add branch_id to existing tables
    let tables_to_alter = vec![
        "workers", "vehicles", "products", "stock_movements", 
        "ledger_entries", "invoices", "tax_items"
    ];

    for t in tables_to_alter {
        // Ignores error if column already exists
        let _ = conn.execute(&format!("ALTER TABLE {} ADD COLUMN branch_id TEXT DEFAULT '{}'", t, center_id), []);
    }

    Ok(())
}

fn migration_15_asistan_library(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS asistan_library (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_type TEXT NOT NULL,
            content_text TEXT,
            size_bytes INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        );
        "#,
    )?;
    Ok(())
}

fn migration_16_accounts_bank_statements(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS accounts (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            account_type TEXT NOT NULL DEFAULT 'kasa',
            currency TEXT NOT NULL DEFAULT 'TRY',
            iban TEXT,
            opening_balance REAL NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS bank_statements (
            id TEXT PRIMARY KEY,
            account_id TEXT,
            date TEXT NOT NULL,
            description TEXT NOT NULL,
            amount REAL NOT NULL,
            balance REAL,
            matched_company_id TEXT,
            matched_company_name TEXT,
            match_score REAL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_bank_statements_status ON bank_statements(status);
        "#,
    )?;
    Ok(())
}
