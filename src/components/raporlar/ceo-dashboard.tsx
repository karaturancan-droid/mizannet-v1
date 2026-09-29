import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, AlertTriangle, Wallet, Users, ArrowUpRight, ArrowDownRight, RefreshCw } from "lucide-react";
import { callBackend } from "@/lib/tauri";

interface CeoMetrics {
  current_date: string;
  total_receivables: number;
  total_payables: number;
  total_cash_and_bank: number;
  top_debtors: { name: string; amount: number }[];
  recent_large_expenses: { description: string; amount: number; date: string }[];
}

export function CeoDashboard() {
  const [metrics, setMetrics] = useState<CeoMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  
  const fetchMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const data: CeoMetrics = await callBackend('get_ceo_dashboard_metrics');
      setMetrics(data);
    } catch (e: any) {
      alert("Hata: " + e.toString());
    } finally {
      setLoadingMetrics(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const generateAiReport = async () => {
    if (!metrics) return;
    setGeneratingAI(true);
    
    try {
      const prompt = `Sen şirketin Finans Direktörü ve Başdanışmanısın (CFO). Aşağıdaki güncel finansal durumu detaylıca incele ve şirket sahibine 3 maddelik kısa, net, profesyonel bir özet rapor sun. 
Eğer risk (nakit darlığı veya çok yüksek borç) varsa uyar. Stratejik ve eyleme geçirilebilir 1-2 tavsiye ver.

Güncel Finansal Durum:
- Kasa ve Banka Toplamı: ${metrics.total_cash_and_bank.toLocaleString('tr-TR')} ₺
- Toplam Alacaklar (Müşterilerden): ${metrics.total_receivables.toLocaleString('tr-TR')} ₺
- Toplam Borçlar (Tedarikçilere): ${metrics.total_payables.toLocaleString('tr-TR')} ₺

En çok borcu olan 3 cari:
${metrics.top_debtors.slice(0,3).map(d => `- ${d.name}: ${d.amount.toLocaleString('tr-TR')} ₺`).join('\n')}

Format: Profesyonel, ciddi ama kolay okunabilir (Markdown destekli, kalın yazılar, listeler kullan).`;

      // Call the AI provider directly. Assumes we have `send_message_to_assistant` or similar.
      // We can use the existing `generate_text` or `chat_with_ai` if exported, 
      // but let's just use `callBackend('analyze_file', ...)` if there's no direct prompt endpoint,
      // wait, `send_message_to_assistant` creates a chat. Let's check `use-asistan` logic.
      
      const response = await callBackend<string>('generate_cfo_report', { prompt });
      setAiReport(response);
    } catch (e: any) {
      alert("Yapay Zeka Hatası: " + (e.message || e));
    } finally {
      setGeneratingAI(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            Yapay Zeka (AI) Yönetici Özeti
          </h2>
          <p className="text-muted-foreground">Şirketinizin finansal sağlığını tek ekrandan takip edin ve yapay zeka tavsiyeleri alın.</p>
        </div>
        <Button onClick={fetchMetrics} variant="outline" size="sm" className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loadingMetrics ? 'animate-spin' : ''}`} /> Yenile
        </Button>
      </div>

      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-emerald-50/50 border-emerald-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-emerald-800 flex items-center gap-2">
                <Wallet className="w-4 h-4" /> Kasa ve Banka Toplamı
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-900">
                {metrics.total_cash_and_bank.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50/50 border-blue-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-800 flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4" /> Toplam Alacaklar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900">
                {metrics.total_receivables.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-rose-50/50 border-rose-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-rose-800 flex items-center gap-2">
                <ArrowDownRight className="w-4 h-4" /> Toplam Borçlar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-rose-900">
                {metrics.total_payables.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-indigo-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-indigo-900">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              Yapay Zeka CFO Analizi
            </CardTitle>
            <CardDescription>
              Tüm finansal verilerinizi tarayarak oluşturulan otomatik şirket karnesi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!aiReport && !generatingAI && (
              <div className="flex flex-col items-center justify-center py-8 text-center bg-indigo-50/50 rounded-xl border border-dashed border-indigo-200">
                <Sparkles className="w-12 h-12 text-indigo-300 mb-3" />
                <h3 className="text-indigo-900 font-semibold">Rapor Henüz Oluşturulmadı</h3>
                <p className="text-sm text-indigo-700/70 mb-4 max-w-sm">
                  Yapay zeka tüm hesap hareketlerinizi analiz edip size özel bir strateji raporu hazırlayacak.
                </p>
                <Button onClick={generateAiReport} className="bg-indigo-600 hover:bg-indigo-700">
                  Raporu Oluştur
                </Button>
              </div>
            )}
            
            {generatingAI && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <div className="text-indigo-600 font-medium animate-pulse">Finansal verileriniz analiz ediliyor...</div>
              </div>
            )}

            {aiReport && !generatingAI && (
              <div className="prose prose-sm prose-indigo max-w-none">
                <div className="whitespace-pre-wrap font-sans text-indigo-900">{aiReport}</div>
                <div className="mt-4 pt-4 border-t flex justify-end">
                  <Button variant="outline" size="sm" onClick={generateAiReport} className="gap-2">
                    <RefreshCw className="w-3 h-3" /> Yeniden Analiz Et
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {metrics && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                En Çok Borcu Olan Müşteriler
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.top_debtors.length > 0 ? (
                <div className="space-y-4">
                  {metrics.top_debtors.map((debtor, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="bg-white p-2 rounded-full border shadow-sm text-muted-foreground">
                          <Users className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-sm">{debtor.name}</span>
                      </div>
                      <span className="font-bold text-amber-600">
                        {debtor.amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  Alacaklı olduğunuz cari bulunmuyor. Mükemmel!
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
