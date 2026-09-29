# MİZANNET — UYGULAMA KAPSAMLI RAPOR

> Google Flow / video üretimi için kaynak doküman. Tüm modüller, özellikler ve satış argümanları.
> Ekran görüntüleri: `D:\madenapp\docs\screenshots\` · Video promptu: `docs/video-prompt-30sn.md`

---

## GENEL BİLGİLER

| | |
|---|---|
| **Ürün adı** | MizanNet — İşletme Yönetim Sistemi |
| **Hedef kitle** | Maden, inşaat, imalat, nakliye sektöründeki KOBİ'ler ve şantiyeli işletmeler |
| **Konumlandırma** | "Saha + muhasebe + yapay zeka asistanı — tek uygulama, çevrimdışı bile çalışır" |
| **Platform** | Windows masaüstü (Tauri 2 + Next.js), SQLite yerel veritabanı |
| **AI** | Bulut (NVIDIA/Google modelleri) + tamamen yerel model seçeneği (veri dışarı çıkmaz) |
| **Fiyatlandırma** | 30 gün ücretsiz deneme; web sitesi üzerinden lisans ( uygulamaya giriş ile aktivasyon) |

---

## MODÜL ENVANTERİ (16 modül)

### 1. 🏠 Anasayfa / Yönetim Paneli (`dashboard.png`)
- Toplam bakiye, aylık kâr, depo doluluk oranı kartları (canlı sayaç)
- 12 aylık gelir/gider akış grafiği, cari bakiye dağılımı, gider kategori pastası
- Son işlemler akışı, işçi verileri (aktif/izinli/yeni), filo durumu
- Çoklu şube seçici, global arama, hava durumu widget'ı

### 2. 👥 Cari Hesaplar (`cari.png`) — *Videonun yıldız sahnesi*
- Firma rehberi: borç/alacak durumuna göre renk kodlu (Biz Borçlu / Biz Borçluyuz)
- Her cari için hareket defteri: fatura, ödeme, yürüyen bakiye otomatik hesaplanır
- **e-Fatura entegrasyonu:** GİB'de imzalanan fatura otomatik cariye işlenir — manuel kayıt yok
- VKN ile cari bulma, cari bazlı özet raporlar

### 3. 🧾 e-Fatura (GİB) — *Rakiplerde yok, en güçlü farklılaştırıcı*
- Resmî GİB e-Arşiv Portal entegrasyonu (ücretsiz — entegratör kontör ücreti YOK; Robom ₺199-999/paket alıyor)
- VKN girince alıcı bilgileri GİB'den otomatik dolar
- Çoklu ürün satırı, anlık matrah/KDV/iskonto hesabı, 5 fatura tipi, döviz desteği
- SMS ile resmî imzalama (fatura kesme), belge listesi, PDF indirme, taslak silme
- Test portalı modu (gerçek fatura kesmeden alıştırma)
- İmzalanan fatura → fatura kaydı + cari hareketi + bakiye güncelleme: tek adımda otomatik

### 4. 🤖 Yapay Zeka Asistanı (`asistan.png`) — *Videonun teknoloji sahnesi*
Gerçek bir bilgisayar ajanı; sadece sohbet etmez, iş yapar:
- **Terminal komutu çalıştırır** (zaman aşımı + güvenlik sınırlarıyla)
- **Gerçek .xlsx Excel üretir** (kalın başlık, otomatik sütun genişliği)
- **Gerçek .docx Word üretir** (OOXML)
- Dosyaları görür, taşır, kopyalar, siler, arar; klasör oluşturur
- Veritabanını sorgular/günceller (korumalı); görsel üretir (Pollinations)
- **Sohbette canlı görünüm:** ajan ne yapıyorsa adım adım kart olarak akar (çalışıyor ✓/✗)
- WhatsApp/Telegram araçlarıyla mesaj da gönderebilir
- Araç filosu, işçi, vergi bilgilerine erişip analiz üretir

### 5. 📥 Veri Aktarımı (`veri-aktarim.png`)
- Excel/CSV içe-dışa aktarma; Türkçe format toleransı (1.234,56 / gg.aa.yyyy)
- **Toplu fiş yükleme:** 20 dosyaya kadar sürükle-bırak, AI paralel analiz, toplu onay ekranı
- **Banka mutabakatı:** CSV/XLSX ekstre içe aktar → AI cari eşleştirme → tek tıkla işlem
- Kasa/Banka hesap ayrımı (accounts tablosu), bakiye takibi

### 6. 📦 Depo / Stok (`depo.png`)
- Ürün kartları, SKU, kritik stok seviyesi uyarıları (kırmızı rozet)
- Stok hareketi geçmişi, stok değeri toplamı, tükenmiş ürün gizleme
- AI asistanla stok analizi ve kritik seviye bildirimleri

### 7. 🚛 Araçlar / Filo (`araclar.png`)
- Plaka/marka/model kartları; Aktif / Bakımda / Pasif durumları
- **Yaklaşan muayene ve sigorta uyarıları** (renk kodlu sayaçlar)
- Araç bazlı gider/bakım geçmişi, plaka ile arama

### 8. 🏛️ Vergi Takibi (`vergi.png`)
- SGK, Bağkur, tahakkuk takibi; vade tarihleri ve ödeme durumu
- AI asistana vergi soruları sorulabilir (VUK bilgi bankası destekli)

### 9. 👷 İşçiler (`isciler.png`)
- Görev bazlı gruplama (Operatör, Şoför, Muhasebe, Bakım, Saha Sorumlusu)
- Aktif/izinli durumu, aylık maaş toplamı, kişisel detay ekranı
- Kişisel veriler maskeli gösterilir (gizlilik tasarımı)
- Kıdem/ibo/bordro desteği

### 10. 📄 Belge Arşivi (`belgeler.png`)
- Word/Excel/PDF üretimi ve arşivleme; AI ile belge analizi
- Kategori/etiket sistemi, hızlı arama

### 11. 💬 Haberleşme (WhatsApp + Telegram) — *Videonun otomasyon sahnesi*
- **WhatsApp Business API** ile mesaj gönderimi (whatsapp-worker: Node.js köprü)
- **Telegram bot** entegrasyonu
- **Otomatik bildirim çalışanı:** vadesi yaklaşan/geçen cari hatırlatmaları, vergi/SGK uyarıları, kritik stok uyarıları, günlük özet — hepsi kendi kendine gönderilir

### 12. 🔔 Bildirimler (`bildirimler.png`)
- Uygulama içi bildirim merkezi; okunmamış sayacı; modül bazlı filtreleme

### 13. 📅 Takvim (`takvim.png`)
- Ödeme tahsilat günleri, vergi vadeleri, işçi izinleri tek görünümde

### 14. 📚 Bilgi Bankası (`rehber.png`)
- Yerleşik VUK, İş Kanunu, SGK mevzuat rehberi — AI asistan bu içerikle yanıtlar

### 15. ♻️ Geri Dönüşüm Kutusu
- Soft-delete: silinen tüm kayıtlar geri getirilebilir (muhasebe güvenliği)

### 16. ⚙️ Ayarlar (`ayarlar.png`)
- **Web hesabı:** web sitesi hesabıyla giriş, lisans aktivasyon, abonelik durumu
- **Yerel AI:** HuggingFace model indirme, donanıma göre otomatik model önerisi, llama-server yönetimi — veri bilgisayardan çıkmaz
- WhatsApp/Telegram kurulum sihirbazları, yedekleme/geri yükleme, veri konumu değiştirme
- Çoklu işletme + şube yönetimi

---

## RAKİP KARŞILAŞTIRMA (Robom'a karşı — özet)

| Özellik | Robom (₺249/ay + kontör) | MizanNet |
|---|---|---|
| e-Arşiv fatura | ✅ (entegratör, kontörlü) | ✅ GİB direkt — kontör yok |
| AI işletme ajanı (terminal/Excel/Word) | ❌ | ✅ |
| WhatsApp + Telegram otomasyonu | Kısmi | ✅ + otomatik hatırlatma worker'ı |
| Araç filosu yönetimi | ❌ | ✅ (maden/şantiye için şart) |
| İşçi/bordro yönetimi | ❌ | ✅ |
| Yerel AI (veri çıkmaz) | ❌ | ✅ |
| Tam çevrimdışı çalışma | ❌ (bulut) | ✅ |
| Çoklu işletme/şube | ❌ (tek kullanıcı) | ✅ |
| Deneme süresi | 14 gün | 30 gün |
| Banka mutabakatı (AI) | ✅ | ✅ |
| Toplu fiş yükleme | ✅ | ✅ |

Tam 20 maddelik matris: `docs/rakip-analizi-robom.md`

---

## VİDEO İÇİN 10 SATIŞ ARGÜMANI (seslendirme havuzu)

1. "Maden ocağından muhasebe defterine — tüm işletmeniz tek ekranda."
2. "e-Fatura GİB'de imzalanır imzalanmaz cari hesaba kendiliğinden işlenir."
3. "Kontör yok, aracı yok — GİB'in resmi ücretsiz portalıyla konuşuyoruz."
4. "Yapay zeka asistanınız Excel'i hazırlar, Word'ü yazar, komutu çalıştırır."
5. "Vadesi gelen borç, WhatsApp'tan kendi kendine hatırlatılır."
6. "Banka ekstresi yapay zekayla tek tıkla mutabık kalır."
7. "Araç muayenesi, sigorta, vergi — hiçbiri unutulmaz."
8. "Verileriniz bilgisayarınızdan çıkmaz — yerel yapay zeka opsiyonu."
9. "İnternet kesilse bile işiniz durmaz — tam çevrimdışı çalışır."
10. "Robom'dan 10 alanda fazlası, denemek 30 gün ücretsiz."

---

## VİDEO ÜRETİMİ İÇİN FLOW NOTLARI

1. **Google Flow'a girdi olarak:** her sahne için `video-prompt-30sn.md` dosyasındaki İngilizce görsel prompt + ilgili screenshot. Flow'a görüntü referansı verilebiliyorsa screenshot PNG'lerini ekleyin; verilemiyorsa prompttaki ekran tanımını metin olarak zenginleştirin.
2. **Sahne sırası önerilen akış:** Logo → Dashboard → e-Fatura/Cari → AI Asistan → Saha (İşçi/Araç/Depo) → WhatsApp/Banka → CTA.
3. **Metin üstü yazılar Türkçe kalsın** (hedef kitle); AI üretiminde yazı bozulursa yazıları kurguda (CapCut/Resolve) üstüne ekleyin — AI videoda metin üretimi hâlâ güvenilmezdir.
4. **Ses:** Flow'un ses üretimi yerine Türkçe seslendirmeyi ElevenLabs/Studio ile ayrı üretip kurguda bindirmek daha profesyonel sonuç verir.
5. Çıktı hedefi: 30sn 16:9 (web) + 30sn 9:16 (Reels/Shorts) iki versiyon.
