<div align="center">

# MizanNet

**Modern, Hızlı ve Akıllı İşletme Yönetim Sistemi (KOBİ, İnşaat, E-Ticaret, Maden)**

[![Tauri](https://img.shields.io/badge/Tauri-2.x-24C8DB?style=for-the-badge&logo=tauri&logoColor=white)](https://tauri.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Rust](https://img.shields.io/badge/Rust-Backend-DE4B23?style=for-the-badge&logo=rust&logoColor=white)](https://rustlang.org)
[![SQLite](https://img.shields.io/badge/SQLite-Yerel_Veritabanı-07405E?style=for-the-badge&logo=sqlite&logoColor=white)](https://sqlite.org)

![Platform](https://img.shields.io/badge/platform-Windows-informational?style=flat-square)
![Durum](https://img.shields.io/badge/durum-aktif_geliştirme-success?style=flat-square)
![Sürüm](https://img.shields.io/badge/sürüm-v1.0.0-blue?style=flat-square)

**[Özellikler](#-özellikler--modüller) • [Kurulum](#-indirme-ve-kurulum) • [Proje Yapısı](#-proje-yapısı) • [Teknoloji](#-teknoloji-yığını)**

</div>

---

## 📌 Proje Hakkında

**MizanNet**, modern işletmelerin (KOBİ'ler, inşaat firmaları, e-ticaret satıcıları, maden ocakları vb.) tüm günlük operasyonlarını — cari hesaplardan çek-senet işlemlerine, e-faturadan banka mutabakatına, stok takibinden personel yönetimine kadar — tek bir masaüstü uygulamadan yönetebilmesi için geliştirilmiş, tamamen **Türkçe arayüzlü** ve Yapay Zeka (AI) destekli bir işletme yönetim sistemidir.

- 🔒 **Tam Veri Güvenliği:** Tüm verileriniz yerel bilgisayarınızda (**SQLite**) şifreli olarak saklanır. Buluta zorunlu veri gönderilmez.
- 📴 **Çevrimdışı ve Yerel Ağ (LAN):** İnternet olmadan çalışabilme yeteneği. Ayrıca **Yerel Ağ (LAN) Senkronizasyonu** sayesinde aynı ofisteki birden fazla bilgisayar uygulamayı ortak bir ağ üzerinden aynı anda kullanabilir.
- 🤖 **Yapay Zeka (AI CFO):** Finansal verilerinizi analiz eden, raporlar sunan ve fatura okuyan dahili asistan.
- 📱 **Rol Bazlı WhatsApp ve Telegram Entegrasyonu:** Onaylı çalışanlarınızın şirkete dair bilgileri anlık sorgulayabilmesi (yetki sınırlandırmalı) için gelişmiş mesajlaşma botları.

## ✨ Özellikler / Modüller

| Modül | Açıklama |
|---|---|
| 📊 **Yönetim Paneli (CFO Dashboard)** | Finansal genel bakış, nakit akışı, kâr-zarar durumu ve gelir/gider grafikleri. |
| 💼 **Cari Hesaplar** | Detaylı müşteri/tedarikçi cari takibi, borç-alacak yaşlandırma ve PDF/Excel ekstre alımı. |
| 🏦 **Banka ve Mutabakat** | Banka hareketlerini sisteme işleme, otomatik mutabakat eşleştirme ve bakiye takibi. |
| 📜 **Çek ve Senetler** | Alınan/Verilen çek ve senetlerin durum (Tahsil, Ciro, Bekliyor vb.) ve vade takibi. |
| 🧾 **e-Fatura (GİB)** | GİB e-Arşiv entegrasyonu. Ekstra kontör ücreti ödemeden doğrudan fatura kesme, SMS ile imzalama. |
| 🛒 **Pazaryeri Entegrasyonu** | E-ticaret firmaları için çoklu pazaryeri yönetimi ve sipariş/gelir analizi. |
| 📦 **Depo ve Stok** | Depolar arası transfer, stok sayımı, malzeme hareketleri ve kritik stok uyarı sistemi. |
| 🚛 **Araçlar ve Filo** | Araç bakım, masraf, yakıt fişi ve lastik değişimi gibi detaylı filo operasyonları. |
| 👷 **Personel (İşçiler)** | İşçi izin, mesai, maaş bordrosu, avans ödemeleri hesaplamaları. |
| 🏛️ **Vergi Takibi** | Vergi/SGK takvimi, son ödeme günleri hatırlatıcısı ve tahmini KDV/Vergi hesaplayıcı. |
| 📄 **Belge Arşivi & Fiş OCR** | İşletme belgelerinin arşivlenmesi ve fiş/faturaların Yapay Zeka ile (OCR) okunup işlenmesi. |
| 💬 **Telegram / WhatsApp** | Şirket yönetici ve personellerine özel entegre asistan. (Sadece yetkili olanlar gizli verileri çekebilir). |

## 🚀 İndirme ve Kurulum

Dağıtıma hazır (v1.0.0) Windows kurulum dosyalarını direkt indirebilirsiniz:

- **Standart Kurulum:** [MizanNet_Windows_Kurulum.exe](https://github.com/karaturancan-droid/mizannet-v1/raw/main/MizanNet_Windows_Kurulum.exe) *(Son kullanıcılar için tavsiye edilir)*
- **MSI Paketi:** [MizanNet_Windows_Kurulum.msi](https://github.com/karaturancan-droid/mizannet-v1/raw/main/MizanNet_Windows_Kurulum.msi) *(Grup ilkesi veya kurumsal ağ dağıtımları için)*

**Kurulum Adımları:**
1. Yukarıdaki bağlantılardan `exe` veya `msi` dosyasını indirin.
2. İndirdiğiniz dosyayı çalıştırın. Windows SmartScreen *Bilinmeyen Yayıncı* uyarısı verirse, **Ek Bilgi > Yine de Çalıştır** seçenekleriyle devam edin.
3. Masaüstünüze gelen MizanNet kısayolu ile sisteme hemen giriş yapın.

> **Geliştiriciler için ortam kurulumu:** Node.js (18+), pnpm ve Rust kurulu bir bilgisayarda `pnpm install` ardından `pnpm tauri dev` ile geliştirme modunu başlatabilirsiniz.

## 🛠️ Teknoloji Yığını

Yüksek performans, düşük bellek kullanımı ve modern bir arayüz deneyimi sunmak için endüstri standardı araçlarla kodlanmıştır.

| Katman | Teknoloji / Çatı |
|---|---|
| **Masaüstü & Core** | **Tauri v2** + **Rust** |
| **Frontend (Önyüz)** | **Next.js 15 (React 19)** + TypeScript |
| **Stil & Arayüz** | **Tailwind CSS** + **shadcn/ui** + Framer Motion |
| **Veritabanı** | **SQLite** (Yerel veri işleme, Rust `r2d2` pool) |
| **Grafikler & Analiz** | Recharts, Lucide Icons |

**Rust (Backend) Sistemleri:** 
- Gelişmiş yetki (Role-Based) kontrollü Telegram dinleme Thread'leri
- LAN üzerinden güvenli yerel ağ API sunucusu (Express tadında `network_server`)
- Çevrimdışı donanımsal lisans (VIP) imzalama ve doğrulama algoritmaları
- GİB e-Fatura, veritabanı yedeği alma ve PDF oluşturma köprüleri.

## 🗺️ Yol Haritası

- [x] Gelişmiş Cari, Kasa, Depo, Personel modülleri
- [x] Banka Hareketleri & Banka Mutabakat (Reconciliation) Sistemi
- [x] Çek ve Senet Takip Sistemi
- [x] GİB üzerinden ücretsiz e-Fatura Kesme ve SMS İmzalama
- [x] Role dayalı güvenlikli Telegram / WhatsApp Bot Entegrasyonu
- [x] Yerel Ağ (LAN) Desteği ile Ofis İçi Paylaşım
- [ ] Gelişmiş Kar/Zarar Merkezi Raporlama Stüdyosu
- [ ] Bulut Yedekleme (Google Drive / OneDrive Entegrasyonu)

---

<div align="center">

Geliştirici: **[karaturancan-droid](https://github.com/karaturancan-droid)**

© 2026 Madenova — MizanNet

</div>
