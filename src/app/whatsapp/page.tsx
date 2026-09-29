"use client";

import { MessageCircle, ShieldCheck } from "lucide-react";

export default function WhatsAppPage({ isEmbedded = false }: { isEmbedded?: boolean }) {
  return (
    <div className={isEmbedded ? "flex flex-col w-full h-full" : "space-y-6 max-w-6xl mx-auto flex flex-col h-[calc(100vh-100px)]"}>
      {!isEmbedded && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 mb-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3 text-zinc-900">
              <MessageCircle className="w-8 h-8 text-green-500" />
              WhatsApp Entegrasyonu
            </h1>
            <p className="text-muted-foreground mt-1">
              WhatsApp üzerinden müşterilerinize otomatik mesaj ve fatura gönderin. QR kodu taratarak giriş yapabilirsiniz.
            </p>
          </div>
        </div>
      )}

      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-border overflow-hidden relative">
        <iframe 
          src="https://web.whatsapp.com/"
          className="w-full h-full border-none"
          title="WhatsApp Web"
          allow="camera; microphone"
        />
        <div className="absolute bottom-4 left-4 right-4 bg-zinc-900/80 text-white text-xs p-3 rounded-lg backdrop-blur flex items-center gap-3 shadow-lg pointer-events-none">
          <ShieldCheck className="w-5 h-5 text-green-400" />
          <p>
            Güvenli bağlantı sağlandı. Yapay zeka asistanı, açık olan bu WhatsApp Web sayfasındaki mesajları arka planda okuyabilecek ve işlem yapabilecektir.
          </p>
        </div>
      </div>
    </div>
  );
}
