<div align="center">

# MizanNet

**Maden ve inşaat sektörü için masaüstü işletme yönetim uygulaması**

[![Tauri](https://img.shields.io/badge/Tauri-2.x-24C8DB?style=for-the-badge&logo=tauri&logoColor=white)](https://tauri.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Rust](https://img.shields.io/badge/Rust-Backend-DE4B23?style=for-the-badge&logo=rust&logoColor=white)](https://rustlang.org)
[![SQLite](https://img.shields.io/badge/SQLite-Yerel_Veritabanı-07405E?style=for-the-badge&logo=sqlite&logoColor=white)](https://sqlite.org)

![Platform](https://img.shields.io/badge/platform-Windows-informational?style=flat-square)
![Durum](https://img.shields.io/badge/durum-aktif_geliştirme-success?style=flat-square)

**[Özellikler](#-özellikler--modüller) • [Ekran Görüntüleri](#-ekran-görüntüleri) • [Kurulum](#-kurulum-ve-çalıştırma) • [Proje Yapısı](#-proje-yapısı) • [Teknoloji](#-teknoloji-yığını)**

</div>

---

## 📌 Proje Hakkında

**MizanNet**, maden ocakları ve inşaat firmalarının günlük operasyonlarını — cari hesaplardan stok takibine, araç filosundan personel yönetimine — tek bir masaüstü uygulamadan yönetebilmesi için geliştirilmiş, tamamen **Türkçe arayüzlü** bir işletme yönetim sistemidir.

- 🔒 **Verileriniz sizde kalır:** Tüm veriler yerel **SQLite** veritabanında saklanır
- 📴 **Çevrimdışı çalışır:** İnternet bağlantısı olmadan tüm modüller kullanılabilir
- 🏭 **Sektöre özel:** Hafriyat, maden ve inşaat firmalarının iş akışlarına göre tasarlandı
- 🏢 **Çoklu işletme & şube:** Birden fazla işletme ve şube yönetimi

## ✨ Özellikler / Modüller

| Modül | Açıklama |
|---|---|
| 📊 **Yönetim Paneli** | Finansal genel bakış: bakiye, kâr, gelir/gider grafikleri ve son işlemler |
| 💼 **Cari Hesaplar** | Müşteri/tedarikçi cari takibi, bakiye ve hareket geçmişi, Excel aktarımı |
| 🧾 **e-Fatura (GİB)** | GİB e-Arşiv portalı entegrasyonu, kontör olmadan fatura kesme ve imzalama |
| 📦 **Depo** | Stok ve malzeme takibi, stok hareketleri, kritik stok uyarıları |
| 🚛 **Araçlar** | Araç filosu, bakım, lastik ve masraf takibi |
| 🏛️ **Vergi Takibi** | Vergi/SGK ödemeleri ve son tarih takibi, KDV hesaplayıcı |
| 👷 **İşçiler** | Personel kayıtları, izin, mesai, avans ve maaş bordrosu |
| 📄 **Belge Arşivi** | Şirket belgelerinin dijital arşivi ve kategorize edilmiş saklama |
| 🔔 **Bildirimler** | Önemli hatırlatma ve uyarı bildirimleri |
| 📅 **Takvim** | Ödeme günleri ve önemli tarihler için takvim görünümü |
| 📊 **Veri Aktarımı** | Excel içe/dışa aktarma ve fatura verisi işleme |
| 🤖 **Yapay Zeka Asistanı** | Yerel veya bulut tabanlı akıllı asistan; faturaları tanır, rapor çıkarır |
| 💬 **Haberleşme** | WhatsApp ve Telegram entegrasyonları ile onay akışları |
| 📚 **Bilgi Bankası** | İş hukuku, VUK ve tebliğler içeren yerleşik rehber |
| ♻️ **Geri Dönüşüm Kutusu** | Silinen kayıtları geri yükleme ve kalıcı silme |
| ⚙️ **Ayarlar** | Profil, yedekleme, AI sağlayıcı, lisans ve veri konumu yönetimi |
| 🔐 **Lisans Sistemi** | Çevrimdışı çalışan, donanım bağımsız VIP lisans doğrulama |

## 🖼️ Ekran Görüntüleri

<div align="center">

### Yönetim Paneli
![Yönetim Paneli](docs/screenshots/dashboard.png)

### Cari Hesaplar
![Cari Hesaplar](docs/screenshots/cari.png)

</div>

<details>
<summary><b>📂 Diğer Modüller</b></summary>

<div align="center">

| | |
|---|---|
| ![Giriş Ekranı](docs/screenshots/login.png) | ![Depo](docs/screenshots/depo.png) |
| **Giriş Ekranı** | **Depo / Stok** |
| ![Araçlar](docs/screenshots/araclar.png) | ![İşçiler](docs/screenshots/isciler.png) |
| **Araç Filosu** | **İşçi Yönetimi** |
| ![Vergi](docs/screenshots/vergi.png) | ![Belgeler](docs/screenshots/belgeler.png) |
| **Vergi Takibi** | **Belge Arşivi** |
| ![Bildirimler](docs/screenshots/bildirimler.png) | ![Veri Aktarımı](docs/screenshots/veri-aktarim.png) |
| **Bildirimler** | **Veri Aktarımı** |
| ![Asistan](docs/screenshots/asistan.png) | ![Ayarlar](docs/screenshots/ayarlar.png) |
| **Yapay Zeka Asistanı** | **Ayarlar** |
| ![Takvim](docs/screenshots/takvim.png) | ![Bilgi Bankası](docs/screenshots/rehber.png) |
| **Takvim** | **Bilgi Bankası** |

</div>
</details>

## 🛠️ Teknoloji Yığını

| Katman | Teknoloji |
|---|---|
| Masaüstü çatısı | **Tauri 2** (Rust) |
| Arayüz | **Next.js 15** + **React 19** + **TypeScript** |
| Veritabanı | **SQLite** (yerel, çevrimdışı) |
| Grafikler | Recharts |
| Stil | Tailwind CSS |
| Paket yöneticisi | pnpm |

**Rust backend modülleri:** SQLite veri katmanı (`db.rs`), şifreleme (`crypto.rs`), lisans doğrulama (`license.rs`), yerel AI motoru (`ai.rs`), Excel/fatura işleme, yedekleme ve WhatsApp/Telegram entegrasyonları.

## 🚀 Kurulum ve Çalıştırma

> **Ön koşul:** [Node.js 18+](https://nodejs.org), [pnpm](https://pnpm.io) ve [Rust](https://rustup.rs). Ayrıntılı liste için [Tauri kurulum kılavuzu](https://tauri.app/start/prerequisites/)'na bakın.

```bash
# Bağımlılıkları yükle
pnpm install

# Geliştirme modunda çalıştır (Tauri masaüstü penceresi açılır)
pnpm tauri dev

# Üretim için derle (installer/exe çıktısı src-tauri/target altına iner)
pnpm tauri build
```

> WhatsApp worker'ı (isteğe bağlı): `cd whatsapp-worker && npm install`

## 📁 Proje Yapısı

```
mizannet/
├── src/                    # Next.js / React frontend
│   ├── app/                # Modül sayfaları (cari, depo, araclar, vergi, ...)
│   ├── components/         # UI bileşenleri (modül bazlı organize)
│   ├── contexts/           # Auth ve şube (branch) context'leri
│   ├── hooks/              # Backend çağrılarını yöneten hook'lar
│   └── lib/                # Tauri köprüsü, Excel, yardımcılar
├── src-tauri/              # Rust backend (Tauri 2)
│   ├── src/commands/       # Tauri komutları (modül bazlı)
│   ├── src/db.rs           # SQLite veri katmanı
│   ├── src/ai.rs           # Yerel/bulut AI motoru
│   ├── src/license.rs      # Çevrimdışı lisans doğrulama
│   └── icons/              # Uygulama ikonları
├── whatsapp-worker/        # WhatsApp entegrasyon servisi (Baileys)
├── brand/                  # Marka varlıkları (logo, renkler)
└── docs/screenshots/       # README görselleri
```

## 🗺️ Yol Haritası

- [x] Uygulama içi ekran görüntüleri
- [x] WhatsApp & Telegram entegrasyonları
- [x] Yerel AI motoru (çevrimdışı asistan)
- [ ] Raporlama ve gelişmiş grafik modülü
- [ ] Otomatik güncelleme mekanizması
- [ ] macOS & Linux derlemeleri

---

<div align="center">

Geliştirici: **[karaturancan-droid](https://github.com/karaturancan-droid)**

© 2026 Madenova — MizanNet

</div>
