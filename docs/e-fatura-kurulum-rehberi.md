# 🧾 GİB e-Fatura Kurulum ve Kullanım Rehberi

> MizanNet'e entegre edilen GİB e-Arşiv Portal entegrasyonu — resmi e-Fatura kesme kılavuzu

---

## ✍️ SENİN YAPMAN GEREKENLER (Ön Hazırlık)

### 1. GİB e-Arşiv Portal Kullanıcısı Oluştur (Zorunlu — 5 dakika)

Uygulama, GİB'in **resmi e-Arşiv Portal**'ına bağlanır. Bunun için:

1. **https://ivd.gib.gov.tr** adresine gir → İnteraktif Vergi Dairesi
2. Giriş yap (e-Devlet veya İnternet Vergi Dairesi şifrenle)
3. **"Bilgilerim / Sicil Kaydım"** alanına git
4. **"İnteraktif Vergi Dairesi Kullanıcı Kodu"** ve **"Portal Şifresi"** oluştur

> ⚠️ Bu bilgileri bilmiyorsan **muhasebecine (mali müşavirine) sor** — genelde onlar senin adına oluşturmuştur.

### 2. e-Fatura Mükellefi Ol (Eğer değilsen — 1 gün)

1 Ocak 2026'dan itibaren **yıllık brüt satışı 3 milyon TL üzeri** olan herkes e-Fatura mükellefi (önceki eşik 5 milyon TL'ydi, düştü). Kontrol için:

- **https://efatura.gov.tr** → "Sorgulama" → VKN'ni gir
- Mükellef değilsen: İnteraktif Vergi Dairesi → "e-Dönüşüm" → "e-Fatura Başvurusu" → başvuru yap
- Başvuru 1 iş günü içinde onaylanır

**Not:** e-Fatura mükellefi olmasan bile **e-Arşiv Fatura** kesebilirsin — MizanNet'teki entegrasyon e-Arşiv Portal'ı kullanır, yani e-Fatura mükellefi olmasan da çalışır. Ancak e-Fatura mükellefi olan firmalara fatura keseceksen, karşı tarafın sistemine otomatik gitmesi için mükellef olman gerekir.

### 3. Portala Kayıtlı GSM Numaranı Doğrula (2 dakika)

Fatura **SMS ile imzalanır** (kesilir). Portalda kayıtlı telefon numaran doğru olmalı:

1. **https://earsivportal.efatura.gov.tr/intragiris.html** → giriş yap
2. **"Ayarlar" / "Profil"** → Cep telefonu numaranı güncelle
3. Numaran aktif olsun — SMS kodu buraya gelir

### 4. Şirket Bilgilerini Uygulamaya Gir (2 dakika)

MizanNet → **Ayarlar → Profil** bölümünde şunların dolu olduğundan emin ol:
- Firma adı (unvan)
- Vergi No (VKN)
- Vergi Dairesi
- Adres, il/ilçe

---

## 📲 UYGULAMADA KULLANIM (10 dakikada ilk fatura)

### Adım 1: Portal Bağlantısı
1. Sol menüden **"e-Fatura (GİB)"** sekmesine gir
2. **Kullanıcı Kodu** (VKN) ve **Portal Şifreni** gir → "GİB Portalına Giriş Yap"
3. Yeşil "GİB e-Arşiv portalına bağlı" çubuğunu gör

### Adım 2: Fatura Oluştur
1. **"Yeni Fatura"** butonuna bas
2. **VKN/TCKN** gir → 🔍 butonuna bas → GİB'den alıcı bilgileri otomatik dolar
3. Ürün/hizmet satırlarını ekle (miktar, birim, fiyat, KDV %)
4. **"Taslak Oluştur & SMS Başlat"** → GİB'de taslak oluşur ve telefonuna SMS kodu gelir

### Adım 3: SMS ile İmzala (Kes)
1. SMS'den gelen **6 haneli kodu** gir
2. **"İmzala"** bas → fatura **resmen kesilir** ve vergi sisteminde mali veri oluşur
3. ⚠️ İmzalanan fatura üzerinde artık değişiklik yapılamaz ve silinemez!

### Adım 4: İndir / Takip Et
- Belge listesinden PDF/ZIP olarak indir
- "Onaylanmadı" durumundaki taslakları silebilirsin
- "Onaylandı" faturalarda hata varsa GİB'e **iptal talebi** oluşturulmalı (GİB portalından)

---

## 🧪 TEST ETME (Önce denemen için)

Test portalını kullanarak gerçek fatura kesmeden alıştırma yapabilirsin:

1. e-Fatura sekmesinde giriş yaparken **"Test portalını kullan (earsivportaltest)"** kutusunu işaretle
2. GİB'in paylaştığı test hesabı ile giriş yap
3. Test portalda kesilen faturaların **hiçbir mali geçerliliği yoktur**

---

## 🔐 Güvenlik

- GİB şifren **yalnızca senin bilgisayarında**, yerel SQLite veritabanında (settings tablosu) saklanır
- Şifre hiçbir sunucuya gönderilmez — doğrudan `earsivportal.efatura.gov.tr`'ye bağlanır
- Token, oturum süresi sonunda otomatik geçersiz olur; tekrar giriş yapman gerekir

---

## ❓ Sık Sorulanlar

**Fatura karşı tarafa otomatik gidiyor mu?**
e-Arşiv faturalar GİB portalında tutulur; karşı taraf İnteraktif Vergi Dairesi'nden görür. e-Fatura mükellefi bir firmaya kesiyorsan, GİB onun e-Fatura sistemine iletir.

**MizanNet bu faturaları cari hesaba işliyor mu?**
Şu an fatura kesme + indirme yapıyor. Fatura kesildikten sonra cari hesaba otomatik işleme (ledger_entry) bir sonraki adımda eklenebilir.

**Entegratör (Paraşüt, İzibiz) gerekli mi?**
Hayır — bu entegrasyon GİB'in **kendi resmi portal API'sini** kullanır, üçüncü parti entegratöre ve kontör ücretine gerek yok. Robom gibi rakipler entegratör üzerinden çalışıp kontör satar; sen ücretsiz resmi yolu kullanıyorsun.

**Limit var mı?**
GİB portalı günde çok yüksek sayıda fatura gönderimini otomatik kısıtlar (spam koruması). Normal işletme kullanımında sorun yaşanmaz.

---

## 🛠️ Teknik Notlar (geliştirici)

- Portal protokolü: `mlevent/fatura` (PHP) kütüphanesiyle aynı — Rust'a port edildi
- Uçlar: `assos-login` (token), `dispatch` (cmd/pageName/jp), `download` (belge indir)
- Komutlar: `EARSIV_PORTAL_FATURA_OLUSTUR`, `EARSIV_PORTAL_TASLAKLARI_GETIR`, `EARSIV_PORTAL_SMSSIFRE_GONDER`, SMS imza cmd: `0lhozfib5410mp`
- Kod: `src-tauri/src/commands/gib_einvoice.rs` + `src/components/e-fatura/gib-einvoice.tsx`
- GİB portal API'sini resmi olarak dökümante etmez; portal güncellemesi olursa cmd kodları değişebilir — test portalıyla düzenli kontrol önerilir
