import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { invoke } from '@tauri-apps/api/core';
import { QRCodeSVG } from 'qrcode.react';
import { Loader2, MessageSquare, CheckCircle2, RefreshCw, LogOut, Power, Smartphone } from 'lucide-react';

interface WhatsAppStatus {
  connected: boolean;
  qr: string | null;
}

export function WhatsAppSection() {
  const { addToast } = useToast();
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      setChecking(true);
      const res = await invoke<WhatsAppStatus>('get_whatsapp_status');
      setStatus(res);
      return res;
    } catch {
      setStatus(null);
      return null;
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const startWorker = async () => {
    try {
      setLoading(true);
      await invoke('start_whatsapp_worker');
      addToast({
        title: 'Altyapı Başlatıldı',
        description: 'WhatsApp servisi arka planda başlatılıyor...',
      });

      // Poll until worker responds on port 3001 (up to 8 attempts)
      for (let i = 0; i < 8; i++) {
        await new Promise((r) => setTimeout(r, 700));
        const res = await fetchStatus();
        if (res) break;
      }
    } catch (e) {
      addToast({
        title: 'Başlatılamadı',
        description: String(e),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const stopWorker = async () => {
    try {
      setLoading(true);
      await invoke('stop_whatsapp_worker');
      setStatus(null);
      addToast({ title: 'Altyapı Durduruldu', description: 'WhatsApp servisi kapatıldı.' });
    } catch (e) {
      addToast({ title: 'Durdurulamadı', description: String(e), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await invoke('logout_whatsapp');
      await fetchStatus();
      addToast({ title: 'Çıkış Yapıldı', description: 'WhatsApp oturumu sonlandırıldı.' });
    } catch (e) {
      addToast({ title: 'Çıkış Hatası', description: String(e), variant: 'destructive' });
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-green-600" />
          WhatsApp Entegrasyonu
        </CardTitle>
        <CardDescription>
          Otomatik cari bakiye, fatura ve sipariş bildirimleri göndermek için WhatsApp hesabınızı güvenle bağlayın.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!status ? (
          <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-xl bg-secondary/20">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-950/40 flex items-center justify-center text-green-600 mb-3">
              <Smartphone className="h-6 w-6" />
            </div>
            <p className="font-medium text-foreground">WhatsApp Altyapısı Kapalı</p>
            <p className="text-xs text-muted-foreground text-center max-w-sm mt-1 mb-4">
              Mesaj gönderimi ve QR kod bağlantısı için yerel WhatsApp altyapısını başlatın.
            </p>
            <Button onClick={startWorker} disabled={loading} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
              {loading ? 'Altyapı Başlatılıyor...' : 'Altyapıyı Başlat'}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row items-center gap-8 p-6 border rounded-xl bg-secondary/10">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${status.connected ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`} />
                <span className="font-semibold text-foreground">
                  {status.connected ? 'WhatsApp Bağlı ve Hazır' : 'Bağlantı Bekleniyor (QR Okutun)'}
                </span>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">
                {status.connected
                  ? 'WhatsApp hesabınız başarıyla bağlandı. Sistem üzerinden müşterilerinize tek tıkla veya otomatik WhatsApp bildirimleri iletebilirsiniz.'
                  : 'Lütfen telefonunuzdan WhatsApp uygulamasını açın, "Bağlı Cihazlar" menüsüne girin ve yandaki QR kodu kameranızla taratın.'}
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                {status.connected && (
                  <Button variant="destructive" size="sm" onClick={logout} className="gap-1.5 h-8 text-xs">
                    <LogOut className="h-3.5 w-3.5" />
                    Oturumu Kapat
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={stopWorker} disabled={loading} className="gap-1.5 h-8 text-xs">
                  <Power className="h-3.5 w-3.5" />
                  Altyapıyı Durdur
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchStatus()}
                  disabled={checking}
                  className="gap-1.5 h-8 text-xs text-muted-foreground"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${checking ? 'animate-spin' : ''}`} />
                  Yenile
                </Button>
              </div>
            </div>

            {!status.connected && status.qr && (
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div className="bg-white p-4 rounded-xl shadow-md border shrink-0">
                  <QRCodeSVG value={status.qr} size={190} />
                </div>
                <span className="text-[11px] text-muted-foreground">Kameranızı QR koda tutun</span>
              </div>
            )}

            {!status.connected && !status.qr && (
              <div className="w-[190px] h-[190px] flex flex-col items-center justify-center bg-muted/40 rounded-xl border border-dashed shrink-0 p-4 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
                <span className="text-xs text-muted-foreground font-medium">QR Kod Hazırlanıyor...</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
