"use client";

import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Bot, Inbox, CheckCircle2, ShieldCheck, Power, RefreshCw, Trash2, FileCheck2, MessageSquare, ArrowLeft, Image as ImageIcon } from "lucide-react";
import { convertFileSrc } from '@tauri-apps/api/core';
import { useToast } from "@/components/ui/toast";

export default function TelegramPanel() {
  const [tab, setTab] = useState("settings");
  const [botToken, setBotToken] = useState("");
  const [isWorkerRunning, setIsWorkerRunning] = useState(false);
  const [bots, setBots] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const { addToast: toast } = useToast();

  const loadData = async () => {
    try {
      const b: any = await invoke("list_telegram_bots");
      setBots(b);
      const r: any = await invoke("list_telegram_requests");
      setRequests(r);
      const u: any = await invoke("list_telegram_users");
      setUsers(u);
      const d: any = await invoke("list_telegram_drafts");
      setDrafts(d);
      const status: boolean = await invoke("get_telegram_worker_status");
      setIsWorkerRunning(status);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
    let unlisten: any;
    listen("telegram_update", () => {
      loadData();
      if (selectedUser) {
        loadMessages(selectedUser.telegram_user_id);
      }
    }).then(u => { unlisten = u; });
    return () => { if (unlisten) unlisten(); };
  }, [selectedUser]);

  const loadMessages = async (userId: string) => {
    try {
      const msgs: any = await invoke("list_telegram_messages", { telegramUserId: userId });
      setMessages(msgs);
    } catch (e) {
      console.error(e);
    }
  };

  const openChat = (user: any) => {
    setSelectedUser(user);
    loadMessages(user.telegram_user_id);
  };

  const handleSaveBot = async () => {
    try {
      await invoke("save_telegram_bot", { botToken });
      setBotToken("");
      loadData();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Hata", description: e.toString() });
    }
  };

  const handleToggleWorker = async () => {
    try {
      if (isWorkerRunning) {
        await invoke("stop_telegram_worker");
      } else {
        await invoke("start_telegram_worker");
      }
      loadData();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Hata", description: e.toString() });
    }
  };

  const handleApproveRequest = async (id: string) => {
    try {
      await invoke("update_telegram_request_status", { id, status: "approved" });
      loadData();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Hata", description: e.toString() });
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-zinc-50 p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Telegram Entegrasyonu</h1>
          <p className="text-sm text-zinc-500">Telegram botunuzu bağlayın ve saha verilerini anında içeri aktarın.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${isWorkerRunning ? 'bg-green-100 text-green-700' : 'bg-zinc-200 text-zinc-600'}`}>
            <div className={`h-2 w-2 rounded-full ${isWorkerRunning ? 'bg-green-500 animate-pulse' : 'bg-zinc-400'}`}></div>
            {isWorkerRunning ? "Bağlı ve Dinliyor" : "Çevrimdışı"}
          </div>
          <button onClick={handleToggleWorker} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${isWorkerRunning ? 'bg-red-600 hover:bg-red-700' : 'bg-zinc-900 hover:bg-zinc-800'}`}>
            <Power size={16} />
            {isWorkerRunning ? "Durdur" : "Başlat"}
          </button>
        </div>
      </div>

      <div className="mb-6 flex gap-2 border-b border-zinc-200 pb-2">
        {[
          { id: "settings", label: "Ayarlar", icon: ShieldCheck },
          { id: "requests", label: "Mesaj İstekleri", icon: Inbox },
          { id: "users", label: "Onaylı Kullanıcılar", icon: CheckCircle2 },
          { id: "drafts", label: "Veri Taslakları", icon: FileCheck2 },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? "bg-zinc-100 text-zinc-900" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
            }`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        {tab === "settings" && (
          <div className="max-w-xl space-y-6">
            <div>
              <h3 className="text-lg font-medium text-zinc-900">Bot Token Ekle</h3>
              <p className="text-sm text-zinc-500 mb-4">BotFather'dan aldığınız HTTP API token'ını buraya girin.</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  
                  className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                />
                <button onClick={handleSaveBot} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
                  Kaydet
                </button>
              </div>
            </div>
            
            <div className="mt-8">
              <h3 className="text-lg font-medium text-zinc-900 mb-4">Kayıtlı Botlar</h3>
              {bots.length === 0 ? (
                <p className="text-sm text-zinc-500">Henüz kayıtlı bot yok.</p>
              ) : (
                <div className="space-y-3">
                  {bots.map(b => (
                    <div key={b.id} className="flex items-center justify-between rounded-lg border border-zinc-200 p-3">
                      <div className="flex items-center gap-3">
                        <Bot className="text-zinc-400" />
                        <div>
                          <p className="text-sm font-medium text-zinc-900">Bot Token: {b.bot_token.substring(0, 10)}...</p>
                          <p className="text-xs text-zinc-500">Durum: {b.status}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => invoke("delete_telegram_bot", { id: b.id }).then(loadData)}
                        className="text-red-500 hover:text-red-700 p-2"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "requests" && (
          <div className="space-y-4">
            {requests.filter(r => r.status === "pending").length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                <Inbox size={48} className="mb-4 text-zinc-300" />
                <p>Onay bekleyen mesaj isteği yok.</p>
              </div>
            ) : (
              requests.filter(r => r.status === "pending").map((req) => (
                <div key={req.id} className="flex items-start justify-between rounded-lg border border-zinc-200 p-4">
                  <div>
                    <h4 className="font-medium text-zinc-900">{req.display_name || req.username || req.telegram_user_id}</h4>
                    <p className="text-sm text-zinc-500 mb-2">@{req.username} | ID: {req.telegram_user_id}</p>
                    <div className="rounded-md bg-zinc-50 p-3 text-sm text-zinc-700">
                      "{req.text}"
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleApproveRequest(req.id)} className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800">
                      Onayla
                    </button>
                    <button onClick={() => invoke("update_telegram_request_status", { id: req.id, status: "rejected" }).then(loadData)} className="rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-200">
                      Reddet
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "users" && (
          <div className="space-y-4">
            {selectedUser ? (
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-3 border-b border-zinc-200 pb-4 mb-4">
                  <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                    <ArrowLeft size={20} className="text-zinc-600" />
                  </button>
                  <div>
                    <h3 className="font-semibold text-zinc-900">{selectedUser.first_name} {selectedUser.last_name} ile Sohbet</h3>
                    <p className="text-sm text-zinc-500">@{selectedUser.username}</p>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-4 min-h-[400px]">
                  {messages.length === 0 ? (
                    <p className="text-sm text-zinc-500 text-center py-8">Henüz mesaj yok.</p>
                  ) : (
                    messages.map(m => (
                      <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${m.role === 'user' ? 'bg-zinc-100 text-zinc-900 rounded-tl-sm' : 'bg-blue-600 text-white rounded-tr-sm'}`}>
                          {m.media_path && (
                            <div className="mb-2">
                              <img 
                                src={convertFileSrc(m.media_path)} 
                                alt="Görsel" 
                                className="max-w-[200px] max-h-[200px] rounded-lg object-contain bg-black/5" 
                              />
                            </div>
                          )}
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</p>
                          <p className={`text-[10px] mt-1 ${m.role === 'user' ? 'text-zinc-500' : 'text-blue-200'}`}>{new Date(m.created_at).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <>
                {users.length === 0 ? (
                  <p className="text-sm text-zinc-500">Henüz sohbet eden kullanıcı yok.</p>
                ) : (
                  users.map(u => (
                    <div key={u.id} className="flex items-center justify-between rounded-lg border border-zinc-200 p-4">
                      <div>
                        <h4 className="font-medium text-zinc-900">{u.first_name} {u.last_name}</h4>
                        <p className="text-sm text-zinc-500">@{u.username} | Mesaj Sayısı: {u.message_count}</p>
                      </div>
                      <button 
                        onClick={() => openChat(u)} 
                        className="flex items-center gap-2 rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
                      >
                        <MessageSquare size={16} />
                        Sohbeti Gör
                      </button>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        )}
        
        {tab === "drafts" && (
          <div className="space-y-4">
            {drafts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                <FileCheck2 size={48} className="mb-4 text-zinc-300" />
                <p>Onay bekleyen veri taslağı yok.</p>
              </div>
            ) : (
              drafts.map(d => (
                <div key={d.id} className="flex items-start justify-between rounded-lg border border-zinc-200 p-4">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">{d.target_module}</span>
                      <h4 className="font-medium text-zinc-900">{d.title}</h4>
                    </div>
                    <p className="text-sm text-zinc-500">JSON: {d.payload_json}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => invoke("process_telegram_draft", { id: d.id }).then(loadData).catch((err: any) => toast({ variant: "destructive", title: "Hata", description: err.toString() }))} className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800">
                      İşle ve Kaydet
                    </button>
                    <button onClick={() => invoke("delete_telegram_draft", { id: d.id }).then(loadData)} className="rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-200">
                      Sil
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
