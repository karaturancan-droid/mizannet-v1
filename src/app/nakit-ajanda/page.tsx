'use client';

import { TrendingUp, TrendingDown, CalendarClock, AlertTriangle, Loader2, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { useCashAgenda } from '@/hooks/use-cash-agenda';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function fmt(n: number) {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CashAgendaPage() {
  const { agenda, loading, error, loadAgenda } = useCashAgenda();

  if (loading && !agenda) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3">
        <AlertTriangle className="h-8 w-8 text-amber-500" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" onClick={loadAgenda}>Tekrar Dene</Button>
      </div>
    );
  }

  const overdue = (agenda?.overdue_receivable ?? 0) + (agenda?.overdue_payable ?? 0);

  return (
    <div className="h-full flex flex-col gap-6 w-full max-w-6xl mx-auto overflow-y-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <CalendarClock className="h-7 w-7 text-blue-600" />
          Nakit Akış Ajandası
        </h1>
        <p className="text-muted-foreground mt-2">
          Cari tahsilat beklentileri ve vergi ödemelerini vadesine göre takip edin; önümüzdeki 8 haftanın nakit projeksiyonunu görün.
        </p>
      </div>

      {/* Özet kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bekleyen Tahsilat</p>
                <p className="text-2xl font-bold text-emerald-600">{fmt(agenda?.total_receivable ?? 0)} ₺</p>
              </div>
              <ArrowUpRight className="h-8 w-8 text-emerald-500" />
            </div>
            {(agenda?.overdue_receivable ?? 0) > 0 && (
              <p className="mt-2 text-xs text-red-500">Gecikmiş: {fmt(agenda!.overdue_receivable)} ₺</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bekleyen Ödeme</p>
                <p className="text-2xl font-bold text-red-600">{fmt(agenda?.total_payable ?? 0)} ₺</p>
              </div>
              <ArrowDownRight className="h-8 w-8 text-red-500" />
            </div>
            {(agenda?.overdue_payable ?? 0) > 0 && (
              <p className="mt-2 text-xs text-red-500">Gecikmiş: {fmt(agenda!.overdue_payable)} ₺</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Net Cari Pozisyonu</p>
            <p className={`text-2xl font-bold ${(agenda?.opening_balance ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {fmt(agenda?.opening_balance ?? 0)} ₺
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Gecikmiş Toplam</p>
            <p className={`text-2xl font-bold ${overdue > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>{fmt(overdue)} ₺</p>
          </CardContent>
        </Card>
      </div>

      {/* Haftalık projeksiyon */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" /> 8 Haftalık Projeksiyon
          </CardTitle>
          <CardDescription>Takvime bağlı tahsilat/ödeme beklentilerinin haftalık dökümü.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {agenda?.weeks.map((w) => (
              <div key={w.week_start} className="rounded-lg border p-3 text-center">
                <p className="text-[11px] text-muted-foreground">{w.week_start.slice(5)}</p>
                <p className="text-xs text-emerald-600 mt-1">+{fmt(w.inflow)}</p>
                <p className="text-xs text-red-600">−{fmt(w.outflow)}</p>
                <p className={`text-sm font-semibold mt-1 ${w.net >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {fmt(w.net)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Kalemler */}
      <Card>
        <CardHeader>
          <CardTitle>Yaklaşan Kalemler (60 gün)</CardTitle>
        </CardHeader>
        <CardContent>
          {agenda?.items.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Yaklaşan tahsilat veya ödeme yok.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3">Tarih</th>
                    <th className="py-2 pr-3">Tür</th>
                    <th className="py-2 pr-3">Karşı Taraf</th>
                    <th className="py-2 pr-3">Açıklama</th>
                    <th className="py-2 pr-3">Durum</th>
                    <th className="py-2 text-right">Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {agenda?.items.map((i) => (
                    <tr key={`${i.kind}-${i.id}`} className="border-b last:border-0">
                      <td className="py-2 pr-3 whitespace-nowrap">{i.date}</td>
                      <td className="py-2 pr-3">
                        {i.kind === 'tahsilat' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600">
                            <TrendingUp className="h-3.5 w-3.5" /> Tahsilat
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-600">
                            <TrendingDown className="h-3.5 w-3.5" /> Ödeme
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-3">{i.company_name}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{i.description}</td>
                      <td className="py-2 pr-3">
                        {i.status === 'gecikti' ? (
                          <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs">Gecikti ({Math.abs(i.days_left)} gün)</span>
                        ) : i.days_left <= 7 ? (
                          <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs">{i.days_left} gün</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">{i.days_left} gün</span>
                        )}
                      </td>
                      <td className={`py-2 text-right font-medium ${i.kind === 'tahsilat' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {fmt(i.amount)} ₺
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
