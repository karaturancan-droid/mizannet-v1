'use client';

import { useEffect, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { Globe, LogIn, LogOut, Loader2, CheckCircle2, User } from 'lucide-react';

interface WebAccountStatus {
  logged_in: boolean;
  user_name: string | null;
  user_email: string | null;
  plan: string | null;
  subscription_status: string | null;
  trial_end: string | null;
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

export function WebAccountSection() {
  const { addToast } = useToast();
  const [status, setStatus] = useState<WebAccountStatus | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
                placeholder="ornek@firma.com"
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
                placeholder="••••••••"
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
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      <span className="text-xs font-medium text-green-700">
                        Plan: {PLAN_LABELS[status.plan] || status.plan}
                        {status.subscription_status && ` • ${status.subscription_status}`}
                      </span>
                    </div>
                  )}
                  {status.trial_end && (
                    <p className="text-[11px] text-gray-400 mt-0.5">Deneme bitişi: {status.trial_end}</p>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout} className="gap-1.5 h-8 text-xs shrink-0">
                <LogOut className="h-3.5 w-3.5" />
                Çıkış
              </Button>
            </div>

            {/* Lisans anahtarı etkinleştirme */}
            <div className="space-y-2 p-4 rounded-xl bg-muted/30 border">
              <Label className="font-semibold text-sm">Web'den Satın Alınan Lisans Anahtarı</Label>
              <p className="text-xs text-muted-foreground">
                mizannet.com üzerinden satın aldıysanız anahtarı buraya girip etkinleştirin.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="MIZANNET-XXXX-XXXX-XXXX"
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
