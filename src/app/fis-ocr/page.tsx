'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { ScanLine, Upload, Trash2, Loader2, Plus, Receipt } from 'lucide-react';
import { useFisOcr, ReceiptAnalysis } from '@/hooks/use-fis-ocr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';

interface Draft extends ReceiptAnalysis {
  amount: number;
  date: string;
}

const CATEGORIES = ['akaryakıt', 'yemek', 'malzeme', 'bakım', 'telefon', 'kira', 'diğer'];

export default function FisOcrPage() {
  const { expenses, loading, analyzeReceipt, saveExpense, deleteExpense } = useFisOcr();
  const { addToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setAnalyzing(true);
      setDraft(null);
      try {
        const result = await analyzeReceipt(file);
        setDraft({
          ...result,
          amount: result.amount ?? 0,
          date: result.date || new Date().toISOString().slice(0, 10),
        });
      } catch {
        addToast({ title: 'Hata', description: 'Fiş okunamadı, manuel giriş yapabilirsiniz.', variant: 'destructive' });
      } finally {
        setAnalyzing(false);
      }
    },
    [analyzeReceipt, addToast]
  );

  const handleSave = useCallback(async () => {
    if (!draft) return;
    if (!draft.amount || draft.amount <= 0) {
      addToast({ title: 'Uyarı', description: 'Tutar 0’dan büyük olmalı.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await saveExpense({ ...draft, source: 'ocr' });
      addToast({ title: 'Kaydedildi', description: 'Gider kaydı ve cari hareket işlendi.' });
      setDraft(null);
    } catch {
      addToast({ title: 'Hata', description: 'Gider kaydedilemedi.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [draft, saveExpense, addToast]);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteExpense(id);
      } catch {
        addToast({ title: 'Hata', description: 'Silinemedi.', variant: 'destructive' });
      }
    },
    [deleteExpense]
  );

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="h-full flex flex-col gap-6 w-full max-w-5xl mx-auto overflow-y-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ScanLine className="h-7 w-7 text-blue-600" />
          Fiş & Gider OCR
        </h1>
        <p className="text-muted-foreground mt-2">
          Benzinlik, yemek, malzeme fişlerini fotoğrafla — yapay zekâ tutarı, satıcıyı ve kategoriyi otomatik okur, gider kaydına çevirir.
        </p>
      </div>

      {/* Yükleme / analiz kartı */}
      <Card>
        <CardHeader>
          <CardTitle>Fiş Okut</CardTitle>
          <CardDescription>JPG, PNG veya PDF fiş yükleyin (max ~10 MB).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
          />
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            {analyzing ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-sm text-muted-foreground">Yapay zekâ fişi okuyor…</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Fiş fotoğrafını sürükleyin veya tıklayın</p>
              </div>
            )}
          </div>

          {/* Analiz önizleme / manuel düzenleme */}
          {draft && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
              <div className="space-y-1.5">
                <Label>Tutar (₺)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={draft.amount || ''}
                  onChange={(e) => setDraft({ ...draft, amount: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tarih</Label>
                <Input
                  type="date"
                  value={draft.date}
                  onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Satıcı</Label>
                <Input
                  value={draft.vendor || ''}
                  onChange={(e) => setDraft({ ...draft, vendor: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Kategori</Label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={draft.category || 'diğer'}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Ödeme Yöntemi</Label>
                <Input
                  value={draft.payment_method || ''}
                  
                  onChange={(e) => setDraft({ ...draft, payment_method: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Açıklama</Label>
                <Input
                  value={draft.description || ''}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2 flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setDraft(null)}>Vazgeç</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Gider Olarak Kaydet
                </Button>
              </div>
            </div>
          )}

          {/* Manuel giriş butonu */}
          {!draft && !analyzing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setDraft({
                  amount: 0,
                  date: new Date().toISOString().slice(0, 10),
                  category: 'diğer',
                })
              }
            >
              <Plus className="h-4 w-4 mr-1" /> Manuel Gider Ekle
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Gider listesi */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" /> Gider Defteri
            </CardTitle>
            <CardDescription>{expenses.length} kayıt · Toplam {totalExpenses.toFixed(2)} ₺</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : expenses.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Henüz gider kaydı yok.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3">Tarih</th>
                    <th className="py-2 pr-3">Satıcı</th>
                    <th className="py-2 pr-3">Kategori</th>
                    <th className="py-2 pr-3">Ödeme</th>
                    <th className="py-2 pr-3 text-right">Tutar</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 whitespace-nowrap">{e.date}</td>
                      <td className="py-2 pr-3">{e.vendor || '-'}</td>
                      <td className="py-2 pr-3">{e.category || '-'}</td>
                      <td className="py-2 pr-3">{e.payment_method || '-'}</td>
                      <td className="py-2 pr-3 text-right font-medium">{e.amount.toFixed(2)} ₺</td>
                      <td className="py-2 text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(e.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
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
