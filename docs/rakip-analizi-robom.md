# 🔍 Rakip Analizi: Robom vs MizanNet

> **Tarih:** 27 Eylül 2026
> **Rakip:** [Robom](https://robom.com) (Mükellef Teknoloji) — Yapay zeka destekli mobil ön muhasebe programı
> **Bizim Ürün:** MizanNet — Maden & inşaat sektörüne özel masaüstü işletme yönetim uygulaması (Tauri 2 + Next.js 15)

---

## 1. Yönetici Özeti

Robom, **mikro işletme ve KOBİ'lere yönelik mobil-öncelikli bir ön muhasebe aracıdır**. MizanNet ise **maden/şantiye operasyonlarına özel masaüstü bir işletme yönetim platformudur**. İkisi aynı pazar kitleye hizmet etmez, ancak Robom'un yaptığını bizim de yapabilmemiz gerekiyorsa kritik boşluklar var:

- **3 kritik eksik:** e-Fatura/e-Arşiv (GİB entegrasyonu), mobil uygulama, banka mutabakatı
- **4 orta eksik:** toplu fiş yükleme, mali müşavir portalı, e-imza, e-ticaret entegrasyonu
- **MizanNet'in 10+ üstünlüğü var** (ajan asistan, WhatsApp/Telegram, araç/Personel/Stok takibi, çevrimdışı çalışma vb.)

---

## 2. Robom Özellik Envanteri (rakipte olanlar)

| Özellik | Açıklama |
|---|---|
| 🧾 e-Fatura / e-Arşiv | GİB entegrasyonu ile fatura kesme, müşteriye otomatik iletim |
| 📸 Toplu Fiş Yükleme | Aynı anda 20 fiş, AI ile otomatik veri çıkarma (tutar, KDV, tarih) |
| 🤝 Cari Hesap Takibi | Müşteri/tedarikçi kayıtları, filtreleme, detaylı analiz |
| 💰 Gelir-Gider Takibi | Nakit akışı yönetimi, KDV raporları |
| 🏦 Banka Mutabakatı | Hesap uzlaştırma (ana sayfada belirtilmiş) |
| 📱 Mobil Uygulama | iOS + Android — "işin nerede, Robom orada" |
| ✍️ e-İmza | 1 yıl ücretsiz e-imza desteği |
| 🛒 e-Ticaret Entegrasyonu | Online satış kanalı bağlantısı |
| 👨‍💼 Mali Müşavir Portalı | Mükellefler fiş yükler, müşavir onaylar; müşavirler için ücretsiz |
| 📦 Ürün/Hizmet Yönetimi | Ürün kataloğu |
| 📊 Raporlar | Gelir + KDV raporları |
| 💵 Fiyat Modeli | ₺249/ay (%50 indirimli), kontör bazlı e-fatura |
| ☁️ Bulut | Web + mobil senkron |

---

## 3. MizanNet Özellik Envanteri (bizde olanlar)

| Modül | Durum |
|---|---|
| 📊 Yönetim Paneli | ✅ Finansal genel bakış, grafikler |
| 💼 Cari Hesaplar | ✅ Bakiye + hareket + Excel aktarımı |
| 📦 Depo/Stok | ✅ Kritik stok uyarısı + hareketler |
| 🚛 Araç Filosu | ✅ Masraf, lastik, muayene/sigorta takibi |
| 👷 İşçiler | ✅ İzin, mesai, avans, bordro, kıdem |
| 🏛️ Vergi Takibi | ✅ Son tarih + KDV hesaplayıcı |
| 📄 Belge Arşivi | ✅ Kategori + expiry takibi |
| 🤖 Yapay Zeka Asistanı | ✅ **Üstünlük:** Bilgisayar ajanı (terminal, dosya, Excel/Word üretimi, araçça canlı görünüm) |
| 💬 Haberleşme | ✅ **Üstünlük:** WhatsApp + Telegram + otomatik hatırlatma worker'ı |
| 📚 Bilgi Bankası | ✅ VUK, İş Kanunu, Tebliğler |
| 📅 Takvim + Bildirim | ✅ |
| ♻️ Geri Dönüşüm Kutusu | ✅ |
| 🔐 Çevrimdışı Lisans | ✅ Ed25519 imzalı |
| 📤 Excel/Fatura İçe Aktarma | ✅ AI destekli otomatik eşleme |
| 💾 Yerel AI Modeli | ✅ llama.cpp + HuggingFace browser (güncel Qwen3.8 desteği) |
| 🖥️ Platform | ❌ **Sadece Windows** (macOS/Linux yolda) |

---

## 4. KARŞILAŞTIRMA MATRİSİ

| # | Özellik | Robom | MizanNet | Durum |
|---|---|:---:|:---:|---|
| 1 | e-Fatura / e-Arşiv (GİB) | ✅ | ❌ | 🔴 **KRİTİK EKSİK** |
| 2 | Mobil uygulama (iOS/Android) | ✅ | ❌ | 🔴 **KRİTİK EKSİK** |
| 3 | Banka mutabakatı | ✅ | ❌ | 🔴 **KRİTİK EKSİK** |
| 4 | Toplu fiş yükleme (20+ aynı anda) | ✅ | 🟡 Tek tek | 🟡 ORTA |
| 5 | e-İmza | ✅ | ❌ | 🟡 ORTA |
| 6 | e-Ticaret entegrasyonu | ✅ | ❌ | 🟡 ORTA (sektör için düşük öncelik) |
| 7 | Mali müşavir portalı | ✅ | ❌ | 🟡 ORTA |
| 8 | Kasa / Banka hesapları ayrı takip | ✅ | 🟡 Cari üzerinden | 🟡 ORTA |
| 9 | Web üzerinden erişim | ✅ | 🟡 Web sitesi hazır, entegrasyon yok | 🟡 ORTA |
| 10 | Kontör/abonelik satış sistemi | ✅ | ❌ | 🟡 ORTA (web tarafında) |
| 11 | **AI işletme ajanı (terminal/dosya/Excel/Word)** | ❌ | ✅ | 🟢 **MİZANNET ÜSTÜN** |
| 12 | **WhatsApp + Telegram entegrasyonu** | ❌ | ✅ | 🟢 **MİZANNET ÜSTÜN** |
| 13 | **Araç filosu takibi** | ❌ | ✅ | 🟢 MİZANNET ÜSTÜN |
| 14 | **İşçi/Personel + bordro + kıdem** | ❌ | ✅ | 🟢 MİZANNET ÜSTÜN |
| 15 | **Stok + kritik uyarı** | 🟡 | ✅ | 🟢 MİZANNET ÜSTÜN |
| 16 | **Belge arşivi + expiry** | 🟡 | ✅ | 🟢 MİZANNET ÜSTÜN |
| 17 | **Çevrimdışı çalışma (yerel SQLite)** | ❌ | ✅ | 🟢 MİZANNET ÜSTÜN |
| 18 | **Sektöre özel (maden/inşaat)** | ❌ | ✅ | 🟢 MİZANNET ÜSTÜN |
| 19 | **Vergi takip + KDV hesaplayıcı** | 🟡 | ✅ | 🟢 MİZANNET ÜSTÜN |
| 20 | **Yerel AI model desteği** | ❌ | ✅ | 🟢 MİZANNET ÜSTÜN |

---

## 5. EKSİLER VE EYLEM PLANI

### 🔴 KRİTİK (Robom'u eşitlemek için şart)

#### 5.1 e-Fatura / e-Arşiv Fatura (GİB Entegrasyonu)
- **Durum:** Bizde hiç yok.
- **Neden kritik:** Türkiye'de faal olan her KOBİ'nin birincil ihtiyacı.
- **Eylem:**
  - GİB'e özel entegratör üzerinden bağlanma (Foriba, Paraşüt, Logo, İzibiz, Uyumsoft API'leri) veya
  - Kendi GİB portal entegrasyonu (e-dönüşüm çerçeve sözleşmesi gerekir).
  - Alternatif kısa vade: Paraşüt veya İzibiz'in "reseller API"si ile başlayıp kontör modeli kurgulamak.
- **Tahmini süre:** 3-6 hafta (entegratöre göre değişir).

#### 5.2 Mobil Uygulama (iOS/Android)
- **Durum:** Yalnızca Windows masaüstü.
- **Neden kritik:** Robom'un ana satış argümanı "mobil ön muhasebe".
- **Eylem:**
  - **Kolay yol:** Tauri 2 **mobil hedefi** (iOS/Android) — kod tabanı zaten Tauri 2, `mobile_entry_point` yapılandırılmış. UI'ı responsive hale getirmek yeterli.
  - **Alternatif:** Web'li hibrit (D:\Web-Siteleri\mizannet-web'i PWA olarak paketleyip "Add to Home Screen" ile mobil deneyim sunmak).
- **Tahmini süre:** 4-8 hafta (responsive + mobile ayarlar).

#### 5.3 Banka Mutabakatı
- **Durum:** Yok. Cari hesap kayıtları var ama banka ekstresiyle eşleştirme yok.
- **Neden kritik:** Özellikle maden/şantiye işletmelerinde günlük nakit akışı yönetimi şart.
- **Eylem:**
  - MT940 / CSV / XLSX banka ekstresi içe aktarma
  - AI destekli otomatik eşleştirme (MizanNet'te `ai_auto_map_excel` zaten var; buna "banka eşleştirme" modu ekle)
  - Cari ↔ banka hareketi otomatik bağlama.
- **Tahmini süre:** 2-3 hafta.

### 🟡 ORTA ÖNCELİK

#### 5.4 Toplu Fiş Yükleme
- **Mevcut:** Tek tek PDF/görsel fiş analizi (`analyze_file`).
- **Eylem:** UI'da multi-select + arka planda paralel analiz + toplu onay ekranı. AI backend zaten hazır.
- **Tahmini süre:** 1 hafta.

#### 5.5 Kasa / Banka Hesapları Ayrı Takip
- **Mevcut:** Cari hareketler tek havuzda.
- **Eylem:** Yeni `accounts` tablosu (Kasa / Banka-1 / Banka-2 / POS), her ledger_entry'ye `account_id` ekleme, hesap bazlı bakiye.
- **Tahmini süre:** 1-2 hafta.

#### 5.6 Mali Müşavir Portalı
- **Eylem:** Web sitesinde (mizannet-web) "Müşavir" rolü; müşavirin müşterilerinin özetini görebileceği panel. Uygulamadan dışa aktarılan verinin müşavire paylaşımı.
- **Tahmini süre:** 3-4 hafta.

#### 5.7 e-İmza
- **Eylem:** Belge onay akışında e-imza (KamuSM / e-imza sağlayıcı API) entegrasyonu.
- **Tahmini süre:** 2-3 hafta.

#### 5.8 Web ↔ Uygulama Senkronu
- **Mevcut:** Web'de auth + lisans API'si hazır (`/api/desktop/verify`, `/api/desktop/activate`).
- **Eylem:** Uygulamaya `web_login`, `web_verify`, `web_activate_license` komutları ekleyip JWT tabanlı lisans senkronu.
- **Tahmini süre:** 1 hafta.

### 🟢 DÜŞÜK ÖNCELİK (sektör gereği)

#### 5.9 e-Ticaret Entegrasyonu
- Maden/inşaat sektöründe düşük talep. Sonraya bırakılabilir.

---

## 6. MİZANNET'İN ROBOM'DA OLMAYAN ÜSTÜNLÜKLERİ (pazarlama malzemesi)

1. 🤖 **Gerçek AI işletme ajanı:** Terminal çalıştırır, dosya taşır, Excel/Word üretir, veritabanı sorgular — canlı görselle sohbette.
2. 💬 **WhatsApp + Telegram entegrasyonu:** Müşteriye otomatik borç hatırlatma, vade uyarısı, kritik stok ve günlük özet.
3. 🚛 **Araç filosu yönetimi:** Masraf, lastik, muayene/sigorta takibi — maden işletmeleri için şart.
4. 👷 **İşçi yönetimi:** İzin, mesai, avans, bordro, kıdem tazminatı hesaplama.
5. 📦 **Gelişmiş stok:** Kritik seviye uyarısı, hareket geçmişi, tedarikçi takibi.
6. 📴 **Tam çevrimdışı çalışma:** Yerel SQLite; internet yoksa bile tüm modüller çalışır.
7. 🧠 **Yerel AI modeli:** Veriler bilgisayardan çıkmadan AI destekli analiz (gizlilik).
8. 📚 **Yerleşik Bilgi Bankası:** VUK, İş Kanunu, tebliğler — asistan hukuki sorulara yanıt verir.
9. ♻️ **Geri dönüşüm kutusu:** Yanlışlıkla silinen kayıtlar 30 gün kurtarılabilir.
10. 🎯 **Sektöre özgülük:** Maden ve hafriyat iş akışlarına göre tasarlanmış.

---

## 7. FİYAT KARŞILAŞTIRMASI

| | Robom | MizanNet (öneri) |
|---|---|---|
| Abonelik | ₺249/ay (yıllık ₺2.988+KDV) | Serbest (masaüstü tek seferlik lisans) |
| e-Fatura kontörü | ₺199 (100) - ₺999 (1000) | YOK (entegrasyon eklenecekse kurgulanmalı) |
| Deneme | 14 gün | 30 gün |
| Çoklu kullanıcı | ❌ Tek kullanıcı | ✅ Çoklu işletme + şube |

**Not:** Robom'un "tek kullanıcı" sınırlaması MizanNet için pazarlama fırsatı.

---

## 7.5. Deneme Sürümü ve Kayıt Akışı Analizi (27 Eylül 2026 eki)

### app.robom.com/register — Kayıt Formu (canlı incelendi)

| Alan/Adım | Robom | MizanNet Durumu |
|---|---|---|
| Kimlik | İsim, Soyisim, E-Posta, Telefon (ülke kodu seçici), Şifre + doğrulama | 🟡 Masaüstü lisans anahtarı ile açılıyor; web'de e-posta + şifre var |
| Şifre kuralları | Min 8 karakter, 1 büyük + 1 küçük harf, 1 rakam, 1 sembol | 🟡 Web tarafında yok, eklenebilir |
| Şirket tipi | Bireysel / Serbest Meslek / Bilanço (KOBİ) / Limited / Anonim | ❌ Yok |
| Faaliyet alanı | Aranabilir combobox (NACE benzeri) | ❌ Yok — "maden/şantiye" gibi sektörel profiller eklenebilir |
| **Kişiselleştirme (öne çıkan yenilik)** | "Fatura Odaklı" (Basit/Odaklı/Minimal) ve "Tahsilat Odaklı" (Detaylı/Kapsamlı/Entegre) profilleri ile onboarding sırasında arayüzü kişiselleştirme | ❌ Yok — **MizanNet için güçlü fikir: açılışta "Sektör Seçimi" (Maden / İnşaat / Hafriyat / Taşımacılık) yapıp modülleri vurgulayarak dashboard'u özelleştirmek** |
| Onay kutuları | Kullanım koşulları + KVKK aydınlatma metni | ❌ Masaüstünde yok; web'de var |
| Deneme süresi | 14 gün (web tabanlı, kredi kartı yok) | ✅ 30 gün (daha uzun — üstünlük) |

### robom.com/deneme-surumu — Deneme Paketi İçeriği

- Profesyonel fatura taslakları (satış faturası şablonu)
- Kolay gider yönetimi (toplu gider girişi vurgusu)
- Anlık finansal raporlar (gelir-gider + KDV)
- Veri kaydı (ürün/hizmet, müşteri/tedarikçi hazır verilerle temel pakete geçiş)
- Ücretsiz rehberler (uzman hazırlı, anında erişim)
- Temel pakete geçişte: e-Fatura geçiş danışmanlığı + 1 yıl ücretsiz e-imza + sınırsız kontör

**MizanNet için çıkarım:** Robom, denemeyi sadece "ücretsiz ürün" olarak değil **onboarding + kişiselleştirme + rehber + geçiş danışmanlığı** paketi olarak satıyor. MizanNet'in 30 günlük denemesine:
1. Açılış sihirbazı (sektör/şirket tipi/faaliyet alanı seçimi → modül vurguları)
2. Demo veriyle doldurma seçeneği ("hazır verilerle temel pakete geç" muadili)
3. Uygulama içi rehberler (Bilgi Bankası zaten var, "İlk Adımlar" turu eklenebilir)
4. KVKK onay adımı (masaüstü ilk açılışta)
eklenirse deneme dönüşümü artar.

## 8. SONUÇ VE ÖNCELİK SIRALAMASI

MizanNet, Robom'un **yonetimsel derinliğinde çok ileride**; ama **KOBİ'nin "e-fatura kesebilme" beklentisini** karşılamıyor. Önerilen yol haritası:

| Sıra | Yapılacak | Süre | Etki |
|---|---|---|---|
| 1 | **e-Fatura/e-Arşiv entegrasyonu** (Paraşüt/İzibiz API) | 3-6 hafta | 🔥🔥🔥 |
| 2 | **Banka mutabakatı** (CSV + AI eşleştirme) | 2-3 hafta | 🔥🔥 |
| 3 | **Toplu fiş yükleme** | 1 hafta | 🔥🔥 |
| 4 | **Web ↔ Uygulama lisans senkronu** (API hazır) | 1 hafta | 🔥🔥 |
| 5 | **Kasa/Banka hesap ayrımı** | 1-2 hafta | 🔥 |
| 6 | **Mobil (Tauri 2 mobile / PWA)** | 4-8 hafta | 🔥🔥🔥 |
| 7 | Mali müşavir portalı (web) | 3-4 hafta | 🔥 |
| 8 | e-İmza | 2-3 hafta | 🔥 |

---

*Bu rapor, Robom'un resmi web sitesindeki (robom.com, robom.com/fiyatlar, robom.com/mobil-on-muhasebe-programi, robom.com/deneme-surumu, app.robom.com/register) bilgilere dayanarak 27 Eylül 2026 tarihinde hazırlanmıştır.*
