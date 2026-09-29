"use client";

import { useState } from "react";
import { useAuth, API_URL } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Key, ExternalLink, LogOut, CheckCircle2 } from "lucide-react";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

export default function ExpiredPage() {
  const { user, subscription, logout, refreshAuth } = useAuth();
  const [licenseKey, setLicenseKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleActivate = async () => {
    if (!licenseKey.trim()) return;
    setError("");
    setLoading(true);

    try {
      const storedToken = localStorage.getItem("mizannet_token");
      const res = await fetch(`${API_URL}/activate`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${storedToken}`
        },
        body: JSON.stringify({ key: licenseKey.trim() })
      });

      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || "Aktivasyon başarısız oldu");
      } else {
        setSuccess(true);
        // Refresh auth state to pull the new lifetime subscription and redirect
        setTimeout(() => refreshAuth(), 2000);
      }
    } catch (err) {
      // OFFLINE FALLBACK: Offline iken girilen kodu Tauri içindeki Ed25519 algoritmasıyla sına
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('activate_license', { code: licenseKey.trim() });
        setSuccess(true);
        setTimeout(() => refreshAuth(), 2000);
      } catch (invokeErr: any) {
        setError(typeof invokeErr === 'string' ? invokeErr : "Geçersiz veya bozuk lisans kodu.");
      }
    } finally {
      setLoading(false);
    }
  };

  const openWebPricing = () => {
    const win = new WebviewWindow("mizannet-pricing", {
      url: "http://localhost:3000/fiyatlandirma", // Update to live URL
      title: "MizanNet - Paketler",
      width: 1024,
      height: 768,
      center: true
    });
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-zinc-50 font-sans">
      <div className="w-full max-w-lg bg-white p-10 rounded-3xl shadow-xl border border-zinc-100 flex flex-col items-center text-center">
        
        {success ? (
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
            <div className="h-24 w-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 size={48} className="text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-zinc-900 mb-2">Aktivasyon Başarılı!</h1>
            <p className="text-zinc-500 mb-6">
              MizanNet sınırsız lisansınız aktif edildi. Uygulamaya yönlendiriliyorsunuz...
            </p>
          </div>
        ) : (
          <>
            <div className="h-20 w-20 bg-red-100 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
              <AlertTriangle size={40} className="text-red-600" />
            </div>
            
            <h1 className="text-2xl font-bold text-zinc-900 mb-2">
              Deneme Süreniz Sona Erdi
            </h1>
            <p className="text-sm text-zinc-500 mb-8 max-w-sm">
              Sayın {user?.name}, 15 günlük ücretsiz deneme süreniz dolmuştur. Uygulamayı kullanmaya devam etmek için lütfen lisans anahtarınızı girin veya bir abonelik başlatın.
            </p>

            {error && (
              <div className="w-full bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 border border-red-100 text-left">
                {error}
              </div>
            )}

            <div className="w-full bg-zinc-50 rounded-2xl p-6 border border-zinc-200 mb-6">
              <h3 className="text-sm font-semibold text-zinc-900 mb-3 text-left">Lisans Anahtarı ile Aktifleştir</h3>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Key className="absolute left-3 top-3 h-5 w-5 text-zinc-400" />
                  <input 
                    type="text" 
                    value={licenseKey}
                    onChange={e => setLicenseKey(e.target.value.toUpperCase())}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-300 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all outline-none font-mono text-sm uppercase"
                    
                  />
                </div>
                <Button 
                  onClick={handleActivate}
                  disabled={loading || !licenseKey}
                  className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl px-6"
                >
                  {loading ? "..." : "Etkinleştir"}
                </Button>
              </div>
            </div>

            <div className="w-full flex flex-col gap-3">
              <Button 
                onClick={openWebPricing}
                variant="outline"
                className="w-full py-6 rounded-xl text-base font-medium flex items-center justify-center gap-2 border-zinc-300 hover:bg-zinc-50"
              >
                Web Sitemizden Paket Satın Al
                <ExternalLink size={18} />
              </Button>
              
              <button 
                onClick={logout}
                className="text-zinc-500 font-medium text-sm flex items-center justify-center gap-1.5 w-full hover:text-zinc-900 py-3 transition-colors"
              >
                <LogOut size={16} />
                Farklı bir hesapla giriş yap
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
