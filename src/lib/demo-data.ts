/**
 * TARAYICI DEMO VERİSİ — yalnızca geliştirme/önizleme amaçlıdır.
 *
 * Masaüstü (Tauri) ortamında BU DOSYA HİÇ KULLANILMAZ; tüm veriler SQLite'tan gelir.
 * Tarayıcıda (`pnpm dev` / statik export) modüllerin dolu görünmesi için
 * callBackend buraya düşer. Üretim kullanıcısını etkilemez.
 */

const now = () => new Date().toISOString();
const daysFromNow = (d: number) => {
  const t = new Date();
  t.setDate(t.getDate() + d);
  return t.toISOString().slice(0, 10);
};

export const DEMO_BRANCHES = [
  { id: 'b1', name: 'Merkez Şube', description: 'Ankara', created_at: now() },
  { id: 'b2', name: 'Şube 2 — Konya Ocağı', description: 'Konya', created_at: now() },
];

export const DEMO_COMPANIES = [
  { id: 'c1', name: 'ABC Ticaret A.Ş.', tax_no: '1234567890', phone: '0312 555 10 10', email: 'info@abcticaret.com', contact_person: 'Ahmet Yılmaz', balance: 1250000, created_at: now() },
  { id: 'c2', name: 'XYZ Ltd. Şti.', tax_no: '9876543210', phone: '0332 444 20 20', email: 'muhasebe@xyzltd.com', contact_person: 'Ayşe Kaya', balance: 780000, created_at: now() },
  { id: 'c3', name: 'Anadolu Nakliyat', tax_no: '4567891230', phone: '0216 333 30 30', email: 'sevk@anadolunakliyat.com', contact_person: 'Mehmet Demir', balance: -145000, created_at: now() },
  { id: 'c4', name: 'Hafriyat Makina San.', tax_no: '3216549870', phone: '0224 222 40 40', email: 'satinalma@hafriyatmak.com', contact_person: 'Fatma Şahin', balance: 2340000, created_at: now() },
  { id: 'c5', name: 'Ege İnşaat Taahhüt', tax_no: '7894561230', phone: '0232 111 50 50', email: 'proje@egeinsaat.com', contact_person: 'Ali Çelik', balance: 412000, created_at: now() },
];

export const DEMO_LEDGER: Record<string, unknown[]> = Object.fromEntries(
  DEMO_COMPANIES.map((c, ci) => [
    c.id,
    Array.from({ length: 6 }, (_, i) => {
      const debit = (i % 2 === 0 ? 1 : 0) * (85000 + ci * 40000 + i * 25000);
      const credit = (i % 2 === 1 ? 1 : 0) * (120000 + ci * 30000 + i * 18000);
      return {
        id: `${c.id}-l${i}`,
        company_id: c.id,
        date: daysFromNow(-((6 - i) * 12)),
        document_no: `FTR-2026-${1000 + ci * 10 + i}`,
        description: i % 2 === 0 ? 'Malzeme satışı / fatura' : 'Ödeme tahsil edildi',
        debit,
        credit,
        running_balance: c.balance - (5 - i) * (debit - credit) * -1,
        entry_type: i % 2 === 0 ? 'borç' : 'alacak',
        created_at: now(),
      };
    }),
  ])
);

export const DEMO_PRODUCTS = [
  { id: 'p1', name: 'M-50 Kırma Kırıntısı', sku: 'KRM-050', category: 'Kırma Malzemesi', unit: 'ton', purchase_price: 180, sale_price: 260, min_stock: 500, current_stock: 3400, supplier: 'Anadolu Nakliyat', created_at: now() },
  { id: 'p2', name: 'Mıcır 12-22 mm', sku: 'MCR-1222', category: 'Agrega', unit: 'ton', purchase_price: 210, sale_price: 310, min_stock: 300, current_stock: 1250, supplier: 'Ege İnşaat', created_at: now() },
  { id: 'p3', name: 'Çimento Portland 42.5', sku: 'CMT-425', category: 'Bağlayıcı', unit: 'çuval', purchase_price: 95, sale_price: 135, min_stock: 200, current_stock: 160, supplier: 'ABC Ticaret', created_at: now() },
  { id: 'p4', name: 'Dizel Motor Yağı 15W-40', sku: 'YAG-1540', category: 'Bakım', unit: 'varil', purchase_price: 4200, sale_price: 5600, min_stock: 4, current_stock: 9, supplier: 'XYZ Ltd.', created_at: now() },
  { id: 'p5', name: 'Konveyör Bant 800mm', sku: 'BNT-800', category: 'Ekipman', unit: 'metre', purchase_price: 1250, sale_price: 1680, min_stock: 20, current_stock: 45, supplier: 'Hafriyat Makina', created_at: now() },
  { id: 'p6', name: 'Lastik 12.00R20 OTR', sku: 'LST-1220', category: 'Lastik', unit: 'adet', purchase_price: 14500, sale_price: 18900, min_stock: 6, current_stock: 3, supplier: 'ABC Ticaret', created_at: now() },
];

export const DEMO_VEHICLES = [
  { id: 'v1', plate: '34 XYZ 567', brand: 'Volvo', model: 'FH16 750', year: 2022, status: 'aktif', km: 284500, inspection_due_date: daysFromNow(64), insurance_due_date: daysFromNow(120), category: 'Tır', created_at: now() },
  { id: 'v2', plate: '06 ABC 123', brand: 'Mercedes', model: 'Arocs 4145', year: 2021, status: 'aktif', km: 412000, inspection_due_date: daysFromNow(21), insurance_due_date: daysFromNow(200), category: 'Damperli Kamyon', created_at: now() },
  { id: 'v3', plate: '33 KRM 045', brand: 'Caterpillar', model: '777G', year: 2019, status: 'bakımda', km: 890000, inspection_due_date: daysFromNow(45), insurance_due_date: daysFromNow(90), category: 'Maden Kamyonu', created_at: now() },
  { id: 'v4', plate: '35 HFR 789', brand: 'JCB', model: '4CX Backhoe', year: 2023, status: 'aktif', km: 86000, inspection_due_date: daysFromNow(150), insurance_due_date: daysFromNow(30), category: 'İş Makinesi', created_at: now() },
  { id: 'v5', plate: '07 EGE 234', brand: 'Komatsu', model: 'PC490', year: 2020, status: 'pasif', km: 567000, inspection_due_date: daysFromNow(80), insurance_due_date: daysFromNow(15), category: 'Ekskavatör', created_at: now() },
];

export const DEMO_VEHICLE_EXPENSES = [
  { id: 'e1', vehicle_id: 'v1', type: 'yakıt', amount: 48200, date: daysFromNow(-8), note: 'Full depo — Ankara çıkışı', created_at: now() },
  { id: 'e2', vehicle_id: 'v1', type: 'bakım', amount: 35600, date: daysFromNow(-30), note: '25.000 km bakımı', created_at: now() },
  { id: 'e3', vehicle_id: 'v2', type: 'yakıt', amount: 52300, date: daysFromNow(-5), note: 'Konya hattı', created_at: now() },
  { id: 'e4', vehicle_id: 'v2', type: 'lastik', amount: 58900, date: daysFromNow(-60), note: '2 adet arka lastik', created_at: now() },
  { id: 'e5', vehicle_id: 'v3', type: 'bakım', amount: 128400, date: daysFromNow(-12), note: 'Major bakım + filtre seti', created_at: now() },
  { id: 'e6', vehicle_id: 'v4', type: 'sigorta', amount: 47500, date: daysFromNow(-90), note: 'Trafik + kasko yenileme', created_at: now() },
];

export const DEMO_WORKERS = [
  { id: 'w1', full_name: 'Şehmus Aydın', tc_no: '1**********', hire_date: '2022-03-14', position: 'Operatör', salary: 42500, phone: '0532 111 22 33', created_at: now() },
  { id: 'w2', full_name: 'Hasan Karaduman', tc_no: '2**********', hire_date: '2021-06-01', position: 'Şoför', salary: 38000, phone: '0533 222 33 44', created_at: now() },
  { id: 'w3', full_name: 'Zeynep Yıldırım', tc_no: '3**********', hire_date: '2023-01-09', position: 'Muhasebe', salary: 45000, phone: '0534 333 44 55', created_at: now() },
  { id: 'w4', full_name: 'Murat Öztürk', tc_no: '4**********', hire_date: '2020-09-20', position: 'Bakım Teknikeri', salary: 47800, phone: '0535 444 55 66', created_at: now() },
  { id: 'w5', full_name: 'Elif Arslan', tc_no: '5**********', hire_date: '2024-02-12', position: 'Saha Sorumlusu', salary: 62000, phone: '0536 555 66 77', created_at: now() },
  { id: 'w6', full_name: 'İbrahim Çetin', tc_no: '6**********', hire_date: '2019-11-03', position: 'Patlayıcı Uzmanı', salary: 71000, phone: '0537 666 77 88', created_at: now() },
];

export const DEMO_PAYROLLS = [
  { id: 'pr1', worker_id: 'w1', period: '2026-08', gross: 50000, net: 42500, deductions: 7500, status: 'ödendi', created_at: now() },
  { id: 'pr2', worker_id: 'w2', period: '2026-08', gross: 44700, net: 38000, deductions: 6700, status: 'ödendi', created_at: now() },
  { id: 'pr3', worker_id: 'w3', period: '2026-08', gross: 52900, net: 45000, deductions: 7900, status: 'taslak', created_at: now() },
];

export const DEMO_LEAVES = [
  { id: 'lv1', worker_id: 'w2', start_date: daysFromNow(5), end_date: daysFromNow(12), type: 'yıllık izin', days: 7, created_at: now() },
  { id: 'lv2', worker_id: 'w4', start_date: daysFromNow(-20), end_date: daysFromNow(-17), type: 'rapor', days: 3, created_at: now() },
];

export const DEMO_TAXES = [
  { id: 't1', type: 'KDV', period: '2026-08', amount: 486200, due_date: daysFromNow(9), status: 'bekliyor', created_at: now() },
  { id: 't2', type: 'Muhtasar', period: '2026-08', amount: 184500, due_date: daysFromNow(4), status: 'bekliyor', created_at: now() },
  { id: 't3', type: 'KDV', period: '2026-07', amount: 442800, due_date: daysFromNow(-15), status: 'ödendi', created_at: now() },
  { id: 't4', type: 'Emlak Vergisi', period: '2026', amount: 67800, due_date: daysFromNow(-2), status: 'gecikti', created_at: now() },
  { id: 't5', type: 'Damga Vergisi', period: '2026-08', amount: 22400, due_date: daysFromNow(11), status: 'bekliyor', created_at: now() },
];

export const DEMO_DOCUMENTS = [
  { id: 'd1', title: 'İş Makineleri Sigorta Poliçesi 2026', category: 'Sigorta', file_type: 'pdf', expiry_date: daysFromNow(23), tags: 'sigorta,jcb', created_at: now() },
  { id: 'd2', title: 'Ocak İşletme Ruhsatı', category: 'Ruhsat', file_type: 'pdf', expiry_date: daysFromNow(140), tags: 'ruhsat,maaden', created_at: now() },
  { id: 'd3', title: 'Çevre İzin Belgesi', category: 'Çevre', file_type: 'pdf', expiry_date: daysFromNow(8), tags: 'izin,çevre', created_at: now() },
  { id: 'd4', title: 'ABC Ticaret Sözleşme', category: 'Sözleşme', file_type: 'pdf', tags: 'sözleşme,abc', created_at: now() },
  { id: 'd5', title: 'İSG Eğitim Sertifika — Şehmus A.', category: 'İSG', file_type: 'pdf', expiry_date: daysFromNow(65), tags: 'isg, egitim', created_at: now() },
];

export const DEMO_NOTIFICATIONS = [
  { id: 'n1', title: 'Emlak Vergisi son ödeme tarihi geçti!', module: 'vergi', related_id: 't4', due_date: daysFromNow(-2), days_left: -2, status: 'aktif', source_type: 'vergi', created_at: now() },
  { id: 'n2', title: 'Muhtasar beyanname 4 gün içinde', module: 'vergi', related_id: 't2', due_date: daysFromNow(4), days_left: 4, status: 'aktif', source_type: 'vergi', created_at: now() },
  { id: 'n3', title: 'Çevre İzin Belgesi süresi doluyor', module: 'belgeler', related_id: 'd3', due_date: daysFromNow(8), days_left: 8, status: 'aktif', source_type: 'belge', created_at: now() },
  { id: 'n4', title: '06 ABC 123 muayene 21 gün kaldı', module: 'araclar', related_id: 'v2', due_date: daysFromNow(21), days_left: 21, status: 'aktif', source_type: 'arac', created_at: now() },
  { id: 'n5', title: 'KDV tahakkuku hazır', module: 'vergi', related_id: 't1', due_date: daysFromNow(9), days_left: 9, status: 'okundu', source_type: 'vergi', created_at: now() },
];

export const DEMO_SETTINGS: Record<string, string> = {
  company_name: 'Madenova Madencilik Ltd.',
  tax_no: '1230984576',
  phone: '0312 999 88 77',
  email: 'info@madenova.com.tr',
  contact_person: 'Kemal Madenci',
  ai_provider: 'google',
  industry_type: 'hafriyat_maden',
  setup_complete: '1',
};

export const DEMO_CHAT_SESSIONS = [
  { id: 's1', title: 'Ağustos kâr analizi', created_at: now(), updated_at: now() },
  { id: 's2', title: 'Vergi takvimi', created_at: now(), updated_at: now() },
];
