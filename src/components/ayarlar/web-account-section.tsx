'use client';

import { useEffect, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import {
  Globe,
  LogIn,
  LogOut,
  Loader2,
  CheckCircle2,
  User,
  KeyRound,
  Copy,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';

interface WebAccountStatus {
  logged_in: boolean;
  user_name: string | null;
  user_email: string | null;
  plan: string | null;
  subscription_status: string | null;
  trial_end: string | null;
  entitled: boolean | null;
  license_key: string | null;
  license_end: string | null;
  days_left: number | null;
  source: string | null;
  error: string | null;
}

const PLAN_LABELS: Record<string, string> = {
  trial: 'Deneme',
  baslangic: 'Başlangıç',
  profesyonel: 'Profesyonel',
  kurumsal: 'Kurumsal',
  lifetime: 'Yaşam Boyu',
  none: 'Plan yok',
};

const STATUS_LABELS: Record<string, string> = {
  trial: 'Deneme sürümü',
  active: 'Aktif',
  expired: 'Süresi doldu',
  cancelled: 'İptal edildi',
  none: 'Durum yok',
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('tr-TR');
}

export function WebAccountSection() {
  const { addToast } = useToast();
  const [status, setStatus] = useState<WebAccountStatus | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const s = await invoke<WebAccountStatus>('web_verify');
      setStatus(s);
    } catch (err) {
      setStatus(null);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      addToast({ title: 'Eksik Bilgi', description: 'E-posta ve şifre gerekli.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const result = await invoke<WebAccountStatus>('web_login', { email: email.trim(), password });
      setStatus(result);
      if (result.logged_in) {
        addToast({ title: 'Giriş Başarılı', description: `Hoş geldiniz, ${result.user_name}!`, variant: 'success' });
        setEmail('');
        setPassword('');
      } else {
        addToast({ title: 'Giriş Başarısız', description: result.error || 'Bilgileri kontrol edin.', variant: 'destructive' });
      }
    } catch (err) {
      addToast({ title: 'Hata', description: String(err), variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await invoke('web_logout');
      await loadStatus();
      addToast({ title: 'Çıkış Yapıldı' });
    } catch (err) {
      addToast({ title: 'Hata', description: String(err), variant: 'destructive' });
    }
  };

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      addToast({ title: 'Eksik Bilgi', description: 'Lisans anahtarı girin.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const message = await invoke<string>('web_activate_license', { key: licenseKey.trim() });
      addToast({ title: 'Lisans Etkinleştirildi', description: message, variant: 'success' });
      setLicenseKey('');
      await loadStatus();
    } catch (err) {
      addToast({ title: 'Etkinleştirilemedi', description: String(err), variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const copyLicenseKey = async () => {
    if (!status?.license_key) return;
    try {
      await navigator.clipboard.writeText(status.license_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // pano erişimi yok
    }
  };

  const entitled = status?.entitled === true;
  const expiredKnown = status?.entitled === false && status.logged_in;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-blue-600" />
          Web Hesabı & Lisans Senkronu
        </CardTitle>
        <CardDescription>
          mizannet.com web sitesindeki hesabınızla bağlanın, abonelik durumunu görün ve web'den satın aldığınız lisansı etkinleştirin.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!status?.logged_in ? (
          <div className="space-y-3">
            <div className="grid gap-2">
              <Label htmlFor="web-email">E-Posta</Label>
              <Input
                id="web-email"
                type="email"
                
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="web-password">Şifre</Label>
              <Input
                id="web-password"
                type="password"
                
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                disabled={isLoading}
              />
            </div>
            <Button onClick={handleLogin} disabled={isLoading} className="gap-2">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              Web Hesabına Giriş Yap
            </Button>
            {status?.error && (
              <p className="text-xs text-red-600">{status.error}</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Hesap bilgisi */}
            <div className="flex items-start justify-between p-4 rounded-xl bg-green-50/50 border border-green-200">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-800">{status.user_name}</p>
                  <p className="text-xs text-gray-500">{status.user_email}</p>
                  {status.plan && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <CheckCircle2 className={`h-3.5 w-3.5 ${entitled ? 'text-green-600' : 'text-red-500'}`} />
                      <span className={`text-xs font-medium ${entitled ? 'text-green-700' : 'text-red-600'}`}>
                        Plan: {PLAN_LABELS[status.plan] || status.plan}
                        {status.subscription_status &&
                          ` • ${STATUS_LABELS[status.subscription_status] || status.subscription_status}`}
                      </span>
                    </div>
                  )}
                  {status.days_left != null && status.plan === 'trial' && (
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Kalan deneme günü: {status.days_left}
                    </p>
                  )}
                  {status.license_end && (
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Bitiş: {formatDate(status.license_end)}
                    </p>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout} className="gap-1.5 h-8 text-xs shrink-0">
                <LogOut className="h-3.5 w-3.5" />
                Çıkış
              </Button>
            </div>

            {/* Süre bitmiş uyarısı */}
            {expiredKnown && (
              <div className="flex items-start justify-between gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-red-700">Lisansınız aktif değil</p>
                    <p className="text-xs text-red-600 mt-0.5">
                      Aboneliğinizi yenileyerek masaüstü uygulamasının tüm modüllerini kullanmaya devam edin.
                    </p>
                  </div>
                </div>
                <a
                  href="https://mizannet.com/lisans"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Yenile
                </a>
              </div>
            )}

            {/* Lisans anahtarı görüntüleme */}
            {status.license_key && (
              <div className="space-y-2 p-4 rounded-xl bg-blue-50/50 border border-blue-200">
                <Label className="font-semibold text-sm flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-blue-600" />
                  Lisans Anahtarınız
                </Label>
                <p className="text-xs text-muted-foreground">
                  Bu anahtarı başka bir bilgisayardaki MizanNet uygulamasına girebilirsiniz.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-lg bg-white border px-3 py-2 font-mono text-sm tracking-wide">
                    {status.license_key}
                  </code>
                  <Button variant="outline" size="sm" onClick={copyLicenseKey} className="gap-1.5 shrink-0">
                    {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Kopyalandı' : 'Kopyala'}
                  </Button>
                </div>
              </div>
            )}

            {/* Lisans anahtarı etkinleştirme */}
            <div className="space-y-2 p-4 rounded-xl bg-muted/30 border">
              <Label className="font-semibold text-sm">Web'den Satın Alınan Lisans Anahtarı</Label>
              <p className="text-xs text-muted-foreground">
                mizannet.com üzerinden satın aldıysanız anahtarı buraya girip etkinleştirin.
              </p>
              <div className="flex gap-2">
                <Input
                  
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  disabled={isLoading}
                  className="font-mono text-sm"
                />
                <Button onClick={handleActivate} disabled={isLoading || !licenseKey.trim()} className="shrink-0 gap-1.5">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Etkinleştir
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
