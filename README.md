<div align="center">

# â›ï¸ MizanNet

**Maden ve inşaat sektörü için masaüstü işletme yönetim uygulaması**
**Desktop business management app for the mining & construction sector**

<p>
  <a href="#-türkçe">ğŸ‡¹ğŸ‡· Türkçe</a> â€¢
  <a href="#-english">ğŸ‡¬ğŸ‡§ English</a>
</p>

<p>
  <img src="https://img.shields.io/badge/Tauri-2.x-24C8DB?style=for-the-badge&logo=tauri&logoColor=white" />
  <img src="https://img.shields.io/badge/Next.js-15-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Rust-src--tauri-DE4B23?style=for-the-badge&logo=rust&logoColor=white" />
  <img src="https://img.shields.io/badge/SQLite-Database-07405E?style=for-the-badge&logo=sqlite&logoColor=white" />
</p>

<p>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-informational?style=flat-square" />
  <img src="https://img.shields.io/badge/status-active%20development-success?style=flat-square" />
  <img src="https://img.shields.io/badge/license-Private-lightgrey?style=flat-square" />
</p>

</div>

---

## ğŸ‡¹ğŸ‡· Türkçe

### ğŸ“Œ Proje Hakkında

**MizanNet**, maden ocakları ve inşaat firmalarının günlük operasyonlarını tek bir masaüstü uygulamadan yönetebilmesi için geliştirilmiş, tamamen Türkçe arayüzlü bir işletme yönetim sistemidir. Uygulama **Tauri** (Rust) altyapısı üzerinde çalışır, verileri yerel bir **SQLite** veritabanında saklar ve internet bağlantısına ihtiyaç duymadan çalışabilir.

### âœ¨ Özellikler / Modüller

| Modül | Açıklama |
|---|---|
| ğŸ’³ **Cari Hesaplar** | Müşteri/tedarikçi cari hesap takibi, bakiye ve hareket geçmişi |
| ğŸ—‘ï¸ **Geri Dönüşüm Kutusu** | Silinen kayıtları geri yükleme ve kalıcı silme |
| ğŸ“¦ **Depo** | Stok ve malzeme takibi |
| ğŸšš **Araçlar** | Araç filosu, bakım ve masraf takibi |
| ğŸ§¾ **Vergi Takibi** | Vergi ödemeleri ve son tarih takibi |
| ğŸ‘· **İşçiler** | Personel/işçi kayıtları ve bilgileri |
| ğŸ“„ **Belgeler** | Åirket belgelerinin dijital arşivi |
| ğŸ”” **Bildirimler** | Önemli hatırlatma ve uyarı bildirimleri |
| ğŸ“Š **Excel Aktarımı** | Verileri Excel'e aktarma/içe aktarma |
| ğŸ§® **Fatura Aktarımı** | Fatura verilerini içe aktarma |
| âš™ï¸ **Ayarlar** | Uygulama genel ayarları |
| ğŸ¤– **Asistan** | Kullanıcıya yardımcı akıllı asistan modülü |

### ğŸ› ï¸ Teknoloji Yığını

- **Masaüstü çatısı:** Tauri 2 (Rust)
- **Arayüz:** Next.js 15 + React 19 + TypeScript
- **Veritabanı:** SQLite (yerel, çevrimdışı çalışır)
- **Paket yöneticisi:** pnpm

### ğŸš€ Kurulum ve Çalıştırma

```bash
# Bağımlılıkları yükle
pnpm install

# Geliştirme modunda çalıştır (Tauri masaüstü penceresi açılır)
pnpm tauri dev

# Üretim için derle
pnpm tauri build
```

> Not: Tauri için Rust ve platforma özgü sistem bağımlılıklarının kurulu olması gerekir. Detaylar için [Tauri kurulum kılavuzu](https://tauri.app/start/prerequisites/) sayfasına bakın.

### ğŸ“ Proje Yapısı

```
madenapp/
â”œâ”€â”€ src/                # Next.js / React frontend
â”‚   â””â”€â”€ app/            # Modül sayfaları (cari, depo, araclar, vergi, ...)
â”œâ”€â”€ src-tauri/          # Rust backend (Tauri) ve SQLite entegrasyonu
â””â”€â”€ public/             # Statik dosyalar
```

### ğŸ—ºï¸ Yol Haritası

- [ ] Gerçek ekran görüntülerinin eklenmesi
- [ ] Raporlama ve grafik modülü
- [ ] Çoklu kullanıcı desteği
- [ ] Otomatik güncelleme mekanizması

---

## ğŸ‡¬ğŸ‡§ English

### ğŸ“Œ About

**MizanNet** is a fully Turkish-language desktop business management system built for mining and construction companies to manage their daily operations from a single application. It runs on **Tauri** (Rust), stores data in a local **SQLite** database, and works fully offline.

### âœ¨ Features / Modules

| Module | Description |
|---|---|
| ğŸ’³ **Current Accounts** | Customer/supplier account tracking, balances and transaction history |
| ğŸ—‘ï¸ **Recycle Bin** | Restore or permanently delete removed records |
| ğŸ“¦ **Warehouse** | Stock and material tracking |
| ğŸšš **Vehicles** | Fleet, maintenance and expense tracking |
| ğŸ§¾ **Tax Tracking** | Tax payments and deadline tracking |
| ğŸ‘· **Workers** | Employee/worker records |
| ğŸ“„ **Documents** | Digital archive of company documents |
| ğŸ”” **Notifications** | Reminders and important alerts |
| ğŸ“Š **Excel Import/Export** | Import/export data to/from Excel |
| ğŸ§® **Invoice Import** | Import invoice data |
| âš™ï¸ **Settings** | General application settings |
| ğŸ¤– **Assistant** | Smart assistant module for the user |

### ğŸ› ï¸ Tech Stack

- **Desktop framework:** Tauri 2 (Rust)
- **Frontend:** Next.js 15 + React 19 + TypeScript
- **Database:** SQLite (local, works offline)
- **Package manager:** pnpm

### ğŸš€ Getting Started

```bash
# Install dependencies
pnpm install

# Run in development mode (opens the Tauri desktop window)
pnpm tauri dev

# Build for production
pnpm tauri build
```

> Note: Rust and platform-specific system dependencies are required for Tauri. See the [Tauri prerequisites guide](https://tauri.app/start/prerequisites/) for details.

### ğŸ“ Project Structure

```
madenapp/
â”œâ”€â”€ src/                # Next.js / React frontend
â”‚   â””â”€â”€ app/            # Module pages (cari, depo, araclar, vergi, ...)
â”œâ”€â”€ src-tauri/          # Rust backend (Tauri) with SQLite integration
â””â”€â”€ public/             # Static assets
```

### ğŸ—ºï¸ Roadmap

- [ ] Add real screenshots
- [ ] Reporting & charts module
- [ ] Multi-user support
- [ ] Auto-update mechanism

---

<div align="center">

Geliştirici / Developer: **[karaturancan-droid](https://github.com/karaturancan-droid)**

</div>
