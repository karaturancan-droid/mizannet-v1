const fs = require('fs');

const code = `"use client";

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

interface DocumentItem {
  id?: string;
  title: string;
  content: string;
  source: string;
}

export default function BilgiBankasiPage() {
  const [data, setData] = useState<RehberData | null>(null);
  const [activeTabId, setActiveTabId] = useState<string>("vergi");
  const [searchQuery, setSearchQuery] = useState("");
  const [fullData, setFullData] = useState<DocumentItem[] | null>(null);
  const [loadingFull, setLoadingFull] = useState(false);
  const [allDocs, setAllDocs] = useState<DocumentItem[]>([]);

  // Load categories
  useEffect(() => {
    fetch("/data/rehber.json")
      .then(res => res.json())
      .then((json: RehberData) => {
        setData(json);
      })
      .catch(err => console.error("Rehber verisi yuklenemedi", err));
      
    // Preload all documents for global search
    Promise.all([
      fetch("/data/vuk.json").then(r => r.json()).catch(() => []),
      fetch("/data/tekduzen.json").then(r => r.json()).catch(() => []),
      fetch("/data/is_kanunu.json").then(r => r.json()).catch(() => [])
    ]).then(([vuk, tekduzen, is]) => {
      const combined = [
        ...(Array.isArray(vuk) ? vuk.map(i => ({...i, source: "Vergi Mevzuatı"})) : []),
        ...(Array.isArray(tekduzen) ? tekduzen.map(i => ({...i, source: "Muhasebe Standartları"})) : []),
        ...(Array.isArray(is) ? is.map(i => ({...i, source: "İş Kanunu"})) : [])
      ];
      setAllDocs(combined);
    });
  }, []);

  // Load specific category data when not searching
  useEffect(() => {
    setFullData(null);
    if (searchQuery.trim().length > 0) return; // Use global search instead
    
    let url = "";
    let sourceName = "";
    if (activeTabId === "vergi") { url = "/data/vuk.json"; sourceName = "Vergi Mevzuatı"; }
    else if (activeTabId === "muhasebe") { url = "/data/tekduzen.json"; sourceName = "Muhasebe Standartları"; }
    else if (activeTabId === "isci") { url = "/data/is_kanunu.json"; sourceName = "İş Kanunu"; }

    if (url) {
      setLoadingFull(true);
      fetch(url)
        .then(res => res.json())
        .then(json => {
          if (Array.isArray(json)) setFullData(json.map(i => ({...i, source: sourceName})));
        })
        .catch(err => console.error("Tam metin yuklenemedi", err))
        .finally(() => setLoadingFull(false));
    }
  }, [activeTabId, searchQuery]);

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

  // Global search filtering
  const searchResults = searchQuery.trim().length > 0 
    ? allDocs.filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(\`(\${query})\`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() ? 
        <mark key={i} className="bg-yellow-300 text-black px-1 rounded font-bold shadow-sm">{part}</mark> : 
        part
    );
  };

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
            placeholder="Mevzuatta tüm belgelerde ara..." 
            className="pl-9 bg-white border-2 border-primary/20 focus:border-primary transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0">
        {/* Sol Menü - Konular */}
        {!searchQuery && (
          <div className="w-full md:w-64 shrink-0 flex flex-col gap-2 overflow-y-auto pr-2">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-2">Kategoriler</div>
            {data.categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveTabId(cat.id)}
                className={\`flex items-center gap-3 p-3 rounded-xl transition-all text-left \${
                  activeTabId === cat.id 
                    ? "bg-primary text-primary-foreground shadow-md font-medium" 
                    : "bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200"
                }\`}
              >
                {getIcon(cat.icon)}
                <span className="flex-1 text-sm leading-tight">{cat.title}</span>
                {activeTabId === cat.id && <ChevronRight className="w-4 h-4 opacity-70" />}
              </button>
            ))}
          </div>
        )}

        {/* Orta Panel - İçerik */}
        <div className={\`flex-1 bg-white border border-border rounded-2xl p-6 md:p-8 overflow-y-auto shadow-sm prose prose-zinc max-w-none \${searchQuery ? 'w-full' : ''}\`}>
          
          {searchQuery.trim().length > 0 ? (
            <div>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-primary">
                <Search className="w-6 h-6" />
                Arama Sonuçları: "{searchQuery}"
              </h2>
              <div className="mb-4 text-sm text-muted-foreground">Tüm dokümanlarda {searchResults.length} sonuç bulundu.</div>
              
              <div className="space-y-6">
                {searchResults.map((item, i) => (
                  <div key={i} className="bg-zinc-50 p-6 rounded-xl border border-zinc-200 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-lg font-bold text-zinc-900 mt-0 mb-0">
                        {highlightText(item.title, searchQuery)}
                      </h3>
                      <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-1 rounded-md">
                        {item.source}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed m-0">
                      {highlightText(item.content, searchQuery)}
                    </p>
                  </div>
                ))}
                {searchResults.length === 0 && (
                  <div className="text-center py-12">
                    <Search className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-zinc-900">Sonuç Bulunamadı</h3>
                    <p className="text-zinc-500">Aradığınız kelimeye uygun bir içerik veritabanında yok.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div dangerouslySetInnerHTML={{ __html: activeCategory.content }} />
              
              {loadingFull && <div className="mt-8 text-center text-muted-foreground animate-pulse">Tam metin yükleniyor...</div>}
              
              {fullData && fullData.length > 0 && (
                <div className="mt-12 pt-8 border-t border-border">
                  <h2 className="text-2xl font-bold mb-6">Kanun Tam Metni / Detaylı Liste</h2>
                  <div className="space-y-8">
                    {fullData.map((item, i) => (
                      <div key={item.id || i} className="bg-zinc-50 p-6 rounded-xl border border-zinc-100">
                        <h3 className="text-lg font-bold text-zinc-900 mt-0 mb-3">{item.title}</h3>
                        <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed m-0">
                          {item.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Sağ Panel - Öne Çıkanlar (Sadece arama yokken görünür) */}
        {!searchQuery && (
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
        )}
      </div>
    </div>
  );
}
`;

fs.writeFileSync('src/app/rehber/page.tsx', code);
