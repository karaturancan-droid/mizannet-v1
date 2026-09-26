import {
  Home,
  Wallet,
  Trash2,
  FileSpreadsheet,
  ReceiptText,
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
  { href: "/belgeler", label: "Belge Arşivi", icon: FolderArchive },
  { href: "/depo", label: "Depo", icon: Warehouse },
  { href: "/araclar", label: "Araçlar", icon: Truck },
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
    // Perakende: Araçlar ve İşçiler modüllerini gizle
    filteredItems = filteredItems.filter(item => !['/araclar', '/isciler'].includes(item.href));
  } else if (industryType === 'hizmet') {
    // Hizmet: Depo ve Araçlar modüllerini gizle
    filteredItems = filteredItems.filter(item => !['/araclar', '/depo'].includes(item.href));
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
