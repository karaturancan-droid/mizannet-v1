import type { ReactNode } from "react";

export interface ModuleIconProps {
  className?: string;
  strokeWidth?: number;
}

function Svg({
  className,
  strokeWidth = 1.7,
  children,
}: ModuleIconProps & { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/* Cari Hesaplar - cari kartı: solda kişi, sağda hesap satırları */
export function IconCari(props: ModuleIconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M13 4v16" />
      <circle cx="8" cy="9.6" r="2.1" />
      <path d="M4.9 16.6a3.4 3.4 0 0 1 6.2 0" />
      <path d="M16.1 8.4h2.6M16.1 12h2.6M16.1 15.6h1.5" />
    </Svg>
  );
}

/* Depo - çatılı depo binası, kapı ve kasa */
export function IconDepo(props: ModuleIconProps) {
  return (
    <Svg {...props}>
      <path d="M2.8 10.2 12 4.4l9.2 5.8" />
      <path d="M4.9 11.7v8.2h14.2v-8.2" />
      <rect x="11.6" y="13.9" width="5" height="6" rx="0.4" />
      <path d="M11.6 16.4h5" />
      <rect x="6.9" y="15.1" width="3.4" height="4.8" rx="0.4" />
      <path d="M8.6 15.1v4.8" />
    </Svg>
  );
}

/* Araçlar - hız çizgili teslimat kamyonu */
export function IconAraclar(props: ModuleIconProps) {
  return (
    <Svg {...props}>
      <path d="M1.4 9.8h2.6M1 12.8h3" />
      <path d="M5.2 15.8V7.6h8.2v8.2" />
      <path d="M13.4 10.4h3.3l3.2 3.3v2.1h-6.5" />
      <circle cx="8.5" cy="17.6" r="1.7" />
      <circle cx="16.6" cy="17.6" r="1.7" />
      <path d="M10.2 17.6h4.7" />
    </Svg>
  );
}

/* Vergi Takibi - yüzde işaretli belge ve kaşe */
export function IconVergi(props: ModuleIconProps) {
  return (
    <Svg {...props}>
      <path d="M15.6 9.6V4.6a1.1 1.1 0 0 0-1.1-1.1H6.4A1.6 1.6 0 0 0 4.8 5.1v13.4a1.6 1.6 0 0 0 1.6 1.6h4.3" />
      <path d="M11.5 3.5v5a1.1 1.1 0 0 0 1.1 1.1h3" />
      <circle cx="8.1" cy="10.1" r="1" />
      <circle cx="11.3" cy="13.3" r="1" />
      <path d="M11.6 9.7 8 13.7" />
      <path d="M18.5 12.4a2 2 0 0 1 2 2v1.5h-4v-1.5a2 2 0 0 1 2-2z" />
      <rect x="15.7" y="17.5" width="5.6" height="3" rx="0.8" />
    </Svg>
  );
}

/* İşçiler - üç kişilik organizasyon şeması */
export function IconIsciler(props: ModuleIconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="4.6" r="2.1" />
      <path d="M9 9a3.1 3.1 0 0 1 6 0" />
      <circle cx="5.2" cy="15.2" r="2.1" />
      <path d="M2.2 19.6a3.1 3.1 0 0 1 6 0" />
      <circle cx="18.8" cy="15.2" r="2.1" />
      <path d="M15.8 19.6a3.1 3.1 0 0 1 6 0" />
      <path d="M10.4 10.6 6.6 12.8M13.6 10.6l3.8 2.2" />
    </Svg>
  );
}

/* Belge Arşivi - açık klasör ve içinde belgeler */
export function IconBelgeler(props: ModuleIconProps) {
  return (
    <Svg {...props}>
      <path d="M3 7.4a1.6 1.6 0 0 1 1.6-1.6h3.6l1.9 2.2h9.3A1.6 1.6 0 0 1 21 9.6v.9H6.2L3 19.4z" />
      <path d="M4.6 10.5h15.9a1.4 1.4 0 0 1 1.4 1.4l-1.7 6.4a1.6 1.6 0 0 1-1.5 1.2H6.5a1.6 1.6 0 0 1-1.5-1.1L3.4 11.9" />
      <path d="M13.6 12.4h4.2M13.6 15h4.2M13.6 17.3h2.4" />
    </Svg>
  );
}

/* Bildirimler - zil */
export function IconBildirimler(props: ModuleIconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.2a1.4 1.4 0 0 1 1.4 1.4v.5a6 6 0 0 1 4.6 5.8v3.4l1.6 2.7H4.4L6 14.3v-3.4a6 6 0 0 1 4.6-5.8v-.5A1.4 1.4 0 0 1 12 3.2z" />
      <path d="M9.9 19.6a2.2 2.2 0 0 0 4.2 0" />
    </Svg>
  );
}

/* Excel Aktarımı - X işaretli tablo belgesi ve aktarım oku */
export function IconExcelAktarim(props: ModuleIconProps) {
  return (
    <Svg {...props}>
      <path d="M13.8 9.4V4.6a1.2 1.2 0 0 0-1.2-1.2H6a1.6 1.6 0 0 0-1.6 1.6v14a1.6 1.6 0 0 0 1.6 1.6h2.2" />
      <path d="M9.9 3.4v4.6a1.3 1.3 0 0 0 1.3 1.3h2.7" />
      <path d="m13.8 12.6 4.6 4.6M18.4 12.6l-4.6 4.6" />
      <path d="M20.6 8.4a6.4 6.4 0 0 0-2.4-3.1" />
      <path d="M6.4 17.4h3.4M6.4 13.6h2" />
    </Svg>
  );
}

/* Fatura Aktarımı - fatura belgesi ve aktarım oku */
export function IconFaturaAktarim(props: ModuleIconProps) {
  return (
    <Svg {...props}>
      <path d="M13.4 9.2V4.6a1.2 1.2 0 0 0-1.2-1.2H6.2A1.6 1.6 0 0 0 4.6 5v13.6a1.6 1.6 0 0 0 1.6 1.6h3" />
      <path d="M9.6 3.4v4.6a1.2 1.2 0 0 0 1.2 1.2h2.6" />
      <path d="M7.4 12.6h4.4M7.4 15.4h3" />
      <path d="M14.6 11.4h5.2v9.2l-1.3-1-1.3 1-1.3-1-1.3 1z" />
      <path d="M16.6 14.2h1.8M16.6 16.6h1.8" />
    </Svg>
  );
}

/* Excel/Fatura Aktarımı - referanstaki birleşik tile (her iki belge + oklar) */
export function IconExcelFatura(props: ModuleIconProps) {
  return (
    <Svg {...props}>
      <path d="M10.4 8.8V4.4a1.1 1.1 0 0 0-1.1-1.1H4.6a1.5 1.5 0 0 0-1.5 1.5v11.4a1.5 1.5 0 0 0 1.5 1.5h1.6" />
      <path d="M7.4 3.3v4.2a1.1 1.1 0 0 0 1.1 1.1h2" />
      <path d="m8.2 9.4 3 3M11.2 9.4l-3 3" />
      <path d="M13.4 12.6h5.4a1.2 1.2 0 0 1 1.2 1.2v6.4a1.2 1.2 0 0 1-1.2 1.2h-5.4z" />
      <path d="M15.4 15.4h3.4M15.4 17.8h2.2" />
      <path d="M19.6 8.2c1.4 1 2.2 2.3 2.4 3.9" />
      <path d="m22 12.1-.4-2.1-2.1.4" />
      <path d="M4.4 19.8c-1.4-1-2.2-2.3-2.4-3.9" />
      <path d="m2 15.9.4 2.1 2.1-.4" />
    </Svg>
  );
}

/* Geri Dönüşüm Kutusu - çöp kutusu ve dönüşüm sembolü */
export function IconGeriDonusum(props: ModuleIconProps) {
  return (
    <Svg {...props}>
      <path d="M4.4 7.4h15.2" />
      <path d="M9.4 7.4V5.2a1.4 1.4 0 0 1 1.4-1.4h2.4a1.4 1.4 0 0 1 1.4 1.4v2.2" />
      <path d="M6.3 7.4 7.5 20a1.6 1.6 0 0 0 1.6 1.4h5.8a1.6 1.6 0 0 0 1.6-1.4l1.2-12.6" />
      <path d="m10.6 15.4 1.1-2.2 1.1 2.2" />
      <path d="M11.7 13.2v3.4" />
      <path d="m9.4 18.2 1.2-.7M14.4 18.2l-1.2-.7" />
    </Svg>
  );
}
