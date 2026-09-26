"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { getNavItems, type NavItem } from "./nav-items";
import { useAyarlar } from "@/hooks/use-ayarlar";
import { useBildirimler } from "@/hooks/use-bildirimler";
import { invoke } from "@tauri-apps/api/core";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { User, LogOut, PanelLeft } from "lucide-react";

interface SidebarProps {
  onNavigate?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ onNavigate, isCollapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const { loadAllSettings } = useAyarlar();
  const { notifications, loadNotifications } = useBildirimler();
  const [companyName, setCompanyName] = useState<string>("");
  const [taxNo, setTaxNo] = useState<string>("");
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [profileImage, setProfileImage] = useState<string>("");
  const [isAiActive, setIsAiActive] = useState(false);

  const unreadCount = notifications.filter((n) => n.status === 'aktif').length;

  useEffect(() => {
    const checkAiStatus = async (provider: string | undefined) => {
      if (provider === "local") {
        try {
          const isRunning = await invoke<boolean>("check_local_ai_running");
          setIsAiActive(isRunning);
        } catch {
          setIsAiActive(false);
        }
      } else {
        setIsAiActive(navigator.onLine);
      }
    };

    const loadSettings = async () => {
      try {
        const settings = await loadAllSettings();
        setCompanyName(settings.company_name || "");
        setTaxNo(settings.tax_no || "");
        setProfileImage(settings.profile_image || "");
        setNavItems(getNavItems(settings.industry_type));
        checkAiStatus(settings.ai_provider);
      } catch {
        setNavItems(getNavItems());
      }
    };

    loadSettings();
    loadNotifications().catch(() => {});
    window.addEventListener("settings-changed", loadSettings);
    
    const updateOnlineStatus = () => {
      loadAllSettings().then(s => checkAiStatus(s.ai_provider)).catch(() => {});
    };
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    
    // Periyodik olarak yerel AI durumunu kontrol et
    const interval = setInterval(() => {
      loadAllSettings().then(s => checkAiStatus(s.ai_provider)).catch(() => {});
    }, 5000);

    return () => {
      window.removeEventListener("settings-changed", loadSettings);
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
      clearInterval(interval);
    };
  }, [loadAllSettings, loadNotifications]);

  return (
    <div className="flex h-full w-full flex-col bg-transparent text-white relative z-10 py-4">
      <div className={cn("p-4 pb-2 pt-2", isCollapsed ? "flex flex-col items-center" : "")}>
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={cn("flex items-center mb-6", isCollapsed ? "justify-center mt-2" : "gap-3 px-2")}
        >
          <div className={cn("relative w-10 h-10 flex items-center justify-center", isCollapsed ? "bg-white rounded-full p-2 w-12 h-12" : "")}>
            <Image src="/logo.svg" alt="MizanNet Logo" fill className={cn("object-contain relative z-10", isCollapsed ? "p-2" : "drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]")} priority fetchPriority="high" />
            {!isCollapsed && <div className="absolute inset-0 bg-white/20 blur-xl rounded-full" />}
          </div>
          {!isCollapsed && <span className="font-bold text-xl tracking-tight text-white/95">MIZANNET</span>}
        </motion.div>
        
        {/* Collapse Button under the logo */}
        {onToggleCollapse && (
          <div className={cn("flex mb-4", isCollapsed ? "justify-center" : "justify-end px-2")}>
            <button
              type="button"
              onClick={onToggleCollapse}
              title={isCollapsed ? "Menüyü Aç" : "Menüyü Daralt"}
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          </div>
        )}

        {!isCollapsed && <WorkspaceSwitcher />}
      </div>

      <nav className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-hide">
        <motion.ul 
          className="flex flex-col gap-1.5"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.04 } }
          }}
        >
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname?.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <motion.li 
                key={item.href}
                variants={{
                  hidden: { opacity: 0, x: -10 },
                  visible: { opacity: 1, x: 0 }
                }}
              >
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  title={isCollapsed ? item.label : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-2xl px-3 py-3 text-[14px] font-semibold transition-all duration-300 mx-2",
                    isActive
                      ? "text-black bg-white shadow-md"
                      : "text-zinc-400 hover:text-white hover:bg-white/10",
                    isCollapsed ? "justify-center px-0 mx-1" : ""
                  )}
                >
                  <div className={cn(
                    "relative flex shrink-0 items-center justify-center rounded-xl transition-transform duration-300",
                    isCollapsed ? "h-10 w-10 group-hover:scale-110" : "h-8 w-8 group-hover:scale-110",
                    isActive 
                      ? "text-black" 
                      : "text-zinc-400 group-hover:text-white"
                  )}>
                    <Icon className={cn("h-5 w-5", isCollapsed && isActive ? "h-6 w-6" : "")} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  {!isCollapsed && <span className="flex-1 relative z-10">{item.label}</span>}
                  {item.href === "/bildirimler" && unreadCount > 0 && !isCollapsed && (
                    <span className="relative z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500/20 px-1.5 text-[10px] font-bold text-blue-300 ring-1 ring-blue-500/30">
                      {unreadCount}
                    </span>
                  )}
                  {item.href === "/bildirimler" && unreadCount > 0 && isCollapsed && (
                    <span className="absolute top-2 right-2 flex h-2 w-2 items-center justify-center rounded-full bg-blue-500">
                    </span>
                  )}
                </Link>
              </motion.li>
            );
          })}
        </motion.ul>
      </nav>

      {!isCollapsed && (
        <div className="relative border-t border-white/10 px-4 py-4 mx-4 mt-2">
          <div className="flex items-center justify-between">
            <p className={cn(
              "text-[9px] tracking-[0.15em] font-semibold uppercase transition-colors flex items-center gap-2",
              isAiActive ? "text-emerald-400" : "text-white/40"
            )}>
              YAPAY ZEKA · {isAiActive ? "ÇEVRİMİÇİ" : "KAPALI"}
              {isAiActive && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse" />}
            </p>
          </div>
        </div>
      )}

      {/* Alt Profil ve Çıkış Alanı */}
      <div className={cn("mt-auto pb-6 px-4 flex", isCollapsed ? "flex-col gap-4 items-center" : "justify-between items-center")}>
        <Link 
          href="/profil" 
          title="Kullanıcı Profili"
          className={cn(
            "flex items-center justify-center bg-white rounded-full transition-transform hover:scale-105 shadow-md",
            isCollapsed ? "w-12 h-12" : "w-10 h-10"
          )}
        >
          {profileImage ? (
            <img src={profileImage} alt="Profil" className="w-full h-full object-cover rounded-full" />
          ) : (
            <User className="text-black w-5 h-5" strokeWidth={2.5} />
          )}
        </Link>
        <Link 
          href="/login" 
          title="Çıkış Yap"
          className="flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5" strokeWidth={2} />
        </Link>
      </div>
    </div>
  );
}
