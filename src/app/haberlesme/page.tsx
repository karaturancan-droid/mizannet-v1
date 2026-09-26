"use client";

import { useState } from "react";
import { MessageCircle, Bot } from "lucide-react";
import TelegramPage from "../telegram/page";
import WhatsAppPage from "../whatsapp/page";

export default function HaberlesmePage() {
  const [activeTab, setActiveTab] = useState<"whatsapp" | "telegram">("whatsapp");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Haberleşme</h1>
          <p className="text-muted-foreground mt-1">
            WhatsApp ve Telegram entegrasyonlarınızı buradan yönetin.
          </p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-border mb-6">
        <button
          onClick={() => setActiveTab("whatsapp")}
          className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "whatsapp" 
              ? "border-primary text-primary" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          WhatsApp İşletme
        </button>
        <button
          onClick={() => setActiveTab("telegram")}
          className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "telegram" 
              ? "border-primary text-primary" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Bot className="w-4 h-4" />
          Telegram Botu
        </button>
      </div>

      <div className="mt-4">
        {activeTab === "whatsapp" && <WhatsAppPage isEmbedded={true} />}
        {activeTab === "telegram" && <TelegramPage isEmbedded={true} />}
      </div>
    </div>
  );
}
