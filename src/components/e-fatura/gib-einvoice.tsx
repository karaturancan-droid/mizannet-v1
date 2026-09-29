'use client';

import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import {
  FileText, LogIn, LogOut, Loader2, Plus, Send, Download,
  Trash2, Smartphone, CheckCircle2, XCircle, RefreshCw, Search,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Tipler
// ---------------------------------------------------------------------------

interface EInvoiceItem {
  mal_hizmet: string;
  miktar: number;
  birim: string;
  birim_fiyat: number;
  kdv_orani: number;
  iskonto_orani: number;
}

interface EInvoice {
  vkn_tckn: string;
  alici_unvan: string;
  alici_adi: string;
  alici_soyadi: string;
  vergi_dairesi: string;
  mahalle_semt_ilce: string;
  sehir: string;
  ulke: string;
  adres: string;
  eposta: string;
  tel: string;
  not_aciklama: string;
  para_birimi: string;
  doviz_kuru: number;
  fatura_tipi: string;
  tarih: string;
  saat: string;
  items: EInvoiceItem[];
}

interface EInvoiceResult {
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

const EMPTY_ITEM: EInvoiceItem = {
  mal_hizmet: '', miktar: 1, birim: 'Adet', birim_fiyat: 0, kdv_orani: 20, iskonto_orani: 0,
};

const UNITS = ['Adet', 'Ton', 'Kg', 'M3', 'M2', 'Metre', 'Saat', 'Gun', 'PAket', 'Lt'];

// ---------------------------------------------------------------------------
// Ana bileşen
// ---------------------------------------------------------------------------

export function EInvoiceModule() {
  const { addToast } = useToast();

  // Oturum durumu
  const [hasSession, setHasSession] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [testMode, setTestMode] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Fatura formu
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<EInvoice>({
    vkn_tckn: '', alici_unvan: '', alici_adi: '', alici_soyadi: '',
    vergi_dairesi: '', mahalle_semt_ilce: '', sehir: '', ulke: 'Türkiye',
    adres: '', eposta: '', tel: '', not_aciklama: '',
    para_birimi: 'TRY', doviz_kuru: 0, fatura_tipi: 'SATIS',
    tarih: '', saat: '', items: [{ ...EMPTY_ITEM }],
  });

  // VKN sorgulama
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryResult, setQueryResult] = useState<string | null>(null);

  // SMS imzalama
  const [smsOperationId, setSmsOperationId] = useState<string | null>(null);
  const [smsCode, setSmsCode] = useState('');
  const [pendingSignUuids, setPendingSignUuids] = useState<string[]>([]);
  const [isSigning, setIsSigning] = useState(false);

  // Belge listesi
  const [documents, setDocuments] = useState<GibDocument[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Oturum kontrolü
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

  // Giriş
  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      addToast({ title: 'Eksik Bilgi', description: 'Kullanıcı kodu ve şifre gerekli.', variant: 'destructive' });
      return;
    }
    setIsLoggingIn(true);
    try {
      await invoke('gib_login', { username: username.trim(), password, testMode });
      setHasSession(true);
      setPassword('');
      addToast({ title: 'GİB Bağlantısı Kuruldu', description: 'e-Arşiv portalına başarıyla giriş yapıldı.', variant: 'success' });
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
      addToast({ title: 'Oturum Kapatıldı' });
    } catch (err) {
      addToast({ title: 'Hata', description: String(err), variant: 'destructive' });
    }
  };

  // VKN sorgula
  const handleQueryRecipient = async () => {
    const vkn = form.vkn_tckn.trim();
    if (vkn.length !== 10 && vkn.length !== 11) {
      addToast({ title: 'Geçersiz VKN/TCKN', description: '10 veya 11 haneli olmalı.', variant: 'destructive' });
      return;
    }
    setIsQuerying(true);
    setQueryResult(null);
    try {
      const data = await invoke<Record<string, unknown>>('gib_query_recipient', { vknTckn: vkn });
      // Yanıt alanları: unvan / ad / soyad / vergiDairesi / il / ilce
      const unvan = (data['unvan'] as string) || '';
      const ad = (data['ad'] as string) || '';
      const soyad = (data['soyad'] as string) || '';
      const vd = (data['vergiDairesi'] as string) || '';
      const il = (data['il'] as string) || '';
      const ilce = (data['ilce'] as string) || '';

      setForm((f) => ({
        ...f,
        alici_unvan: unvan || f.alici_unvan,
        alici_adi: ad || f.alici_adi,
        alici_soyadi: soyad || f.alici_soyadi,
        vergi_dairesi: vd || f.vergi_dairesi,
        sehir: il || f.sehir,
        mahalle_semt_ilce: ilce || f.mahalle_semt_ilce,
      }));
      setQueryResult(`${unvan || `${ad} ${soyad}`}${vd ? ` • ${vd}` : ''}`);
    } catch (err) {
      setQueryResult(null);
      addToast({ title: 'Sorgu Başarısız', description: String(err), variant: 'destructive' });
    } finally {
      setIsQuerying(false);
    }
  };

  // Fatura gönder
  const handleSubmit = async () => {
    if (!form.vkn_tckn.trim()) {
      addToast({ title: 'Eksik Bilgi', description: 'Alıcı VKN/TCKN zorunlu.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await invoke<EInvoiceResult>('gib_create_invoice', { invoice: form });
      addToast({
        title: 'Taslak Oluşturuldu',
        description: `${result.belge_numarasi || result.uuid} — şimdi SMS ile imzalamanız gerekiyor.`,
        variant: 'success',
      });
      setPendingSignUuids([result.uuid]);
      await startSms();
      await loadDocuments();
    } catch (err) {
      addToast({ title: 'Fatura Oluşturulamadı', description: String(err), variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // SMS imzalama akışı
  const startSms = async () => {
    try {
      const oid = await invoke<string>('gib_start_sms_sign');
      setSmsOperationId(oid);
      addToast({ title: 'SMS Gönderildi', description: 'Telefonunuza gelen kodu girin.' });
    } catch (err) {
      addToast({ title: 'SMS Başlatılamadı', description: String(err), variant: 'destructive' });
    }
  };

  const completeSms = async () => {
    if (!smsCode.trim() || pendingSignUuids.length === 0) return;
    setIsSigning(true);
    try {
      const n = await invoke<number>('gib_complete_sms_sign', {
        smsCode: smsCode.trim(),
        operationId: smsOperationId,
        uuids: pendingSignUuids,
      });
      addToast({ title: 'Fatura İmzalandı', description: `${n} belge GİB'de kesildi ve cari hesaba işlendi.`, variant: 'success' });
      setSmsCode('');
      setSmsOperationId(null);
      setPendingSignUuids([]);
      await loadDocuments();
    } catch (err) {
      addToast({ title: 'İmzalama Başarısız', description: String(err), variant: 'destructive' });
    } finally {
      setIsSigning(false);
    }
  };

  // Belge listesi
  const loadDocuments = useCallback(async () => {
    setIsLoadingDocs(true);
    try {
      // gg/aa/yyyy formatına çevir
      const [sy, sm, sd] = startDate.split('-');
      const [ey, em, ed] = endDate.split('-');
      const docs = await invoke<GibDocument[]>('gib_list_documents', {
        startDate: `${sd}/${sm}/${sy}`,
        endDate: `${ed}/${em}/${ey}`,
      });
      setDocuments(docs || []);
    } catch (err) {
      addToast({ title: 'Liste Alınamadı', description: String(err), variant: 'destructive' });
    } finally {
      setIsLoadingDocs(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (hasSession) loadDocuments();
  }, [hasSession, loadDocuments]);

  const handleDownload = async (doc: GibDocument) => {
    try {
      const path = await invoke<string>('gib_download_invoice', {
        ettn: doc.ettn,
        onayDurumu: doc.onay_durumu,
        fileName: `${doc.belge_numarasi || doc.ettn}.zip`,
      });
      addToast({ title: 'İndirildi', description: path, variant: 'success' });
    } catch (err) {
      addToast({ title: 'İndirilemedi', description: String(err), variant: 'destructive' });
    }
  };

  const handleDeleteDraft = async (doc: GibDocument) => {
    if (doc.onay_durumu === 'Onaylandı') {
      addToast({ title: 'Silinemez', description: 'Onaylanmış fatura silinemez; iptal talebi oluşturulmalıdır.', variant: 'destructive' });
      return;
    }
    try {
      await invoke('gib_delete_draft', { ettn: doc.ettn, reason: 'Hatalı İşlem' });
      addToast({ title: 'Taslak Silindi', variant: 'success' });
      await loadDocuments();
    } catch (err) {
      addToast({ title: 'Silinemedi', description: String(err), variant: 'destructive' });
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (isChecking) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Giriş ekranı
  if (!hasSession) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            GİB e-Arşiv Portal Bağlantısı
          </CardTitle>
          <CardDescription>
            İnteraktif Vergi Dairesi kullanıcı kodunuz ve şifrenizle giriş yapın. Bilgileriniz yalnızca bu bilgisayarda saklanır.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Kullanıcı Kodu (VKN)</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)}  disabled={isLoggingIn} />
          </div>
          <div className="grid gap-2">
            <Label>Portal Şifresi</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)}  onKeyPress={(e) => e.key === 'Enter' && handleLogin()} disabled={isLoggingIn} />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={testMode} onChange={(e) => setTestMode(e.target.checked)} className="rounded" />
            Test portalını kullan (earsivportaltest)
          </label>
          <Button onClick={handleLogin} disabled={isLoggingIn} className="gap-2">
            {isLoggingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            GİB Portalına Giriş Yap
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Ana ekran
  return (
    <div className="space-y-4">
      {/* Oturum çubuğu */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-green-50/60 border border-green-200">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-green-800">GİB e-Arşiv portalına bağlı</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1.5 h-8 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Yeni Fatura
          </Button>
          <Button size="sm" variant="outline" onClick={checkSession} className="gap-1.5 h-8 text-xs">
            <RefreshCw className="h-3.5 w-3.5" />
            Oturumu Test Et
          </Button>
          <Button size="sm" variant="outline" onClick={handleLogout} className="gap-1.5 h-8 text-xs">
            <LogOut className="h-3.5 w-3.5" />
            Çıkış
          </Button>
        </div>
      </div>

      {/* SMS imzalama çubuğu */}
      {smsOperationId && (
        <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/60 space-y-2">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-semibold text-blue-800">SMS Doğrulama</span>
          </div>
          <p className="text-xs text-blue-700">
            Telefonunuza gönderilen doğrulama kodunu girin. Kod girilince fatura(lar) resmen kesilir.
          </p>
          <div className="flex gap-2">
            <Input
              value={smsCode}
              onChange={(e) => setSmsCode(e.target.value)}
              
              maxLength={6}
              className="max-w-[160px] font-mono"
              disabled={isSigning}
            />
            <Button size="sm" onClick={completeSms} disabled={isSigning || !smsCode.trim()} className="gap-1.5">
              {isSigning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              İmzala
            </Button>
          </div>
        </div>
      )}

      {/* Fatura formu */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Yeni e-Arşiv Fatura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Alıcı */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>VKN / TCKN *</Label>
                <div className="flex gap-1.5">
                  <Input
                    value={form.vkn_tckn}
                    onChange={(e) => setForm({ ...form, vkn_tckn: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                    
                    disabled={isSubmitting}
                  />
                  <Button variant="outline" size="icon" onClick={handleQueryRecipient} disabled={isQuerying} title="GİB'den sorgula">
                    {isQuerying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
                {queryResult && <p className="text-[11px] text-green-700">{queryResult}</p>}
              </div>
              <div className="space-y-1">
                <Label>Fatura Tipi</Label>
                <select
                  value={form.fatura_tipi}
                  onChange={(e) => setForm({ ...form, fatura_tipi: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-md bg-card text-sm"
                >
                  <option value="SATIS">Satış</option>
                  <option value="IADE">İade</option>
                  <option value="TEVKIFAT">Tevkifat</option>
                  <option value="ISTISNA">İstisna</option>
                  <option value="OZELMATRAH">Özel Matrah</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>Para Birimi</Label>
                <select
                  value={form.para_birimi}
                  onChange={(e) => setForm({ ...form, para_birimi: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-md bg-card text-sm"
                >
                  <option value="TRY">TRY</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {form.vkn_tckn.length === 10 ? (
                <div className="space-y-1">
                  <Label>Alıcı Ünvan *</Label>
                  <Input value={form.alici_unvan} onChange={(e) => setForm({ ...form, alici_unvan: e.target.value })} disabled={isSubmitting} />
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <Label>Alıcı Ad *</Label>
                    <Input value={form.alici_adi} onChange={(e) => setForm({ ...form, alici_adi: e.target.value })} disabled={isSubmitting} />
                  </div>
                  <div className="space-y-1">
                    <Label>Alıcı Soyad *</Label>
                    <Input value={form.alici_soyadi} onChange={(e) => setForm({ ...form, alici_soyadi: e.target.value })} disabled={isSubmitting} />
                  </div>
                </>
              )}
              <div className="space-y-1">
                <Label>Vergi Dairesi</Label>
                <Input value={form.vergi_dairesi} onChange={(e) => setForm({ ...form, vergi_dairesi: e.target.value })} disabled={isSubmitting} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="space-y-1 md:col-span-2">
                <Label>Mahalle / Semt / İlçe *</Label>
                <Input value={form.mahalle_semt_ilce} onChange={(e) => setForm({ ...form, mahalle_semt_ilce: e.target.value })} disabled={isSubmitting} />
              </div>
              <div className="space-y-1">
                <Label>Şehir *</Label>
                <Input value={form.sehir} onChange={(e) => setForm({ ...form, sehir: e.target.value })} disabled={isSubmitting} />
              </div>
              <div className="space-y-1">
                <Label>Ülke *</Label>
                <Input value={form.ulke} onChange={(e) => setForm({ ...form, ulke: e.target.value })} disabled={isSubmitting} />
              </div>
            </div>

            {/* Ürün satırları */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-semibold">Ürün / Hizmetler *</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setForm({ ...form, items: [...form.items, { ...EMPTY_ITEM }] })}
                  className="h-7 text-xs gap-1"
                >
                  <Plus className="h-3 w-3" /> Satır Ekle
                </Button>
              </div>
              {form.items.map((item, i) => {
                const fiyat = item.miktar * item.birim_fiyat;
                const isk = fiyat * item.iskonto_orani / 100;
                const kdv = (fiyat - isk) * item.kdv_orani / 100;
                return (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg border bg-muted/20">
                    <div className="col-span-12 md:col-span-4 space-y-1">
                      <Label className="text-xs">Açıklama</Label>
                      <Input
                        value={item.mal_hizmet}
                        onChange={(e) => {
                          const items = [...form.items];
                          items[i] = { ...item, mal_hizmet: e.target.value };
                          setForm({ ...form, items });
                        }}
                        
                        className="text-sm"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="col-span-3 md:col-span-1 space-y-1">
                      <Label className="text-xs">Miktar</Label>
                      <Input
                        type="number"
                        value={item.miktar}
                        onChange={(e) => {
                          const items = [...form.items];
                          items[i] = { ...item, miktar: parseFloat(e.target.value) || 0 };
                          setForm({ ...form, items });
                        }}
                        className="text-sm"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="col-span-3 md:col-span-2 space-y-1">
                      <Label className="text-xs">Birim</Label>
                      <select
                        value={item.birim}
                        onChange={(e) => {
                          const items = [...form.items];
                          items[i] = { ...item, birim: e.target.value };
                          setForm({ ...form, items });
                        }}
                        className="w-full px-2 py-2 border border-input rounded-md bg-card text-sm"
                      >
                        {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <div className="col-span-3 md:col-span-2 space-y-1">
                      <Label className="text-xs">Birim Fiyat</Label>
                      <Input
                        type="number"
                        value={item.birim_fiyat}
                        onChange={(e) => {
                          const items = [...form.items];
                          items[i] = { ...item, birim_fiyat: parseFloat(e.target.value) || 0 };
                          setForm({ ...form, items });
                        }}
                        className="text-sm"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="col-span-2 md:col-span-1 space-y-1">
                      <Label className="text-xs">KDV %</Label>
                      <select
                        value={item.kdv_orani}
                        onChange={(e) => {
                          const items = [...form.items];
                          items[i] = { ...item, kdv_orani: parseFloat(e.target.value) };
                          setForm({ ...form, items });
                        }}
                        className="w-full px-2 py-2 border border-input rounded-md bg-card text-sm"
                      >
                        {[0, 1, 8, 10, 20].map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div className="col-span-3 md:col-span-1 space-y-1">
                      <Label className="text-xs">İsk. %</Label>
                      <Input
                        type="number"
                        value={item.iskonto_orani}
                        onChange={(e) => {
                          const items = [...form.items];
                          items[i] = { ...item, iskonto_orani: parseFloat(e.target.value) || 0 };
                          setForm({ ...form, items });
                        }}
                        className="text-sm"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="col-span-3 md:col-span-1 flex items-center justify-between gap-1">
                      <div className="text-right text-xs">
                        <p className="font-semibold">{(fiyat - isk).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</p>
                        <p className="text-muted-foreground">KDV: {kdv.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
                      </div>
                      {form.items.length > 1 && (
                        <button
                          onClick={() => setForm({ ...form, items: form.items.filter((_, j) => j !== i) })}
                          className="text-red-400 hover:text-red-600 p-1"
                          title="Satırı Sil"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-1">
              <Label>Fatura Notu</Label>
              <Input value={form.not_aciklama} onChange={(e) => setForm({ ...form, not_aciklama: e.target.value })}  disabled={isSubmitting} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)} disabled={isSubmitting}>İptal</Button>
              <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Taslak Oluştur & SMS Başlat
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Belge listesi */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            GİB Belgeleri
          </CardTitle>
          <div className="flex gap-2 items-end pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Başlangıç</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Bitiş</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="text-sm" />
            </div>
            <Button size="sm" variant="outline" onClick={loadDocuments} disabled={isLoadingDocs} className="gap-1.5 h-9">
              {isLoadingDocs ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Yenile
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Seçili tarih aralığında belge bulunmuyor.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3">Belge No</th>
                    <th className="py-2 pr-3">Tarih</th>
                    <th className="py-2 pr-3">Alıcı</th>
                    <th className="py-2 pr-3">VKN/TCKN</th>
                    <th className="py-2 pr-3">Durum</th>
                    <th className="py-2 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.ettn} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-mono text-xs">{doc.belge_numarasi || '-'}</td>
                      <td className="py-2 pr-3">{doc.belge_tarihi}</td>
                      <td className="py-2 pr-3">{doc.alici_unvan_ad_soyad}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{doc.alici_vkn_tckn}</td>
                      <td className="py-2 pr-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${doc.onay_durumu === 'Onaylandı' ? 'text-green-700' : 'text-amber-600'}`}>
                          {doc.onay_durumu === 'Onaylandı' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                          {doc.onay_durumu}
                        </span>
                      </td>
                      <td className="py-2 text-right space-x-1">
                        <button onClick={() => handleDownload(doc)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-primary" title="İndir (ZIP)">
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        {doc.onay_durumu !== 'Onaylandı' && (
                          <button onClick={() => handleDeleteDraft(doc)} className="p-1.5 rounded hover:bg-red-50 text-red-400 hover:text-red-600" title="Taslağı Sil">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
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
