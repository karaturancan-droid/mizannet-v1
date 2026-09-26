"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, Users, Car, Settings, Calendar, Calculator, Box } from "lucide-react";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
      setQuery("");
    }
  }, [open]);

  const items = [
    { name: "Yeni Fatura Ekle (Asistan)", icon: <FileText className="h-4 w-4" />, action: () => router.push("/asistan") },
    { name: "Cari Hesaplar", icon: <Users className="h-4 w-4" />, action: () => router.push("/cari") },
    { name: "Belge Arşivi", icon: <FileText className="h-4 w-4" />, action: () => router.push("/belgeler") },
    { name: "Araç Yönetimi", icon: <Car className="h-4 w-4" />, action: () => router.push("/araclar") },
    { name: "Depo / Stok", icon: <Box className="h-4 w-4" />, action: () => router.push("/depo") },
    { name: "Takvim", icon: <Calendar className="h-4 w-4" />, action: () => router.push("/takvim") },
    { name: "Vergi / SGK", icon: <Calculator className="h-4 w-4" />, action: () => router.push("/vergi") },
    { name: "Ayarlar", icon: <Settings className="h-4 w-4" />, action: () => router.push("/ayarlar") },
  ];

  const filteredItems = query
    ? items.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()))
    : items;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] sm:pt-[25vh]">
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-xl border bg-card text-card-foreground shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Ne arıyorsunuz? (Sayfa, modül...)"
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto p-2">
          {filteredItems.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">Sonuç bulunamadı.</p>
          ) : (
            filteredItems.map((item, index) => (
              <button
                key={index}
                className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none hover:bg-muted hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 transition-colors"
                onClick={() => {
                  item.action();
                  setOpen(false);
                }}
              >
                <div className="mr-2 flex h-4 w-4 items-center justify-center">
                  {item.icon}
                </div>
                <span>{item.name}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
