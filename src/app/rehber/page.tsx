"use client";

import { useState, useEffect } from "react";
import { BookOpen, Scale, FileText, HelpCircle, PhoneCall, FileKey, Search, Landmark, ChevronRight, Hash } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Highlight {
  title: string;
  desc: string;
}

interface Category {
  id: string;
  title: string;
  icon: string;
  content: string;
  highlights: Highlight[];
}

interface RehberData {
  categories: Category[];
}

export default function BilgiBankasiPage() {
  const [data, setData] = useState<RehberData | null>(null);
  const [activeTabId, setActiveTabId] = useState<string>("vergi");
  const [searchQuery, setSearchQuery] = useState("");
  const [fullData, setFullData] = useState<{id: string, title: string, content: string}[] | null>(null);
  const [loadingFull, setLoadingFull] = useState(false);

  useEffect(() => {
    fetch("/data/rehber.json")
      .then(res => res.json())
      .then((json: RehberData) => {
        setData(json);
      })
      .catch(err => console.error("Rehber verisi yüklenemedi", err));
  }, []);

  useEffect(() => {
    setFullData(null);
    let url = "";
    if (activeTabId === "vergi") url = "/data/vuk.json";
    else if (activeTabId === "muhasebe") url = "/data/tekduzen.json";
    else if (activeTabId === "isci") url = "/data/is_kanunu.json";

    if (url) {
      setLoadingFull(true);
      fetch(url)
        .then(res => res.json())
        .then(json => {
          if (Array.isArray(json)) setFullData(json);
        })
        .catch(err => console.error("Tam metin yüklenemedi", err))
        .finally(() => setLoadingFull(false));
    }
  }, [activeTabId]);

  if (!data) {
    return <div className="flex h-full items-center justify-center p-8 text-muted-foreground animate-pulse">Bilgi Bankası Yükleniyor...</div>;
  }

  const activeCategory = data.categories.find(c => c.id === activeTabId) || data.categories[0];


  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "Scale": return <Scale className="w-4 h-4" />;
      case "FileText": return <FileText className="w-4 h-4" />;
      case "HelpCircle": return <HelpCircle className="w-4 h-4" />;
      case "FileKey": return <FileKey className="w-4 h-4" />;
      case "Landmark": return <Landmark className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  // Basit Arama Filtresi (Hem title hem de content içinde arar)
  const filteredCategories = data.categories.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.highlights.some(h => h.title.toLowerCase().includes(searchQuery.toLowerCase()) || h.desc.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Gelişmiş Bilgi Bankası
          </h1>
          <p className="text-muted-foreground mt-1">
            İş kanunu, vergi mevzuatı, muhasebe kodları ve kullanım kılavuzlarında anında arama yapın.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Mevzuatta veya rehberde ara..." 
            className="pl-9 bg-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0">
        {/* Sol Menü - Konular */}
        <div className="w-full md:w-64 shrink-0 flex flex-col gap-2 overflow-y-auto pr-2">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-2">Kategoriler</div>
          {filteredCategories.length === 0 && (
            <div className="text-sm text-muted-foreground px-2">Arama sonucu bulunamadı.</div>
          )}
          {filteredCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveTabId(cat.id)}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                activeTabId === cat.id 
                  ? "bg-primary text-primary-foreground shadow-md font-medium" 
                  : "bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200"
              }`}
            >
              {getIcon(cat.icon)}
              <span className="flex-1 text-sm leading-tight">{cat.title}</span>
              {activeTabId === cat.id && <ChevronRight className="w-4 h-4 opacity-70" />}
            </button>
          ))}
        </div>

        {/* Orta Panel - Ana İçerik */}
        <div className="flex-1 bg-white border border-border rounded-2xl p-6 md:p-8 overflow-y-auto shadow-sm prose prose-zinc max-w-none">
          <div dangerouslySetInnerHTML={{ __html: activeCategory.content }} />
          
          {loadingFull && <div className="mt-8 text-center text-muted-foreground animate-pulse">Tam metin yükleniyor...</div>}
          
          {fullData && fullData.length > 0 && (
            <div className="mt-12 pt-8 border-t border-border">
              <h2 className="text-2xl font-bold mb-6">Kanun Tam Metni / Detaylı Liste</h2>
              <div className="space-y-8">
                {fullData.map((item, i) => (
                  <div key={item.id || i} className="bg-zinc-50 p-6 rounded-xl border border-zinc-100">
                    <h3 className="text-lg font-bold text-zinc-900 mt-0 mb-3">{item.title}</h3>
                    <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed m-0">{item.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sağ Panel - Öne Çıkanlar (Highlights) */}
        <div className="w-full md:w-80 shrink-0 flex flex-col gap-4 overflow-y-auto">
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-200 text-blue-700">!</span>
              İşletmeniz İçin Önemli
            </h3>
            <div className="space-y-4">
              {activeCategory.highlights.map((hi, i) => (
                <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-blue-50/50">
                  <div className="flex items-start gap-2">
                    <Hash className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="font-bold text-sm text-zinc-900 mb-1">{hi.title}</h4>
                      <p className="text-xs text-zinc-600 leading-relaxed">{hi.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-zinc-50 border border-border rounded-2xl p-5 text-center shadow-sm mt-auto">
            <PhoneCall className="w-8 h-8 mx-auto text-zinc-400 mb-3" />
            <h4 className="font-medium text-sm text-zinc-700">Daha fazla yardıma mı ihtiyacınız var?</h4>
            <p className="text-xs text-zinc-500 mt-1 mb-3">MizanNet destek ekibi veya yapay zeka asistanı size yardımcı olabilir.</p>
            <Button variant="outline" className="w-full text-xs font-semibold" onClick={() => window.location.href = '/asistan'}>
              Asistana Sor
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
