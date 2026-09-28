import {
  Home,
  Wallet,
  Trash2,
  FileSpreadsheet,
  ReceiptText,
  FileText,
  FolderArchive,
  Warehouse,
  Truck,
  Landmark,
  Users,
  Bell,
  Sparkles,
  Settings,
  Bot,
  MessageCircle,
  BookOpen,
  Calendar,
  ScanLine,
  CalendarClock,
  Store,
  CreditCard,
  PieChart,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const ALL_NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Anasayfa", icon: Home },
  { href: "/cari", label: "Cari Hesaplar", icon: Wallet },
  { href: "/veri-aktarim", label: "Veri Aktarımı", icon: FileSpreadsheet },
  { href: "/fis-ocr", label: "Fiş & Gider OCR", icon: ScanLine },
  { href: "/e-fatura", label: "e-Fatura & e-SMM (GİB)", icon: FileText },
  { href: "/nakit-ajanda", label: "Nakit Akış Ajandası", icon: CalendarClock },
  { href: "/belgeler", label: "Belge Arşivi", icon: FolderArchive },
  { href: "/depo", label: "Depo", icon: Warehouse },
  { href: "/araclar", label: "Araçlar", icon: Truck },
  { href: "/cek-senet", label: "Çek & Senet", icon: CreditCard },
  { href: "/banka", label: "Banka Hareketleri", icon: Landmark },
  { href: "/pazaryeri", label: "Pazaryeri (E-Ticaret)", icon: Store },
  { href: "/raporlar", label: "Raporlar & Analiz", icon: PieChart },
  { href: "/vergi", label: "Vergi Takibi", icon: Landmark },
  { href: "/isciler", label: "İşçiler", icon: Users },
  { href: "/bildirimler", label: "Bildirimler", icon: Bell },
  { href: "/takvim", label: "Takvim", icon: Calendar },
  { href: "/asistan", label: "Asistan", icon: Sparkles },
  { href: "/haberlesme", label: "Haberleşme", icon: MessageCircle },
  { href: "/rehber", label: "Bilgi Bankası", icon: BookOpen },
  { href: "/geri-donusum", label: "Geri Dönüşüm Kutusu", icon: Trash2 },
  { href: "/ayarlar", label: "Ayarlar", icon: Settings },
];

export function getNavItems(industryType?: string): NavItem[] {
  let filteredItems = [...ALL_NAV_ITEMS];
  
  if (industryType === 'perakende') {
    // Perakende: Araçlar, İşçiler gizlenir. Pazaryeri, Banka, Çek-Senet aktif kalır.
    filteredItems = filteredItems.filter(item => !['/araclar', '/isciler'].includes(item.href));
  } else if (industryType === 'hizmet') {
    // Hizmet: Depo, Araçlar, Pazaryeri, Çek-Senet gizlenir. Sadece Banka ve finansallar kalır.
    filteredItems = filteredItems.filter(item => !['/araclar', '/depo', '/pazaryeri', '/cek-senet'].includes(item.href));
  } else if (industryType === 'hafriyat_maden') {
    // Hafriyat: Pazaryeri (E-Ticaret) gereksizdir, gizlenir.
    filteredItems = filteredItems.filter(item => !['/pazaryeri'].includes(item.href));
  }
  // hafriyat_maden (varsayılan veya hepsi seçiliyse) tüm modülleri göster.

  return filteredItems;
}

export const ROUTE_TITLES: Record<string, string> = ALL_NAV_ITEMS.reduce(
  (acc, item) => {
    acc[item.href] = item.label;
    return acc;
  },
  {} as Record<string, string>
);
