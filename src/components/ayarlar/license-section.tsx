"use client";

import { useState } from "react";
import { useAuth, API_URL } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Key, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { tr } from "date-fns/locale";

export function LicenseSection() {
  const { user, subscription, refreshAuth } = useAuth();
  const [licenseKey, setLicenseKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const handleActivate = async () => {
    if (!licenseKey.trim()) return;
    setMessage({ text: "", type: "" });
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
        setMessage({ text: data.error || "Aktivasyon başarısız oldu", type: "error" });
      } else {
        setMessage({ text: data.message, type: "success" });
        await refreshAuth();
        setLicenseKey("");
      }
    } catch (err) {
      // OFFLINE FALLBACK: Offline iken girilen kodu Tauri içindeki Ed25519 algoritmasıyla sına
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('activate_license', { code: licenseKey.trim() });
        setMessage({ text: "Lisans çevrimdışı (offline) olarak doğrulandı ve cihazınıza kaydedildi.", type: "success" });
        await refreshAuth();
        setLicenseKey("");
      } catch (invokeErr: any) {
        setMessage({ text: typeof invokeErr === 'string' ? invokeErr : "Geçersiz veya bozuk lisans kodu.", type: "error" });
      }
    } finally {
      setLoading(false);
    }
  };

  const getDaysLeft = () => {
    if (!subscription?.trial_end) return 0;
    const end = new Date(subscription.trial_end);
    const now = new Date();
    const diff = differenceInDays(end, now);
    return diff > 0 ? diff : 0;
  };

  const isLifetime = subscription?.plan === "lifetime";
  const daysLeft = getDaysLeft();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lisans & Abonelik</CardTitle>
        <CardDescription>Hesabınızın abonelik durumunu ve lisans bilgilerinizi yönetin.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        <div className={`flex items-center gap-4 p-4 rounded-xl border ${isLifetime ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
          <div className={`p-3 rounded-full ${isLifetime ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
            {isLifetime ? <ShieldCheck size={24} /> : <AlertTriangle size={24} />}
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-zinc-900">
              {isLifetime ? 'Sınırsız Lisans Aktif' : 'Deneme Sürümü'}
            </h4>
            <p className="text-sm text-zinc-600">
              {isLifetime 
                ? 'MizanNet\'in tüm özelliklerini süresiz olarak kullanabilirsiniz.' 
                : `Ücretsiz deneme sürenizin bitmesine ${daysLeft} gün kaldı. (${subscription?.trial_end ? format(new Date(subscription.trial_end), 'dd MMMM yyyy', { locale: tr }) : ''})`}
            </p>
          </div>
        </div>

        {!isLifetime && (
          <div className="space-y-3 pt-4 border-t border-zinc-100">
            <h4 className="font-medium text-sm text-zinc-900">Özel Lisans Kodu ile Etkinleştir</h4>
            <p className="text-xs text-zinc-500">Satın aldığınız veya size özel verilen 45 haneli VIP lisans kodunu buraya girin.</p>
            
            <div className="flex gap-2 max-w-md">
              <div className="relative flex-1">
                <Key className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <Input 
                  value={licenseKey}
                  onChange={e => setLicenseKey(e.target.value.toUpperCase())}
                   
                  className="pl-9 font-mono uppercase" 
                />
              </div>
              <Button onClick={handleActivate} disabled={loading || !licenseKey}>
                {loading ? "Sorgulanıyor..." : "Etkinleştir"}
              </Button>
            </div>
            
            {message.text && (
              <div className={`text-sm mt-2 flex items-center gap-1.5 ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                {message.text}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
