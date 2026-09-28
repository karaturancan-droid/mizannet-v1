"use client";

import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Bot, Clock, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface WhatsAppApproval {
  id: string;
  sender_number: string;
  sender_name: string | null;
  original_message: string;
  suggested_action: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export function WhatsAppApprovals() {
  const [approvals, setApprovals] = useState<WhatsAppApproval[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApprovals = async () => {
    try {
      const count = await invoke<number>("sync_whatsapp_messages");
      if (count > 0) {
        toast.info(`${count} yeni mesaj kuyruğa alındı, yapay zeka arka planda inceliyor...`);
      }
      const res: WhatsAppApproval[] = await invoke("get_whatsapp_approvals");
      setApprovals(res || []);
    } catch (err) {
      console.error("Failed to fetch WhatsApp approvals:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
    
    // Fallback polling for status
        
    // AI analizi bittiğinde gerçek zamanlı tetikleme
    let unlistenFn: (() => void) | undefined;
    listen("whatsapp_approval_ready", () => {
      fetchApprovals();
    }).then((unlisten) => {
      unlistenFn = unlisten;
    });

    return () => {
      
      if (unlistenFn) unlistenFn();
    };
  }, []);

  const handleApprove = async (approval: WhatsAppApproval) => {
    try {
      if (!approval.suggested_action) return;
      const action = JSON.parse(approval.suggested_action);
      
      if (action.type === "import_data") {
        await invoke("import_analyzed_data", {
          entity_type: action.payload.entity_type || "ledger_entry",
          items: action.payload.items || [action.payload]
        });
      }

      await invoke("update_whatsapp_approval", { id: approval.id, status: "approved" });
      toast.success("Mesaj onaylandı ve sisteme işlendi.");
      fetchApprovals();
    } catch (err: any) {
      toast.error("Onaylama hatası: " + err);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await invoke("update_whatsapp_approval", { id, status: "rejected" });
      toast.success("Mesaj reddedildi.");
      fetchApprovals();
    } catch (err: any) {
      toast.error("Reddetme hatası: " + err);
    }
  };

  if (loading && approvals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
        <Clock className="w-8 h-8 animate-spin mb-4" />
        <p>Onay bekleyen mesajlar yükleniyor...</p>
      </div>
    );
  }

  const pendingApprovals = approvals.filter(a => a.status === "pending");

  if (pendingApprovals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-dashed text-muted-foreground">
        <Check className="w-12 h-12 text-green-500 mb-4 opacity-50" />
        <h3 className="text-lg font-medium text-foreground">Tüm Mesajlar İşlendi</h3>
        <p className="text-sm mt-1">Şu anda yapay zeka onayı bekleyen yeni bir WhatsApp mesajı bulunmuyor.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Bot className="w-6 h-6 text-primary" />
          Yapay Zeka Onay Kuyruğu
          <Badge variant="secondary" className="ml-2 rounded-full text-sm">
            {pendingApprovals.length}
          </Badge>
        </h3>
        <Button variant="outline" size="sm" onClick={fetchApprovals} className="h-8">
          <RefreshCw className="w-3 h-3 mr-2" />
          Yenile
        </Button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        {pendingApprovals.map((approval) => {
          let parsedAction = null;
          try {
            if (approval.suggested_action) {
              parsedAction = JSON.parse(approval.suggested_action);
            }
          } catch (e) {}

          return (
            <Card key={approval.id} className="overflow-hidden flex flex-col border-2 border-primary/20 hover:border-primary/50 transition-colors">
              <CardHeader className="bg-muted/30 pb-4 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base font-semibold">{approval.sender_name || "Bilinmeyen Kişi"}</CardTitle>
                    <CardDescription className="text-xs font-mono mt-1">{approval.sender_number}</CardDescription>
                  </div>
                  <div className="text-xs text-muted-foreground bg-white px-2 py-1 rounded-md border shadow-sm">
                    {new Date(approval.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 flex-1">
                <div className="mb-4">
                  <div className="text-[10px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">Orijinal Mesaj</div>
                  <div className="bg-white p-3 rounded-lg text-sm border shadow-sm">
                    "{approval.original_message}"
                  </div>
                </div>
                
                {parsedAction ? (
                  <div>
                    <div className="text-[10px] font-bold text-blue-600 mb-1 uppercase tracking-wider flex items-center gap-1">
                      <Bot className="w-3 h-3" />
                      Yapay Zeka Çıkarımı
                    </div>
                    <div className="bg-blue-50/50 text-blue-900 p-3 rounded-lg text-sm border border-blue-200 shadow-sm">
                      <strong className="text-blue-700">İşlem:</strong> {parsedAction.description || "Veri İçe Aktarma"}<br />
                      {parsedAction.payload?.entity_type === "ledger_entry" && (
                         <span className="text-xs mt-2 inline-block bg-white px-2 py-1 rounded border opacity-90 font-medium">
                           Tutar: {parsedAction.payload.items?.[0]?.total || parsedAction.payload.total} TL
                         </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100 shadow-sm">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span>Yapay zeka bu mesajdan net bir muhasebe işlemi çıkaramadı. Bilgi amaçlıdır.</span>
                  </div>
                )}
              </CardContent>
              <CardFooter className="bg-muted/10 border-t p-3 flex gap-2">
                <Button 
                  className="flex-1 font-semibold" 
                  variant="default" 
                  onClick={() => handleApprove(approval)}
                  disabled={!parsedAction}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Onayla ve İşle
                </Button>
                <Button 
                  className="flex-1" 
                  variant="outline" 
                  onClick={() => handleReject(approval.id)}
                >
                  <X className="w-4 h-4 mr-2" />
                  Reddet
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
