/**
 * Yönetim paneli (Anasayfa) veri katmanı.
 *
 * MizanNet çevrimdışı bir masaüstü uygulamasıdır: Tauri içinde SQLite'taki
 * gerçek kayıtlardan (cari, depo, işçiler, araçlar) beslenir; tarayıcı
 * önizlemesinde mockup verisiyle çalışır.
 */
import { callBackend, isTauriEnvironment } from "@/lib/tauri";

/* ---------- Tipler ---------- */

export interface MonthPoint {
  month: string;
  gelir: number;
  gider: number;
}

export interface CariBar {
  id: string;
  name: string;
  balance: number;
}

export interface GiderCategory {
  name: string;
  amount: number;
  color: string;
}

export interface TxRow {
  id: string;
  company_id?: string;
  date: string; // "25 May" biçimi
  desc: string;
  amount: number; // + gelir, - gider
}

export interface Kpis {
  toplamBakiye: number;
  aylikKar: number;
  depoDoluluk: number; // 0-100
}

export interface UpcomingPayment {
  workerName: string;
  amount: number;
  daysLeft: number;
  dateStr: string;
}

export interface WorkerStats {
  toplam: number;
  izinli: number;
  yeniKayit: number;
}

export interface FleetStats {
  toplam: number;
  aktif: number;
  bakimda: number;
}

export interface DashboardData {
  kpis: Kpis;
  gelirGider: MonthPoint[];
  cariler: CariBar[];
  giderKategorileri: GiderCategory[];
  islemler: TxRow[];
  isciler: WorkerStats;
  filo: FleetStats;
  hedef: number; // 0 => hedef tanımlı değil
  kaynak: "veritabani" | "ornek" | "bos";
  guncelleme: string; // "HH:mm"
  upcomingPayments: UpcomingPayment[];
}

/* ---------- Sabitler ---------- */

const MONTHS_SHORT = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

export const CHART_COLORS = {
  gelir: "#168AC6",
  gider: "#6C7C74",
  palette: ["#1C1E1F", "#168AC6", "#64A4E0", "#89B0B5", "#746C74", "#ACACAD"],
};

export function chartTickTRY(v: number): string {
  return tlKuruşsuz(v);
}

/** 2 haneli kuruşlu ve TL simgeli format. Örn: 12000000 -> "12.000.000,00 TL" */
export function tlKuruşsuz(v: number): string {
  const formatted = new Intl.NumberFormat("tr-TR", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
  return `${formatted} TL`;
}

function nowHM(): string {
  return new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

/* ---------- Örnek (mockup) veri ---------- */

function demoData(): DashboardData {
  return {
    kpis: { toplamBakiye: 12500000.50, aylikKar: 850000.00, depoDoluluk: 72 },
    gelirGider: [
      { month: "Oca", gelir: 4500000, gider: 2100000 },
      { month: "Şub", gelir: 5200000, gider: 2600000 },
      { month: "Mar", gelir: 6400000, gider: 3300000 },
      { month: "Nis", gelir: 6100000, gider: 2900000 },
      { month: "May", gelir: 8300000, gider: 5100000 },
      { month: "Haz", gelir: 7200000, gider: 4600000 },
      { month: "Tem", gelir: 9400000, gider: 6900000 },
      { month: "Ağu", gelir: 11800000, gider: 7400000 },
      { month: "Eyl", gelir: 12900000, gider: 8800000 },
      { month: "Eki", gelir: 11600000, gider: 7400000 },
      { month: "Kas", gelir: 13900000, gider: 9700000 },
      { month: "Ara", gelir: 15100000, gider: 10300000 },
    ],
    cariler: [
      { id: "mock1", name: "ABC Ticaret", balance: 5395000 },
      { id: "mock2", name: "XYZ Ltd", balance: 3780000 },
      { id: "mock3", name: "Firma C", balance: 2020000 },
      { id: "mock4", name: "Şehmus D", balance: 1400000 },
      { id: "mock5", name: "Sahra D", balance: -90500 },
    ],
    giderKategorileri: [
      { name: "İşçiler", amount: 1200000, color: CHART_COLORS.palette[0] },
      { name: "Depo", amount: 600000, color: CHART_COLORS.palette[1] },
      { name: "Araçlar", amount: 300000, color: CHART_COLORS.palette[2] },
      { name: "Vergiler", amount: 350000, color: CHART_COLORS.palette[3] },
      { name: "Diğer", amount: 158000, color: CHART_COLORS.palette[4] },
    ],
    islemler: [
      { id: "t1", date: "25 May", desc: "Cari Ödeme - ABC Ticaret", amount: 1500000 },
      { id: "t2", date: "20 May", desc: "Depo Stok Girişi - Hammadde", amount: -250000 },
      { id: "t3", date: "17 May", desc: "Araç Bakımı - 34XYZ567", amount: -120000 },
      { id: "t4", date: "18 May", desc: "İşçi Maaş Ödemeleri", amount: -1850000 },
      { id: "t5", date: "12 May", desc: "Cari Tahsilat - XYZ Ltd", amount: 2820000 },
      { id: "t6", date: "08 May", desc: "Vergi Ödemesi - KDV", amount: -350000 },
    ],
    isciler: { toplam: 25, izinli: 4, yeniKayit: 2 },
    filo: { toplam: 6, aktif: 5, bakimda: 1 },
    hedef: 17500,
    kaynak: "ornek",
    guncelleme: nowHM(),
    upcomingPayments: [],
  };
}

/* ---------- Gerçek veri (Tauri / SQLite) ---------- */

interface DbCompany { id: string; name: string; balance: number }
interface DbLedgerEntry {
  id: string;
  company_id: string;
  date: string;
  description?: string;
  debit: number;
  credit: number;
}
interface DbProduct { id: string; current_stock: number; min_stock: number; purchase_price: number }
interface DbStockMovement { id: string; product_id: string; type: string; quantity: number; date: string }
interface DbWorker { id: string; full_name?: string; exit_date?: string; created_at: string; salary: number; payment_day?: number }
interface DbLeave { id: string; worker_id: string; start_date: string; end_date: string }
interface DbPayroll { id: string; worker_id: string; period: string; net?: number; status: string }
interface DbVehicle { id: string; status?: string }
interface DbVehicleExpense { id: string; vehicle_id: string; amount: number; date: string }
interface DbTaxItem { id: string; amount: number; due_date: string; status: string }

/** Son 12 ayın "YYYY-MM" anahtarları (eskiden yeniye). */
function lastTwelveMonths(): string[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}

function monthKey(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  return p.catch(() => fallback);
}

async function loadRealData(): Promise<DashboardData> {
  const guncelleme = nowHM();

  const [companies, products, workers, vehicles, taxes, movements] = await Promise.all([
    safe(callBackend<DbCompany[]>("list_companies"), []),
    safe(callBackend<DbProduct[]>("list_products"), []),
    safe(callBackend<DbWorker[]>("list_workers"), []),
    safe(callBackend<DbVehicle[]>("list_vehicles"), []),
    safe(callBackend<DbTaxItem[]>("list_tax_items"), []),
    safe(callBackend<DbStockMovement[]>("list_stock_movements", { product_id: null }), []),
  ]);

  // Ledger: cari başına kayıtlar
  const entriesChunks = await Promise.all(
    companies.map((c) =>
      safe(callBackend<DbLedgerEntry[]>("list_ledger_entries", { company_id: c.id, year_filter: null }), [])
    )
  );
  const entries = entriesChunks.flat();

  // İşçi alt verileri (izin + maaş) cari ay için
  const workerIds = workers.map((w) => w.id);
  const [leavesChunks, payrollsChunks] = await Promise.all([
    Promise.all(workerIds.map((id) => safe(callBackend<DbLeave[]>("list_leaves", { worker_id: id }), []))),
    Promise.all(workerIds.map((id) => safe(callBackend<DbPayroll[]>("list_payrolls", { worker_id: id }), []))),
  ]);
  const leaves = leavesChunks.flat();
  const payrolls = payrollsChunks.flat();

  // Araç giderleri (araç başına)
  const expenseChunks = await Promise.all(
    vehicles.map((v) => safe(callBackend<DbVehicleExpense[]>("list_vehicle_expenses", { vehicle_id: v.id }), []))
  );
  const vehicleExpenses = expenseChunks.flat();

  // Hiç kayıt yoksa panel boş durum olarak işaretlenir (sahte veri gösterilmez)
  const hicKayitYok =
    companies.length === 0 &&
    entries.length === 0 &&
    products.length === 0 &&
    workers.length === 0 &&
    vehicles.length === 0;

  const keys = lastTwelveMonths();
  const currentKey = keys[keys.length - 1];
  const nowIso = new Date().toISOString();

  /* Cari bakiyeler (en yüksek 5) */
  const cariler: CariBar[] = companies
    .map((c) => ({ id: c.id, name: c.name, balance: Math.abs(c.balance) }))
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5);

  const toplamBakiye = companies.reduce((s, c) => s + c.balance, 0);

  /* Aylık gelir/gider — cari ledger mantığı:
     Borç (debit) = carinin bize borcu => satış/gelir,
     Alacak (credit) = tahsilat/ödeme => gider. */
  const gelirByMonth = new Map<string, number>();
  const giderByMonth = new Map<string, number>();
  for (const e of entries) {
    const k = monthKey(e.date);
    if (!k) continue;
    gelirByMonth.set(k, (gelirByMonth.get(k) ?? 0) + (e.debit || 0));
    giderByMonth.set(k, (giderByMonth.get(k) ?? 0) + (e.credit || 0));
  }
  const gelirGider: MonthPoint[] = keys.map((k) => ({
    month: MONTHS_SHORT[Number(k.slice(5, 7)) - 1],
    gelir: gelirByMonth.get(k) ?? 0,
    gider: giderByMonth.get(k) ?? 0,
  }));

  const aylikGelir = gelirByMonth.get(currentKey) ?? 0;
  const aylikGider = giderByMonth.get(currentKey) ?? 0;
  const aylikKar = aylikGelir - aylikGider;

  /* Gider kategorileri: bu ayın gerçek kalemlerinden */
  const maasBuAy = payrolls
    .filter((p) => p.status === "ödendi" && (p.period ?? "").slice(0, 7) === currentKey)
    .reduce((s, p) => s + (p.net || 0), 0);
  const fiyatByProduct = new Map(products.map((p) => [p.id, p.purchase_price || 0]));
  const malzemeBuAy = movements
    .filter((m) => m.type === "giriş" && monthKey(m.date) === currentKey)
    .reduce((s, m) => s + m.quantity * (fiyatByProduct.get(m.product_id) ?? 0), 0);
  const araclarBuAy = vehicleExpenses
    .filter((e) => monthKey(e.date) === currentKey)
    .reduce((s, e) => s + (e.amount || 0), 0);
  const vergilerBuAy = taxes
    .filter((t) => t.status === "ödendi" && monthKey(t.due_date) === currentKey)
    .reduce((s, t) => s + (t.amount || 0), 0);
  const diger = Math.max(0, aylikGider - maasBuAy - malzemeBuAy - araclarBuAy - vergilerBuAy);

  const kategoriTipleri: { name: string; amount: number }[] = [
    { name: "İşçiler", amount: maasBuAy },
    { name: "Depo", amount: malzemeBuAy },
    { name: "Araçlar", amount: araclarBuAy },
    { name: "Vergiler", amount: vergilerBuAy },
    { name: "Diğer", amount: diger },
  ];
  const giderKategorileri: GiderCategory[] = kategoriTipleri
    .filter((k) => k.amount > 0)
    .map((k, i) => ({ ...k, color: CHART_COLORS.palette[i % CHART_COLORS.palette.length] }));

  /* Son işlemler */
  const islemler: TxRow[] = entries
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6)
    .map((e) => {
      const d = new Date(e.date);
      const comp = companies.find((c) => c.id === e.company_id);
      return {
        id: e.id,
        company_id: e.company_id,
        date: Number.isNaN(d.getTime()) ? "—" : `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`,
        desc: e.description?.trim() || (comp ? `Cari İşlem - ${comp.name}` : "Cari İşlem"),
        amount: (e.debit || 0) - (e.credit || 0),
      };
    });

  /* Depo doluluk: kritik stok eşiğine göre ortalama */
  let depoDoluluk = 0;
  if (products.length > 0) {
    const dolu = products.reduce((s, p) => s + (p.min_stock > 0 ? Math.min(p.current_stock / p.min_stock, 1) : p.current_stock > 0 ? 1 : 0), 0);
    depoDoluluk = Math.round((dolu / products.length) * 100);
  }

  /* İşçi istatistikleri */
  const izinliBugun = new Set(
    leaves
      .filter((l) => l.start_date <= nowIso.slice(0, 10) && nowIso.slice(0, 10) <= l.end_date)
      .map((l) => l.worker_id)
  ).size;
  const yeniKayit = workers.filter((w) => monthKey(w.created_at) === currentKey).length;

  const aktif = vehicles.filter((v) => (v.status ?? "aktif") === "aktif").length;
  const bakimda = vehicles.filter((v) => v.status === "bakımda").length;

  // Hedef: ayarlar tablosundaki "monthly_profit_target" (yoksa 0 => tanımsız)
  const hedefRaw = await safe(callBackend<string | null>("get_setting", { key: "monthly_profit_target" }), null);
  const hedef = hedefRaw ? Number(String(hedefRaw).replace(/\./g, "").replace(",", ".")) || 0 : 0;

  const paymentDayRaw = await safe(callBackend<string | null>("get_setting", { key: "salary_payment_day" }), "5");
  const globalPaymentDay = Number(paymentDayRaw) || 5;

  const upcomingPayments: UpcomingPayment[] = [];
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  for (const w of workers) {
    if (w.exit_date) continue; // Ayrılmış işçileri atla
    if (w.salary > 0) {
      let payDate = new Date(currentYear, currentMonth, globalPaymentDay);
      // Eğer ödeme günü geçtiyse bir sonraki aya bak
      if (payDate < today && today.getDate() > globalPaymentDay) {
        payDate = new Date(currentYear, currentMonth + 1, globalPaymentDay);
      }
      const diffTime = payDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 0 && diffDays <= 7) {
        upcomingPayments.push({
          workerName: w.full_name || "İşçi",
          amount: w.salary,
          daysLeft: diffDays,
          dateStr: `${payDate.getDate()} ${MONTHS_SHORT[payDate.getMonth()]}`,
        });
      }
    }
  }

  upcomingPayments.sort((a, b) => a.daysLeft - b.daysLeft);

  return {
    kpis: { toplamBakiye, aylikKar, depoDoluluk },
    gelirGider: gelirGider.map(({ month, gelir, gider }) => ({ month, gelir, gider })),
    cariler,
    giderKategorileri,
    islemler,
    isciler: { toplam: workers.length, izinli: izinliBugun, yeniKayit },
    filo: { toplam: vehicles.length, aktif, bakimda },
    hedef,
    kaynak: hicKayitYok ? "bos" : "veritabani",
    guncelleme,
    upcomingPayments,
  };
}

/** Hiç kayıt olmayan boş durum (sahte veri içermez). */
function emptyData(): DashboardData {
  return {
    kpis: { toplamBakiye: 0, aylikKar: 0, depoDoluluk: 0 },
    gelirGider: lastTwelveMonths().map((k) => ({
      month: MONTHS_SHORT[Number(k.slice(5, 7)) - 1],
      gelir: 0,
      gider: 0,
    })),
    cariler: [],
    giderKategorileri: [],
    islemler: [],
    isciler: { toplam: 0, izinli: 0, yeniKayit: 0 },
    filo: { toplam: 0, aktif: 0, bakimda: 0 },
    hedef: 0,
    kaynak: "bos",
    guncelleme: nowHM(),
    upcomingPayments: [],
  };
}

export async function loadDashboard(): Promise<DashboardData> {
  if (isTauriEnvironment()) {
    try {
      return await loadRealData();
    } catch {
      // Masaüstünde asla sahte veri gösterilmez; hata olursa boş durum.
      return emptyData();
    }
  }
  return demoData();
}
