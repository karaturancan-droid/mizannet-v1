"use client";

import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ChevronsUpDown, Plus, Check, Briefcase, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Workspace {
  id: string;
  name: string;
  db_file: string;
}

export function WorkspaceSwitcher() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchWorkspaces = async () => {
    try {
      const wlist: Workspace[] = await invoke("list_workspaces");
      setWorkspaces(wlist);
      
      const savedId = localStorage.getItem("activeWorkspaceId");
      if (savedId) {
        const found = wlist.find(w => w.id === savedId);
        if (found) {
          setActiveWorkspace(found);
          await invoke("switch_workspace", { workspaceId: found.id });
          return;
        }
      }
      // default
      if (wlist.length > 0) {
        setActiveWorkspace(wlist[0]);
        await invoke("switch_workspace", { workspaceId: wlist[0].id });
        localStorage.setItem("activeWorkspaceId", wlist[0].id);
      }
    } catch (err) {
      console.error("Failed to load workspaces", err);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSwitch = async (w: Workspace) => {
    setIsOpen(false);
    if (w.id === activeWorkspace?.id) return;
    try {
      await invoke("switch_workspace", { workspaceId: w.id });
      setActiveWorkspace(w);
      localStorage.setItem("activeWorkspaceId", w.id);
      window.location.reload();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (e: React.MouseEvent, w: Workspace) => {
    e.stopPropagation();
    if (!confirm(`"${w.name}" adlı işletmeyi silmek istediğinize emin misiniz?`)) return;
    try {
      await invoke("delete_workspace", { workspaceId: w.id });
      await fetchWorkspaces();
      if (activeWorkspace?.id === w.id) {
        window.location.reload(); // switch to default by reloading
      }
    } catch (err: any) {
      console.error(err);
      alert("Hata: " + (err.toString() || "İşletme silinemedi!"));
    }
  };

  const [isCreating, setIsCreating] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");

  const handleCreateSubmit = async () => {
    if (!newWorkspaceName.trim()) {
      setIsCreating(false);
      return;
    }
    try {
      const nw: Workspace = await invoke("create_workspace", { name: newWorkspaceName.trim() });
      await fetchWorkspaces();
      await invoke("switch_workspace", { workspaceId: nw.id });
      setActiveWorkspace(nw);
      localStorage.setItem("activeWorkspaceId", nw.id);
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      alert("Hata: " + (err.toString() || "İşletme oluşturulamadı!"));
    } finally {
      setIsCreating(false);
      setNewWorkspaceName("");
    }
  };

  const CreateModal = () => {
    if (!isCreating) return null;
    return (
      <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900">Yeni İşletme Ekle</h2>
          </div>
          <p className="text-sm text-zinc-500 mb-6 pl-13">MizanNet üzerinde tamamen bağımsız yeni bir işletme profili oluşturun. Verileri diğer işletmelerden ayrı tutulur.</p>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-zinc-700 block mb-1.5">İşletme Adı</label>
              <input 
                type="text" 
                autoFocus
                
                className="w-full bg-zinc-50 text-zinc-900 rounded-xl px-4 py-3 text-sm outline-none border border-zinc-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all" 
                value={newWorkspaceName} 
                onChange={e => setNewWorkspaceName(e.target.value)} 
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreateSubmit();
                  if (e.key === 'Escape') setIsCreating(false);
                }}
              />
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <button 
                onClick={() => setIsCreating(false)} 
                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                İptal
              </button>
              <button 
                onClick={handleCreateSubmit} 
                disabled={!newWorkspaceName.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all flex items-center gap-2"
              >
                Oluştur
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="relative mt-4 mb-2" ref={dropdownRef}>
      {/* Trigger Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex flex-col items-start bg-[var(--sidebar-muted)] border border-white/10 rounded-xl p-3 hover:bg-white/10 transition-all cursor-pointer w-full relative text-left group"
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-[10px] uppercase text-white/50 font-semibold tracking-wider">Aktif İşletme</span>
          <ChevronsUpDown className="h-3.5 w-3.5 text-white/40 group-hover:text-white/80 transition-colors" />
        </div>
        <div className="flex items-center gap-2 mt-1 w-full">
          <Briefcase className="w-4 h-4 text-blue-400 shrink-0" />
          <span className="text-white font-medium text-sm truncate pr-4">
            {activeWorkspace?.name || "İşletme Seçilmedi"}
          </span>
        </div>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 bg-[#1a1b1e] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50 flex flex-col"
          >
            <div className="max-h-[200px] overflow-y-auto p-1 custom-scrollbar">
              {workspaces.map(w => (
                <div
                  key={w.id}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center justify-between transition-colors group/item ${
                    activeWorkspace?.id === w.id 
                      ? "bg-blue-500/10 text-blue-400 font-medium" 
                      : "text-white/80 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <button onClick={() => handleSwitch(w)} className="flex-1 truncate pr-2 flex items-center justify-between h-full text-left">
                    <span className="truncate">{w.name}</span>
                    {activeWorkspace?.id === w.id && <Check className="w-4 h-4 shrink-0 mr-2" />}
                  </button>
                  <button 
                    onClick={(e) => handleDelete(e, w)}
                    className="p-1.5 text-zinc-500 hover:text-red-400 opacity-0 group-hover/item:opacity-100 transition-all rounded hover:bg-red-500/10"
                    title="İşletmeyi Sil"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            
            <div className="p-1 border-t border-white/5 bg-black/20">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsCreating(true);
                }}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center gap-2 text-white/90 hover:bg-white/10 transition-colors group"
              >
                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                </div>
                <span className="font-medium">Yeni İşletme Ekle</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CreateModal />
    </div>
  );
}
