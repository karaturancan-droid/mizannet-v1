'use client';

import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { Loader2, Plus, Download, Smartphone, CheckCircle2, Receipt, LogIn, LogOut } from 'lucide-react';

interface SmmResult {
  uuid: string;
  belge_numarasi: string | null;
  message: string;
}

interface GibDocument {
  ettn: string;
  belge_numarasi: string;
  alici_vkn_tckn: string;
  alici_unvan_ad_soyad: string;
  belge_tarihi: string;
  belge_turu: string;
  onay_durumu: string;
}

const EMPTY_SMM = {
  vkn_tckn: '',
  alici_unvan: '',
  alici_adi: '',
  alici_soyadi: '',
  donem: '',
  hizmet_aciklamasi: '',
  brut_ucret: 0,
  stopaj_orani: 20,
  kdv_orani: 20,
};

export function SmmPanel() {
  const { addToast } = useToast();

  const [hasSession, setHasSession] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [form, setForm] = useState({ ...EMPTY_SMM });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<SmmResult | null>(null);

  // SMS imzalama
  const [smsOperationId, setSmsOperationId] = useState<string | null>(null);
  const [smsCode, setSmsCode] = useState('');
  const [isSigning, setIsSigning] = useState(false);

  // Belgeler
  const [documents, setDocuments] = useState<GibDocument[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  const checkSession = useCallback(async () => {
    setIsChecking(true);
    try {
      const ok = await invoke<boolean>('gib_check_session');
      setHasSession(ok);
    } catch {
      setHasSession(false);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      addToast({ title: 'Eksik Bilgi', description: 'Kullanıcı kodu ve şifre gerekli.', variant: 'destructive' });
      return;
    }
    setIsLoggingIn(true);
    try {
      await invoke('gib_login', { username: username.trim(), password, testMode: false });
      setHasSession(true);
      setPassword('');
      addToast({ title: 'GİB Bağlantısı Kuruldu', variant: 'success' });
    } catch (err) {
      addToast({ title: 'Giriş Başarısız', description: String(err), variant: 'destructive' });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await invoke('gib_logout');
      setHasSession(false);
      setDocuments([]);
    } catch (err) {
      addToast({ title: 'Hata', description: String(err), variant: 'destructive' });
    }
  };

  // Önizleme hesapları
  const stopaj = (form.brut_ucret * form.stopaj_orani) / 100;
  const net = form.brut_ucret - stopaj;
  const kdv = (net * form.kdv_orani) / 100;
  const damga = (form.brut_ucret * 7.59) / 1000;
  const odenecek = net + kdv + damga;

  const fmt = (n: number) =>
    n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleSubmit = async () => {
    if (!form.vkn_tckn || (form.vkn_tckn.length !== 10 && form.vkn_tckn.length !== 11)) {
      addToast({ title: 'Hata', description: 'Alıcı VKN/TCKN 10 veya 11 haneli olmalı.', variant: 'destructive' });
      return;
    }
    if (!form.hizmet_aciklamasi.trim()) {
      addToast({ title: 'Hata', description: 'Hizmet açıklaması zorunludur.', variant: 'destructive' });
      return;
    }
    if (form.brut_ucret <= 0) {
      addToast({ title: 'Hata', description: 'Brüt ücret 0’dan büyük olmalı.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    setLastResult(null);
    try {
      const result = await invoke<SmmResult>('gib_create_smm', {
        vknTckn: form.vkn_tckn,
        aliciUnvan: form.alici_unvan,
        aliciAdi: form.alici_adi,
        aliciSoyadi: form.alici_soyadi,
        donem: form.donem,
        hizmetAciklamasi: form.hizmet_aciklamasi,
        brutUcret: form.brut_ucret,
        stopajOrani: form.stopaj_orani,
        kdvOrani: form.kdv_orani,
      });
      setLastResult(result);
      addToast({ title: 'e-SMM Oluşturuldu', description: 'Taslak GİB portalında hazır — SMS ile imzalayın.', variant: 'success' });
      setForm({ ...EMPTY_SMM });
    } catch (err) {
      addToast({ title: 'e-SMM Oluşturulamadı', description: String(err), variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartSms = async () => {
    try {
      const oid = await invoke<string>('gib_start_sms_sign');
      setSmsOperationId(oid);
      addToast({ title: 'SMS Gönderildi', description: 'Telefonunuza gelen kodu girin.' });
    } catch (err) {
      addToast({ title: 'SMS Başlatılamadı', description: String(err), variant: 'destructive' });
    }
  };

  const handleCompleteSms = async () => {
    if (!lastResult || !smsCode.trim()) return;
    setIsSigning(true);
    try {
      await invoke('gib_complete_sms_sign', {
        smsCode: smsCode.trim(),
        operationId: smsOperationId,
        uuids: [lastResult.uuid],
      });
      addToast({ title: 'e-SMM İmzalandı', description: 'Makbuz yasal olarak kesildi.', variant: 'success' });
      setSmsOperationId(null);
      setSmsCode('');
      setLastResult(null);
      loadDocs();
    } catch (err) {
      addToast({ title: 'İmzalama Başarısız', description: String(err), variant: 'destructive' });
    } finally {
      setIsSigning(false);
    }
  };

  const loadDocs = useCallback(async () => {
    setIsLoadingDocs(true);
    try {
      const toGib = (iso: string) => {
        const [y, m, d] = iso.split('-');
        return `${d}/${m}/${y}`;
      };
      const docs = await invoke<GibDocument[]>('gib_list_smm', {
        startDate: toGib(startDate),
        endDate: toGib(endDate),
      });
      setDocuments(docs);
    } catch (err) {
      addToast({ title: 'Liste Alınamadı', description: String(err), variant: 'destructive' });
    } finally {
      setIsLoadingDocs(false);
    }
  }, [startDate, endDate, addToast]);

  const handleDownload = async (doc: GibDocument) => {
    try {
      const path = await invoke<string>('gib_download_smm', {
        ettn: doc.ettn,
        onayDurumu: doc.onay_durumu,
        fileName: `esmm_${doc.belge_numarasi || doc.ettn}.zip`,
      });
      addToast({ title: 'İndirildi', description: path, variant: 'success' });
    } catch (err) {
      addToast({ title: 'İndirilemedi', description: String(err), variant: 'destructive' });
    }
  };

  if (isChecking) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!hasSession) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" /> GİB Girişi (e-SMM)
          </CardTitle>
          <CardDescription>e-SMM kesmek için e-Arşiv portal hesabınızla giriş yapın.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Kullanıcı Kodu</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Şifre</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button onClick={handleLogin} disabled={isLoggingIn} className="w-full">
            {isLoggingIn ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <LogIn className="h-4 w-4 mr-2" />}
            Giriş Yap
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Yeni e-SMM */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" /> Yeni e-SMM Kes
            </CardTitle>
            <CardDescription>e-Serbest Meslek Makbuzu — GİB e-Arşiv portalında oluşturulur.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-1" /> Çıkış
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Alıcı VKN/TCKN</Label>
              <Input
                value={form.vkn_tckn}
                onChange={(e) => setForm({ ...form, vkn_tckn: e.target.value.replace(/\D/g, '') })}
                placeholder="10 veya 11 hane"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Dönem (aa/yyyy)</Label>
              <Input
                value={form.donem}
                onChange={(e) => setForm({ ...form, donem: e.target.value })}
                placeholder="09/2026"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Hizmet Açıklaması</Label>
              <Input
                value={form.hizmet_aciklamasi}
                onChange={(e) => setForm({ ...form, hizmet_aciklamasi: e.target.value })}
                placeholder="Ör: Maden sahasında iş makineleri kiralama hizmeti"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Brüt Ücret (₺)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.brut_ucret || ''}
                onChange={(e) => setForm({ ...form, brut_ucret: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Stopaj Oranı (%)</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={form.stopaj_orani}
                onChange={(e) => setForm({ ...form, stopaj_orani: parseFloat(e.target.value) })}
              >
                <option value={0}>0</option>
                <option value={20}>20</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>KDV Oranı (%)</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={form.kdv_orani}
                onChange={(e) => setForm({ ...form, kdv_orani: parseFloat(e.target.value) })}
              >
                <option value={0}>0</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>
          </div>

          {/* Hesap önizleme */}
          {form.brut_ucret > 0 && (
            <div className="rounded-lg border bg-muted/40 p-4 text-sm space-y-1">
              <div className="flex justify-between"><span>Brüt Ücret</span><span>{fmt(form.brut_ucret)} ₺</span></div>
              <div className="flex justify-between"><span>Stopaj (%{form.stopaj_orani})</span><span>−{fmt(stopaj)} ₺</span></div>
              <div className="flex justify-between"><span>Net Ücret</span><span>{fmt(net)} ₺</span></div>
              <div className="flex justify-between"><span>KDV (%{form.kdv_orani})</span><span>+{fmt(kdv)} ₺</span></div>
              <div className="flex justify-between"><span>Damga Vergisi (binde 7,59)</span><span>+{fmt(damga)} ₺</span></div>
              <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                <span>Ödenecek Tutar</span><span>{fmt(odenecek)} ₺</span>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Taslak Oluştur
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SMS imzalama */}
      {lastResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" /> SMS ile İmzala
            </CardTitle>
            <CardDescription>
              Taslak hazır: {lastResult.belge_numarasi || lastResult.uuid.slice(0, 8)} — {lastResult.message}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!smsOperationId ? (
              <Button onClick={handleStartSms}>SMS Kodu Gönder</Button>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={smsCode}
                  onChange={(e) => setSmsCode(e.target.value)}
                  placeholder="SMS kodu"
                  maxLength={6}
                />
                <Button onClick={handleCompleteSms} disabled={isSigning || !smsCode.trim()}>
                  {isSigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                  İmzala
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Belge listesi */}
      <Card>
        <CardHeader>
          <CardTitle>e-SMM Belgeleri</CardTitle>
          <div className="flex flex-wrap gap-2 items-end mt-2">
            <div>
              <Label className="text-xs">Başlangıç</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
            </div>
            <div>
              <Label className="text-xs">Bitiş</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
            </div>
            <Button variant="outline" size="sm" onClick={loadDocs} disabled={isLoadingDocs}>
              {isLoadingDocs ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Listele'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">Bu tarih aralığında e-SMM yok.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3">No</th>
                    <th className="py-2 pr-3">Alıcı</th>
                    <th className="py-2 pr-3">Tarih</th>
                    <th className="py-2 pr-3">Durum</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {documents.map((d) => (
                    <tr key={d.ettn} className="border-b last:border-0">
                      <td className="py-2 pr-3">{d.belge_numarasi}</td>
                      <td className="py-2 pr-3">{d.alici_unvan_ad_soyad}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{d.belge_tarihi}</td>
                      <td className="py-2 pr-3">{d.onay_durumu}</td>
                      <td className="py-2 text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleDownload(d)}>
                          <Download className="h-4 w-4" />
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
