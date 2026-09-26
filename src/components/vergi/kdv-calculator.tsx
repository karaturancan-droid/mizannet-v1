'use client';

import { useEffect, useState, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Calculator, TrendingDown, TrendingUp, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCurrencyTRY } from '@/lib/format';
import { Progress } from '@/components/ui/progress';

interface Invoice {
  id: string;
  company_id?: string;
  invoice_no?: string;
  date?: string;
  subtotal?: number;
  vat_amount?: number;
  total?: number;
  status: 'taslak' | 'onaylandı' | 'reddedildi';
}

export function KdvCalculator() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [kdvOrani, setKdvOrani] = useState<'tumu' | '1' | '10' | '20'>('tumu');

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const data = await invoke<Invoice[]>('list_invoices');
      setInvoices(data || []);
    } catch (err) {
      console.error('Faturalar yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    // Sadece onaylanmış faturaları hesapla
    const approved = invoices.filter(i => i.status === 'onaylandı');
    
    let filtered = approved;
    if (kdvOrani !== 'tumu') {
      const rate = parseInt(kdvOrani);
      // Faturadaki KDV oranını matrah üzerinden tahmin et (vat_amount / subtotal)
      filtered = approved.filter(i => {
        if (!i.vat_amount || !i.subtotal) return false;
        const calculatedRate = Math.round((i.vat_amount / i.subtotal) * 100);
        return Math.abs(calculatedRate - rate) <= 2; // %2 tolerans payı
      });
    }

    const totalVat = filtered.reduce((sum, i) => sum + (i.vat_amount || 0), 0);
    const totalSubtotal = filtered.reduce((sum, i) => sum + (i.subtotal || 0), 0);
    const totalCount = filtered.length;

    // Tüm KDV'nin onaylanan faturalardaki oranı
    const grandTotalVat = approved.reduce((sum, i) => sum + (i.vat_amount || 0), 0);
    const vatPercentage = grandTotalVat > 0 ? (totalVat / grandTotalVat) * 100 : 0;

    return { totalVat, totalSubtotal, totalCount, vatPercentage };
  }, [invoices, kdvOrani]);

  if (loading) {
    return <div className="h-48 rounded-xl bg-zinc-100 animate-pulse border border-zinc-200"></div>;
  }

  return (
    <Card className="mb-8 border-blue-100 shadow-sm bg-gradient-to-br from-white to-blue-50/30 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
      
      <CardHeader className="pb-4 relative z-10">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                <Calculator className="w-4 h-4" />
              </div>
              <CardTitle className="text-xl">Otomatik KDV & Matrah Analizi</CardTitle>
            </div>
            <CardDescription className="text-zinc-500 max-w-md">
              Sisteme yüklediğiniz ve yapay zeka tarafından onaylanan faturalarınızın KDV yükü hesaplaması.
            </CardDescription>
          </div>
          
          <div className="flex bg-white rounded-lg p-1 border border-zinc-200 shadow-sm self-start">
            {(['tumu', '1', '10', '20'] as const).map((rate) => (
              <button
                key={rate}
                onClick={() => setKdvOrani(rate)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  kdvOrani === rate 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                {rate === 'tumu' ? 'Tümü' : `%${rate}`}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col justify-center">
            <span className="text-sm font-medium text-zinc-500 mb-1 flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Toplam Fatura Matrahı
            </span>
            <span className="text-3xl font-bold text-zinc-900 tracking-tight">
              {formatCurrencyTRY(stats.totalSubtotal)}
            </span>
          </div>

          <div className="flex flex-col justify-center relative md:before:content-[''] md:before:absolute md:before:left-0 md:before:top-2 md:before:bottom-2 md:before:w-px md:before:bg-zinc-200 md:pl-6">
            <span className="text-sm font-medium text-blue-600 mb-1 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              Toplam KDV Yükü
            </span>
            <span className="text-3xl font-bold text-blue-600 tracking-tight">
              {formatCurrencyTRY(stats.totalVat)}
            </span>
            {kdvOrani !== 'tumu' && (
              <div className="mt-3 flex items-center gap-3">
                <Progress value={stats.vatPercentage} className="h-1.5" />
                <span className="text-xs font-medium text-zinc-400 min-w-[32px]">
                  %{Math.round(stats.vatPercentage)}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col justify-center relative md:before:content-[''] md:before:absolute md:before:left-0 md:before:top-2 md:before:bottom-2 md:before:w-px md:before:bg-zinc-200 md:pl-6">
            <span className="text-sm font-medium text-zinc-500 mb-1 flex items-center gap-1">
              <FileText className="w-4 h-4 text-zinc-400" />
              İşlenen Fatura Sayısı
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-zinc-900 tracking-tight">
                {stats.totalCount}
              </span>
              <span className="text-sm text-zinc-500">adet</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-md w-fit">
              <CheckCircle2 className="w-3 h-3" />
              Sadece Onaylı Faturalar
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
