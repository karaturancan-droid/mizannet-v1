"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, PanelLeft, Search, Sparkles, FileText, Users, Car, Settings, Calendar, Calculator, Box } from "lucide-react";
import { Sidebar } from "./sidebar";
import { AssistantButton } from "./assistant-button";
import { ROUTE_TITLES } from "./nav-items";
import { ToastProvider } from "@/components/ui/toast";
import { CommandPalette } from "./command-palette";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { WeatherWidget } from "./weather-widget";
import { useBildirimler } from "@/hooks/use-bildirimler";
import { useAyarlar } from "@/hooks/use-ayarlar";
import { useBranch } from "@/contexts/BranchContext";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const title = ROUTE_TITLES[pathname ?? ""] ?? "MizanNet";
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [licenseType] = useState("Sınırsız Kart (All-Access Pass)");

  const { notifications } = useBildirimler();
  const { settings, loadAllSettings } = useAyarlar();
  const { branches, activeBranchId, setActiveBranchId } = useBranch();
  const unreadCount = notifications.filter(n => n.status === 'aktif').length;
  const userName = settings?.contact_person?.split(' ')[0] || settings?.company_name || "";
  
  const [isSetupComplete, setIsSetupComplete] = useState<boolean | null>(null);

  useEffect(() => {
    loadAllSettings().then(s => {
      setIsSetupComplete(s.setup_complete === "true");
    });
  }, [loadAllSettings]);

  const searchItems = [
    { name: "Yeni Fatura Ekle (Asistan)", icon: <FileText className="h-4 w-4" />, action: () => router.push("/asistan") },
    { name: "Cari Hesaplar", icon: <Users className="h-4 w-4" />, action: () => router.push("/cari") },
    { name: "Belge Arşivi", icon: <FileText className="h-4 w-4" />, action: () => router.push("/belgeler") },
    { name: "Araç Yönetimi", icon: <Car className="h-4 w-4" />, action: () => router.push("/araclar") },
    { name: "Depo / Stok", icon: <Box className="h-4 w-4" />, action: () => router.push("/depo") },
    { name: "Takvim", icon: <Calendar className="h-4 w-4" />, action: () => router.push("/takvim") },
    { name: "Vergi / SGK", icon: <Calculator className="h-4 w-4" />, action: () => router.push("/vergi") },
    { name: "Ayarlar", icon: <Settings className="h-4 w-4" />, action: () => router.push("/ayarlar") },
  ];

  const filteredSearchItems = searchQuery
    ? searchItems.filter((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer?.types.includes("Files")) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.type.startsWith('image/') || file.type === 'application/pdf') {
          // Convert to base64 and store in localStorage briefly
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') {
              localStorage.setItem('pendingAssistantFile', reader.result);
              router.push('/asistan');
            }
          };
          reader.readAsDataURL(file);
        }
      }
    };

    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, [router]);

  const isAuthPage = pathname?.startsWith("/login") || pathname?.startsWith("/expired");
  if (isAuthPage) {
    return <ToastProvider>{children}</ToastProvider>;
  }

  return (
    <ToastProvider>
      {isSetupComplete === false && (
        <OnboardingWizard onComplete={() => window.location.reload()} />
      )}
      <div className="flex h-screen w-screen overflow-hidden bg-[#f3f4f6] p-2 md:p-3 gap-3">
        {/* Geniş ekranlarda sabit kenar çubuğu */}
        <div 
          className={`hidden md:block transition-all duration-300 overflow-hidden bg-[#18181b] rounded-3xl ${
            sidebarCollapsed ? "w-[80px]" : "w-[260px]"
          }`}
        >
          <div className="h-full w-full">
            <Sidebar 
              isCollapsed={sidebarCollapsed} 
              onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} 
            />
          </div>
        </div>

        {/* Dar ekranlarda açılır kenar çubuğu (drawer) */}
        <div
          className={`fixed inset-0 z-50 md:hidden transition-opacity duration-200 ${
            drawerOpen
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0"
          }`}
        >
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            className={`absolute left-0 top-0 h-full p-2 transition-transform duration-200 ${
              drawerOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="relative h-full w-[260px] bg-[#18181b] rounded-3xl overflow-hidden shadow-2xl">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Menüyü kapat"
                className="absolute right-[-2.5rem] top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white text-black shadow-lg"
              >
                <X className="h-4 w-4" />
              </button>
              <Sidebar 
                onNavigate={() => setDrawerOpen(false)} 
                isCollapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
              />
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col relative bg-white rounded-3xl shadow-sm border border-black/5 overflow-hidden">
          <header className="flex h-20 shrink-0 items-center gap-4 px-8 pt-4 pb-2">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Menüyü aç"
              className="flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-zinc-100 md:hidden transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex-1 min-w-0 flex flex-col justify-center ml-2">
              <h1 className="text-xl font-bold tracking-tight text-zinc-900 leading-none">Merhaba {userName} 👋</h1>
              <p className="text-sm text-zinc-500 font-medium mt-1">Tekrar hoş geldiniz!</p>
            </div>
            
            <div className="hidden lg:flex items-center justify-center mr-2">
              <div className="relative group overflow-hidden rounded-full p-[1px] shadow-sm cursor-default">
                <span className="absolute inset-0 bg-gradient-to-r from-yellow-300 via-amber-500 to-yellow-300 rounded-full animate-[spin_3s_linear_infinite] opacity-80 group-hover:opacity-100 transition-opacity duration-300"></span>
                <div className="relative flex items-center gap-1.5 bg-gradient-to-r from-zinc-900 to-zinc-800 px-3 py-1.5 rounded-full text-[11px] font-bold text-amber-300 tracking-wide">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
                  {licenseType}
                </div>
              </div>
            </div>

            {/* Branch Switcher */}
            <div className="flex items-center ml-2">
              <select 
                className="bg-zinc-100 border border-zinc-200 text-zinc-700 text-sm rounded-lg px-3 py-1.5 focus:ring-primary focus:border-primary outline-none cursor-pointer font-medium"
                value={activeBranchId || "all"}
                onChange={(e) => setActiveBranchId(e.target.value === "all" ? null : e.target.value)}
              >
                <option value="all">🏢 Tüm Şubeler</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>📍 {b.name}</option>
                ))}
              </select>
            </div>

            <div className="relative hidden md:flex flex-1 max-w-md mx-4">
              <div className="flex items-center bg-zinc-100 rounded-full px-4 py-2 border border-zinc-200 shadow-inner w-full transition-all focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/20">
                <Search className="w-4 h-4 text-zinc-400 mr-2" />
                <input 
                  type="text" 
                   
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                  className="bg-transparent border-none outline-none text-sm w-full text-zinc-700 placeholder:text-zinc-400" 
                />
              </div>
              
              {isSearchFocused && searchQuery && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-zinc-100 py-2 z-50 flex flex-col max-h-[300px] overflow-y-auto overflow-x-hidden transform origin-top animate-in fade-in slide-in-from-top-2 duration-200">
                  {filteredSearchItems.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-zinc-500 text-center">Sonuç bulunamadı</div>
                  ) : (
                    filteredSearchItems.map((item, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          item.action();
                          setSearchQuery("");
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 text-left transition-colors mx-2 rounded-lg"
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-100 text-zinc-600">
                          {item.icon}
                        </div>
                        <span className="text-sm font-medium text-zinc-700">{item.name}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push('/bildirimler')}
                className="relative flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-orange-500 hover:bg-orange-200 transition-colors"
                title="Bildirimler"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              
              <WeatherWidget />
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6 md:pt-4 relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="h-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
            {isDragging && (
              <div className="absolute inset-0 z-50 bg-primary/20 backdrop-blur-sm border-4 border-dashed border-primary rounded-3xl m-4 flex items-center justify-center pointer-events-none">
                <div className="bg-white p-8 rounded-2xl shadow-2xl text-center flex flex-col items-center animate-in zoom-in duration-300">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                  </div>
                  <h2 className="text-2xl font-bold mb-2 tracking-tight">Asistan'a Bırakın</h2>
                  <p className="text-muted-foreground text-lg">Fatura, fiş veya belgeyi işlemek için buraya bırakın.</p>
                </div>
              </div>
            )}
          </main>
        </div>

        <AssistantButton />
        <CommandPalette />
      </div>
    </ToastProvider>
  );
}
