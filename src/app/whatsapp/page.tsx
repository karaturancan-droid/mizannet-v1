"use client";

import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { MessageCircle, ShieldCheck, RefreshCw, Smartphone, LogOut, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WhatsAppStatus {
  connected: boolean;
  qr: string | null;
}

export default function WhatsAppPage({ isEmbedded = false }: { isEmbedded?: boolean }) {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const startWorker = async () => {
    try {
      setLoading(true);
      setError(null);
      await invoke("start_whatsapp_worker");
      pollStatus();
    } catch (err: any) {
      console.error(err);
      setError("WhatsApp altyapısı başlatılamadı: " + err.toString());
      setLoading(false);
    }
  };

  const pollStatus = async () => {
    try {
      const st: WhatsAppStatus = await invoke("get_whatsapp_status");
      setStatus(st);
      if (!st.connected && !st.qr) {
        // Still initializing...
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error("Status check error", err);
    }
  };

  useEffect(() => {
    startWorker();
    const interval = setInterval(pollStatus, 2500);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      await invoke("logout_whatsapp");
      setStatus({ connected: false, qr: null });
      setLoading(true);
    } catch (err: any) {
      alert("Çıkış yapılamadı: " + err.toString());
    }
  };

  return (
    <div className={isEmbedded ? "flex flex-col w-full" : "space-y-6 max-w-6xl mx-auto flex flex-col"}>
      {!isEmbedded && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 mb-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3 text-zinc-900">
              <MessageCircle className="w-8 h-8 text-green-500" />
              WhatsApp Entegrasyonu
            </h1>
            <p className="text-muted-foreground mt-1">
              WhatsApp üzerinden müşterilerinize otomatik mesaj ve fatura gönderin.
            </p>
          </div>
        </div>
      )}

      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-border overflow-hidden p-8 flex flex-col items-center justify-center text-center min-h-[500px]">
        {error ? (
          <div className="text-red-500 flex flex-col items-center gap-4">
            <ShieldCheck className="w-12 h-12" />
            <p className="font-medium text-lg">{error}</p>
            <Button onClick={startWorker} variant="outline" className="mt-4">
              Yeniden Dene
            </Button>
          </div>
        ) : status?.connected ? (
          <div className="flex flex-col items-center gap-6 animate-in fade-in duration-500">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center relative shadow-lg shadow-green-100/50">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-white flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-zinc-900 mb-2">WhatsApp Bağlantısı Aktif</h2>
              <p className="text-zinc-500 max-w-md mx-auto">
                Sistem şu anda WhatsApp hesabınızla senkronize çalışıyor. MizanNet üzerinden otomatik fatura, bakiye ve bilgilendirme mesajları gönderebilirsiniz.
              </p>
            </div>
            <Button 
              onClick={handleLogout}
              variant="destructive"
              className="mt-6 flex items-center gap-2 rounded-xl px-6"
            >
              <LogOut className="w-4 h-4" />
              Bağlantıyı Kes ve Çıkış Yap
            </Button>
          </div>
        ) : status?.qr ? (
          <div className="flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300">
            <div>
              <h2 className="text-2xl font-bold text-zinc-900 mb-2">QR Kodu Okutun</h2>
              <p className="text-zinc-500 max-w-sm mx-auto">
                Telefonunuzdan WhatsApp'ı açın, <strong>Bağlı Cihazlar</strong> menüsüne girin ve kameranızı aşağıdaki QR koda tutun.
              </p>
            </div>
            <div className="p-4 bg-white border border-zinc-200 rounded-2xl shadow-sm">
              <img src={status.qr} alt="WhatsApp QR Code" className="w-64 h-64 object-contain" />
            </div>
            <div className="flex items-center justify-center gap-3 text-sm font-medium text-zinc-400 mt-4">
              <Smartphone className="w-4 h-4" />
              Bağlantı şifrelenmiştir ve güvenlidir
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6 text-zinc-500">
            <RefreshCw className="w-12 h-12 animate-spin text-green-500" />
            <h2 className="text-xl font-medium text-zinc-900">WhatsApp Altyapısı Başlatılıyor...</h2>
            <p className="max-w-sm mx-auto">
              Lütfen bekleyin, MizanNet sunucularında güvenli WhatsApp bağlantısı kuruluyor.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
