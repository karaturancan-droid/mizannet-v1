"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAsistan } from "@/hooks/use-asistan";
import { usePathname } from "next/navigation";

export function AssistantButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const { messages, isLoading, error, sendMessage } = useAsistan();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Eğer /asistan sayfasındaysak yüzen butonu gizle
  if (pathname === "/asistan") {
    return null;
  }

  // Otomatik kaydırma
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const msg = input;
    setInput("");
    await sendMessage(msg);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Asistanı aç"
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
      >
        <Sparkles className="h-5 w-5" />
      </button>

      {/* Arka plan örtüsü (mobil/dar ekranlarda tıklanınca kapanır) */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/10"
          onClick={() => setOpen(false)}
        />
      )}

      <div
        className={cn(
          "fixed bottom-24 right-6 z-50 flex h-[28rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xl transition-all duration-200",
          open
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "translate-y-4 opacity-0 pointer-events-none"
        )}
      >
        <div className="flex items-center justify-between border-b border-border p-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">Asistan</span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Asistanı kapat"
            className="rounded-sm p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-3 bg-card/50">
          <div className="max-w-[85%] rounded-lg rounded-tl-sm bg-muted px-3 py-2 text-sm shadow-sm">
            Merhaba efendim, bugün size nasıl yardımcı olabilirim?
          </div>
          {messages.map((msg) => {
            const isError = msg.role === "assistant" && msg.content.includes("Yapay zeka yanıtı alınamadı");
            return (
            <div
              key={msg.id}
              className={cn(
                "max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm whitespace-pre-wrap",
                msg.role === "user"
                  ? "ml-auto rounded-tr-sm bg-primary text-primary-foreground"
                  : isError ? "rounded-tl-sm bg-red-50 border border-red-200 text-red-800" : "rounded-tl-sm bg-muted"
              )}
            >
              {msg.content}
            </div>
          )})}
          {isLoading && (
            <div className="max-w-[85%] rounded-lg rounded-tl-sm bg-muted px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Düşünüyor...
            </div>
          )}
          {error && (
            <div className="max-w-[85%] rounded-lg rounded-tl-sm bg-red-100 text-red-800 px-3 py-2 text-xs">
              {error}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              disabled={isLoading}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              
              className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:opacity-50"
            />
            <button
              type="button"
              disabled={isLoading || !input.trim()}
              onClick={handleSend}
              className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
