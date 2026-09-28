"use client";

import { useState } from "react";
import { useAuth, API_URL } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Mail, Lock, ArrowRight, ExternalLink } from "lucide-react";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Uygulamada internetsiz giriş yapmak için admin hesabı
    if (email === "admin@mizannet.com" && password === "SCWSUS3YE9G1Z6EJQBZ6SAB1SNKWH7EF") {
      const fifteenDaysLater = new Date();
      fifteenDaysLater.setDate(fifteenDaysLater.getDate() + 15);
      
      login("offline-admin-token", 
        { id: 1, name: "Sistem Yöneticisi", email: "admin@mizannet.com" }, 
        { plan: "trial", status: "active", trial_end: fifteenDaysLater.toISOString() }
      );
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || "Giriş başarısız oldu");
      } else {
        login(data.token, data.user, data.subscription);
      }
    } catch (err) {
      setError("Sunucuya bağlanılamadı. E-posta veya şifrenizi kontrol edin.");
    } finally {
      setLoading(false);
    }
  };

  const openWebRegistration = () => {
    // Open website registration in a separate window or browser
    const win = new WebviewWindow("mizannet-register", {
      url: "http://localhost:3000/register", // Update to live URL
      title: "MizanNet - Kayıt Ol",
      width: 1024,
      height: 768,
      center: true
    });
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-zinc-50 font-sans">
      <div className="w-full max-w-md bg-white p-10 rounded-3xl shadow-xl border border-zinc-100 flex flex-col items-center">
        <div className="h-16 w-16 bg-zinc-900 rounded-2xl flex items-center justify-center mb-6 shadow-md shadow-zinc-900/20">
          <ShieldCheck size={32} className="text-white" />
        </div>
        
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">MizanNet'e Hoş Geldiniz</h1>
        <p className="text-sm text-zinc-500 mb-8 text-center">
          Uygulamayı kullanmaya başlamak için MizanNet hesabınızla giriş yapın.
        </p>

        {error && (
          <div className="w-full bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-700">E-posta</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-zinc-400" />
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all outline-none"
                placeholder="ornek@sirketiniz.com"
                required
              />
            </div>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-700">Şifre</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-zinc-400" />
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all outline-none"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <Button onClick={() => alert("Bu modül/özellik henüz yapım aşamasındadır. Yakında aktif olacaktır.")} 
            type="submit" 
            disabled={loading}
            className="w-full py-6 mt-4 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-base font-medium flex items-center justify-center gap-2"
          >
            {loading ? "Giriş Yapılıyor..." : "Giriş Yap"}
            {!loading && <ArrowRight size={18} />}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-zinc-100 w-full text-center">
          <p className="text-sm text-zinc-500 mb-4">Hesabınız yok mu?</p>
          <button 
            onClick={openWebRegistration}
            className="text-zinc-900 font-medium text-sm flex items-center justify-center gap-1.5 w-full hover:underline"
          >
            Web sitemizden ücretsiz 15 günlük deneme hesabı oluşturun
            <ExternalLink size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
