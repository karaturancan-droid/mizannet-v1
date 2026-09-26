"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { chartTickTRY, CHART_COLORS, loadDashboard, tlKuruşsuz, type DashboardData } from "@/lib/dashboard-data";
import { ExcelView } from "@/components/dashboard/excel-view";

function Panel({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={`shadow-sm border-border/60 ${className ?? ""}`}>
      {title ? (
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function KpiCard({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <Card className="shadow-sm border-border/60">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-foreground">{label}</p>
          {children}
        </div>
        <div className="mt-1 text-3xl font-bold tracking-tight text-foreground">{value}</div>
      </CardContent>
    </Card>
  );
}

/** "Hedefin %29'u" gibi Türkçe yüzde soneki (sayının son kelimesinin ünlüsüne göre). */
function yuzdeSoneki(n: number): string {
  const abs = Math.abs(n);
  const son = abs % 10;
  const onlar = Math.floor(abs / 10) % 10;
  let ek: string;
  if (abs % 100 === 0) {
    ek = abs === 0 ? "ı" : "ü"; // sıfır'ı / yüz'ü
  } else if (son === 0) {
    ek = ["ı", "u", "i", "u", "ı", "i", "ı", "i", "i", "ı"][onlar]; // on, yirmi, otuz...
  } else {
    ek = ["", "i", "i", "ü", "ü", "i", "ı", "i", "i", "u"][son]; // bir, iki, üç...
  }
  return `%${n}'${ek}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [finansalGorunum, setFinansalGorunum] = useState(true);

  useEffect(() => {
    let alive = true;
    loadDashboard().then((d) => {
      if (alive) setData(d);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Yönetim paneli yükleniyor...
      </div>
    );
  }

  const { kpis, gelirGider, cariler, giderKategorileri, islemler, isciler, filo, hedef, upcomingPayments } = data;
  const giderToplam = giderKategorileri.reduce((s, g) => s + g.amount, 0);
  const sonAy = gelirGider[gelirGider.length - 1];
  const karMarji = sonAy && sonAy.gelir > 0 ? Math.round((kpis.aylikKar / sonAy.gelir) * 100) : 0;
  const hedefYuzde = hedef > 0 ? Math.round((kpis.aylikKar / hedef) * 100) : null;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      {/* Başlık satırı */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold tracking-tight text-foreground uppercase flex items-center gap-2">
          YÖNETİM PANELİ: ENTEGRE GENEL BAKIŞ
        </h2>
        <div className="flex items-center gap-2">
          {/* Hızlı Eylemler */}
          <button
            type="button"
            onClick={() => router.push('/belgeler')}
            className="hidden sm:flex h-9 items-center gap-2 rounded-[20px] bg-primary/10 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            Yeni Fatura
          </button>
          <button
            type="button"
            onClick={() => router.push('/cari')}
            className="hidden md:flex h-9 items-center gap-2 rounded-[20px] bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-600 transition-colors hover:bg-emerald-500/20"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
            Yeni Cari
          </button>
          <div className="w-px h-6 bg-border mx-1 hidden sm:block"></div>
          
          <button
            type="button"
            onClick={() => setFinansalGorunum((v) => !v)}
            aria-pressed={finansalGorunum}
            className={`flex h-9 items-center gap-2 rounded-[20px] border px-4 text-sm font-semibold shadow-sm transition-colors ${
              finansalGorunum
                ? "border-[#1c2438] bg-[#1c2438] text-white hover:bg-[#131824]"
                : "border-border bg-white text-foreground hover:bg-muted"
            }`}
          >
            <span>Finansal Görünüm</span>
          </button>
        </div>
      </div>

      {/* Üst KPI kartları ve Premium Card */}
      {finansalGorunum && (
      <div className="grid gap-4 lg:grid-cols-4">
        <KpiCard label="Toplam Bakiye:" value={tlKuruşsuz(kpis.toplamBakiye)}>
          <div className="rounded-full bg-muted p-1.5 text-muted-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
          </div>
        </KpiCard>
        <Card className="shadow-sm border-border/60">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-foreground">Aylık Kâr:</p>
              <div className="rounded-full bg-muted p-1.5 text-muted-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
              </div>
            </div>
            <div className="mt-1 text-3xl font-bold tracking-tight text-foreground">{tlKuruşsuz(kpis.aylikKar)}</div>
            <div className="mt-2 space-y-0.5 text-right text-[10px] text-muted-foreground">
              {hedef > 0 ? (
                <p>{tlKuruşsuz(hedef)} hedef (%{hedefYuzde})</p>
              ) : (
                <p>Hedef tanımlı değil</p>
              )}
              <p>{tlKuruşsuz(kpis.aylikKar)} gerçekleşen (kâr marjı: %{karMarji})</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-border/60">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Depo Doluluk Oranı:</p>
              <div className="mt-1 text-3xl font-bold tracking-tight text-foreground">{kpis.depoDoluluk}%</div>
            </div>
            <div className="relative flex items-center justify-center h-16 w-16">
              <svg className="transform -rotate-90 w-16 h-16">
                <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-muted" />
                <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray="175.9" strokeDashoffset={175.9 - (175.9 * kpis.depoDoluluk) / 100} className="text-[#316879] transition-all duration-1000 ease-out" />
              </svg>
              <span className="absolute text-[10px] font-bold text-foreground">{kpis.depoDoluluk}%</span>
            </div>
          </CardContent>
        </Card>

        {/* MizanNet Premium Card */}
        <div 
          onClick={() => window.open('https://mizannet.com', '_blank')}
          className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-orange-400 to-orange-500 shadow-md p-6 text-white group cursor-pointer transition-transform duration-300 hover:scale-105"
        >
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/20 rounded-full blur-2xl group-hover:bg-white/30 transition-colors"></div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-orange-600/20 rounded-full blur-2xl"></div>
          
          <div className="relative z-10">
            <div className="flex justify-between items-start">
              <h3 className="text-xl font-bold mb-1 tracking-tight text-white/95">MizanNet Premium</h3>
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm group-hover:bg-white/30 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m7 17 9.2-9.2M17 17V7H7"/></svg>
              </div>
            </div>
            
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-extrabold tracking-tighter">Detayları İncele</span>
            </div>
            
            <div className="mt-5 flex gap-2">
              <span className="bg-white text-orange-600 px-3 py-1 rounded-full text-xs font-bold tracking-wide">PLANLAR</span>
            </div>
          </div>
          
          {/* Süsleme (Wavy pattern) */}
          <svg className="absolute bottom-0 right-0 w-full h-auto opacity-10 pointer-events-none" viewBox="0 0 1440 320" preserveAspectRatio="none">
            <path fill="currentColor" fillOpacity="1" d="M0,224L60,197.3C120,171,240,117,360,112C480,107,600,149,720,181.3C840,213,960,235,1080,213.3C1200,192,1320,128,1380,96L1440,64L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"></path>
          </svg>
        </div>
      </div>
      )}

      {/* Grafikler */}
      {finansalGorunum && (
      <div className="grid gap-4 lg:grid-cols-12">
        <Panel title="Gelir / Gider Akışı" className="lg:col-span-6">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={gelirGider} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gGelir" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.gelir} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={CHART_COLORS.gelir} stopOpacity={0.04} />
                  </linearGradient>
                  <linearGradient id="gGider" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.gider} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={CHART_COLORS.gider} stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#D8E4E2" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis
                  tickFormatter={chartTickTRY}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={72}
                />
                <Tooltip
                  formatter={(v, n) => [tlKuruşsuz(Number(v)), String(n) === "gelir" ? "Gelirler" : "Giderler"]}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Legend
                  verticalAlign="top"
                  align="center"
                  iconType="plainline"
                  formatter={(v) => (v === "gelir" ? "Gelirler" : "Giderler")}
                />
                <Area type="monotone" dataKey="gelir" stroke={CHART_COLORS.gelir} strokeWidth={2} fill="url(#gGelir)" />
                <Area type="monotone" dataKey="gider" stroke={CHART_COLORS.gider} strokeWidth={2} fill="url(#gGider)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Cari Hesap Bakiyeleri" className="lg:col-span-4">
          {cariler.length === 0 ? (
            <div className="flex h-[300px] items-center justify-center px-4 text-center text-xs text-muted-foreground">
              Henüz cari hesap kaydı yok.
            </div>
          ) : (
            <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cariler} margin={{ top: 10, right: 8, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#D8E4E2" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  angle={-35}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tickFormatter={chartTickTRY} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={64} />
                <Tooltip formatter={(v) => [tlKuruşsuz(Number(v)), "Bakiye"]} />
                <Bar 
                  dataKey="balance" 
                  radius={[2, 2, 0, 0]} 
                  onClick={(data) => {
                    if (data && data.id) {
                      router.push('/cari?id=' + data.id);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {cariler.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS.palette[i % CHART_COLORS.palette.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel title="Gider Kategorileri" className="lg:col-span-2">
          {giderKategorileri.length === 0 ? (
            <div className="flex h-[180px] items-center justify-center px-2 text-center text-xs text-muted-foreground">
              Bu aya ait gider kaydı yok.
            </div>
          ) : (
            <>
              <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={giderKategorileri}
                  dataKey="amount"
                  nameKey="name"
                  innerRadius="58%"
                  outerRadius="88%"
                  paddingAngle={1}
                  stroke="none"
                >
                  {giderKategorileri.map((g, i) => (
                    <Cell key={i} fill={g.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [tlKuruşsuz(Number(v)), String(n)]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-3 space-y-1.5 text-xs">
            {giderKategorileri.map((g) => (
              <li key={g.name} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: g.color }} />
                <span className="flex-1 truncate text-foreground">{g.name}</span>
                <span className="whitespace-nowrap text-muted-foreground">
                  {tlKuruşsuz(g.amount)} (%{Math.round((g.amount / giderToplam) * 100)})
                </span>
              </li>
            ))}
          </ul>
            </>
          )}
        </Panel>
      </div>
      )}

      {/* Excel Görünümü */}
      {!finansalGorunum && (
        <div className="w-full mb-4">
          <ExcelView />
        </div>
      )}

      {/* Alt alan */}
      <div className="grid gap-4 lg:grid-cols-12">
        {finansalGorunum && (
        <Card className="shadow-sm border-border/60 lg:col-span-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">SON İŞLEMLER</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 font-semibold">Tarih</th>
                  <th className="pb-2 font-semibold">Açıklama</th>
                  <th className="pb-2 text-right font-semibold">Tutar</th>
                </tr>
              </thead>
              <tbody>
                {islemler.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-sm text-muted-foreground">
                      Henüz kayıtlı işlem yok.
                    </td>
                  </tr>
                ) : (
                  islemler.map((t) => (
                    <tr 
                      key={t.id} 
                      className={`border-b border-border/60 last:border-0 ${t.company_id ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''}`}
                      onClick={() => t.company_id ? router.push('/cari?id=' + t.company_id) : undefined}
                    >
                      <td className="py-2.5 text-foreground px-2">{t.date}</td>
                      <td className="py-2.5 text-foreground px-2">{t.desc}</td>
                      <td
                        className={`py-2.5 text-right font-medium ${
                          t.amount >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"
                        }`}
                      >
                        {t.amount >= 0 ? "+" : "-"}{tlKuruşsuz(Math.abs(t.amount))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
        )}

        {/* Sağ alan: İşçi Verileri ve Filo Durumu - Son İşlemler ile aynı hizada */}
        <div className={`flex flex-col gap-4 ${finansalGorunum ? "lg:col-span-4" : "lg:col-span-12 lg:flex-row"}`}>
          <Card 
            className="flex-1 shadow-sm border-border/60 cursor-pointer hover:border-primary/40 transition-colors"
            onClick={() => router.push('/isciler')}
          >
            <CardHeader className="pb-1">
              <CardTitle className="text-base font-semibold">İşçi Verileri</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-2 py-3 px-3">
              <div className="rounded-lg bg-[#0d9488] text-white p-2 text-center flex flex-col items-center justify-center h-20 shadow-sm">
                <div className="text-2xl font-bold">{isciler.toplam}</div>
                <div className="text-[10px] font-semibold">İşçi</div>
              </div>
              <div className="rounded-lg bg-[#ea580c] text-white p-2 text-center flex flex-col items-center justify-center h-20 shadow-sm">
                <div className="text-2xl font-bold">{isciler.izinli}</div>
                <div className="text-[10px] font-semibold">İzinli</div>
              </div>
              <div className="rounded-lg bg-[#16a34a] text-white p-2 text-center flex flex-col items-center justify-center h-20 shadow-sm">
                <div className="text-2xl font-bold">{isciler.yeniKayit}</div>
                <div className="text-[10px] font-semibold">Yeni Kayıt</div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="flex-1 shadow-sm border-border/60 cursor-pointer hover:border-primary/40 transition-colors"
            onClick={() => router.push('/araclar')}
          >
            <CardHeader className="pb-1">
              <CardTitle className="text-base font-semibold">Filo Durumu</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 divide-x divide-border py-4">
              <div className="px-2 text-center flex flex-col items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-1 text-muted-foreground"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
                <div className="text-2xl font-bold">{filo.toplam}</div>
                <div className="text-[10px] text-muted-foreground">Araç Toplam</div>
              </div>
              <div className="px-2 text-center flex flex-col items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-1 text-muted-foreground"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/><path d="m14 8 2 2"/><path d="M11.6 9.4 14 11.8"/></svg>
                <div className="text-2xl font-bold">{filo.aktif}</div>
                <div className="text-[10px] text-muted-foreground">Aktif</div>
              </div>
              <div className="px-2 text-center flex flex-col items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-1 text-muted-foreground"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                <div className="text-2xl font-bold">{filo.bakimda}</div>
                <div className="text-[10px] text-muted-foreground">Bakımda</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alt Satır: Yaklaşan Ödemeler ve Filo Özeti */}
        <div className="lg:col-span-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Panel title="Yaklaşan Ödemeler">
              {upcomingPayments && upcomingPayments.length > 0 ? (
                <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                  {upcomingPayments.map((payment, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg bg-card text-card-foreground">
                      <div>
                        <p className="font-medium">{payment.workerName || 'Genel Ödeme'}</p>
                        <p className="text-sm text-muted-foreground">{payment.dateStr}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{tlKuruşsuz(payment.amount)}</p>
                        <p className={`text-xs font-semibold ${payment.daysLeft === 0 ? 'text-red-500' : payment.daysLeft <= 3 ? 'text-amber-500' : 'text-green-500'}`}>
                          {payment.daysLeft === 0 ? "Bugün" : `${payment.daysLeft} gün kaldı`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground border rounded-lg border-dashed">
                  Yaklaşan ödeme bulunmuyor.
                </div>
              )}
            </Panel>

            <Panel title="Filo Özeti">
              <div className="flex flex-col md:flex-row h-[250px] items-center justify-center gap-8 overflow-y-auto p-2">
                <div className="text-center">
                  <div className="text-5xl font-bold">{filo.toplam}</div>
                  <div className="text-sm text-muted-foreground mt-2">Toplam Araç</div>
                </div>
                <div className="text-center">
                  <div className="text-5xl font-bold text-blue-500">{filo.aktif}</div>
                  <div className="text-sm text-muted-foreground mt-2">Sahada (Aktif)</div>
                </div>
                <div className="text-center">
                  <div className="text-5xl font-bold text-red-500">{filo.bakimda}</div>
                  <div className="text-sm text-muted-foreground mt-2">Bakımda</div>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      </div>

      <p className="text-right text-[11px] text-muted-foreground">
        {data.kaynak === "bos" && "Henüz veri girişi yapılmadı — Cari, Depo, İşçiler ve Araçlar modüllerinden kayıt ekledikçe panel dolacaktır. · "}
        {data.kaynak === "ornek" && "Örnek veri (tarayıcı önizlemesi) · "}
        Veri Güncellendi: {data.guncelleme}
      </p>
    </div>
  );
}
