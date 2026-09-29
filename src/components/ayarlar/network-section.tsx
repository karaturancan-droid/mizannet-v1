import { useState, useEffect } from "react";
import { useAyarlar } from "@/hooks/use-ayarlar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Network, Server, Laptop, CheckCircle2, RefreshCw, MonitorSmartphone } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { invoke } from "@tauri-apps/api/core";

export function NetworkSection() {
  const { settings, setSetting } = useAyarlar();
  const { addToast } = useToast();
  
  const [networkMode, setNetworkMode] = useState<"standalone" | "server" | "client">("standalone");
  const [serverIp, setServerIp] = useState("");
  const [localIp, setLocalIp] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<{name: string, ip: string, paired: boolean}[]>([]);

  useEffect(() => {
    if (settings.network_mode) {
      setNetworkMode(settings.network_mode as any);
    }
    if (settings.server_ip) {
      setServerIp(settings.server_ip);
    }
    invoke("get_local_ip").then((ip) => setLocalIp(ip as string)).catch(console.error);
  }, [settings]);

  const handleSave = async () => {
    try {
      await setSetting("network_mode", networkMode);
      if (networkMode === "client") {
        await setSetting("server_ip", serverIp);
      }
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
      
      addToast({
        title: "Ağ Ayarları Kaydedildi",
        description: "Değişikliklerin uygulanması için uygulamanın yeniden başlatılması gerekebilir.",
      });
    } catch (error) {
      addToast({
        title: "Hata",
        description: "Ayarlar kaydedilemedi.",
        variant: "destructive",
      });
    }
  };

  const handleScan = () => {
    setIsScanning(true);
    setDiscoveredDevices([]);
    // Sahte (Mock) ağ taraması simülasyonu
    setTimeout(() => {
      setDiscoveredDevices([]);
      setIsScanning(false);
    }, 2000);
  };

  const handlePair = (deviceIp: string) => {
    setServerIp(deviceIp);
    setDiscoveredDevices(prev => 
      prev.map(d => ({ ...d, paired: d.ip === deviceIp }))
    );
    addToast({
      title: "Eşleşme Başarılı",
      description: `${deviceIp} adresli cihaza bağlanıldı.`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="w-5 h-5 text-blue-600" />
          Ağ ve Çoklu Kullanıcı (LAN)
        </CardTitle>
        <CardDescription>
          Aynı ağdaki (Wi-Fi/LAN) diğer cihazlarla veritabanını paylaşın. Bulut olmadan, %100 yerel ve güvenli.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <div 
            className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${networkMode === 'standalone' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
            onClick={() => setNetworkMode('standalone')}
          >
            <div className="flex gap-4">
              <div className={`p-3 rounded-lg ${networkMode === 'standalone' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                <Laptop className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground text-sm">Tekil Kullanıcı</h4>
                <p className="text-xs text-muted-foreground mt-1">Veriler sadece bu cihazda (Offline).</p>
              </div>
            </div>
          </div>

          <div 
            className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${networkMode === 'server' ? 'border-blue-500 bg-blue-50' : 'border-border hover:border-blue-200'}`}
            onClick={() => setNetworkMode('server')}
          >
            <div className="flex gap-4">
              <div className={`p-3 rounded-lg ${networkMode === 'server' ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                <Server className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground text-sm">Ana Makine (Sunucu)</h4>
                <p className="text-xs text-muted-foreground mt-1">Diğer bilgisayarlar bu cihaza bağlanır.</p>
              </div>
            </div>
          </div>

          <div 
            className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${networkMode === 'client' ? 'border-emerald-500 bg-emerald-50' : 'border-border hover:border-emerald-200'}`}
            onClick={() => setNetworkMode('client')}
          >
            <div className="flex gap-4">
              <div className={`p-3 rounded-lg ${networkMode === 'client' ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                <Network className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground text-sm">İstemci (Terminal)</h4>
                <p className="text-xs text-muted-foreground mt-1">Ağdaki başka bir Ana Makineye bağlan.</p>
              </div>
            </div>
          </div>
          
        </div>

        {networkMode === "server" && (
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex flex-col gap-2">
            <h5 className="font-semibold text-blue-900 flex items-center gap-2">
              <Server className="w-4 h-4" /> Ana Makine Yapılandırması
            </h5>
            <p className="text-sm text-blue-700">
              Bu bilgisayar veritabanına ev sahipliği yapacak. Diğer cihazların bağlanması için aşağıdaki IP adresini kullanın:
            </p>
            <div className="flex items-center gap-2 mt-2">
              <code className="bg-white px-3 py-1.5 rounded-lg border border-blue-200 font-bold text-lg text-blue-800 shadow-sm">
                {localIp}:3030
              </code>
              <Button variant="outline" size="sm" className="h-9" onClick={() => navigator.clipboard.writeText(`${localIp}:3030`)}>Kopyala</Button>
            </div>
          </div>
        )}

        {networkMode === "client" && (
          <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex flex-col gap-4">
             <div className="flex justify-between items-center">
               <div>
                 <h5 className="font-semibold text-emerald-900 flex items-center gap-2">
                  <Network className="w-4 h-4" /> Ağdaki Cihazları Bul
                 </h5>
                 <p className="text-sm text-emerald-700">
                  MizanNet Ana Makinesi olarak çalışan cihazları otomatik bulup eşleşebilirsiniz.
                 </p>
               </div>
               <Button onClick={handleScan} disabled={isScanning} variant="outline" className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-100">
                 <RefreshCw className={`w-4 h-4 ${isScanning ? "animate-spin" : ""}`} /> 
                 {isScanning ? "Taranıyor..." : "Ağı Tara"}
               </Button>
             </div>
             
             {discoveredDevices.length > 0 && (
               <div className="bg-white rounded-lg border border-emerald-200 overflow-hidden divide-y divide-emerald-100">
                 {discoveredDevices.map((device, idx) => (
                   <div key={idx} className="p-3 flex items-center justify-between hover:bg-emerald-50/50 transition-colors">
                     <div className="flex items-center gap-3">
                       <div className="bg-emerald-100 p-2 rounded-full text-emerald-600">
                         <MonitorSmartphone className="w-5 h-5" />
                       </div>
                       <div>
                         <div className="font-semibold text-zinc-900">{device.name}</div>
                         <div className="text-xs text-zinc-500 font-mono">{device.ip}</div>
                       </div>
                     </div>
                     <Button 
                       size="sm" 
                       onClick={() => handlePair(device.ip)}
                       className={device.paired ? "bg-emerald-600 hover:bg-emerald-700" : "bg-zinc-800 hover:bg-zinc-900"}
                       disabled={device.paired}
                     >
                       {device.paired ? "Eşleşildi" : "Eşleş"}
                     </Button>
                   </div>
                 ))}
               </div>
             )}

            <div className="flex flex-col gap-2 mt-2 pt-4 border-t border-emerald-200/50">
              <Label htmlFor="serverIp" className="text-emerald-800 font-semibold">Veya Manuel IP Adresi Girin</Label>
              <Input 
                id="serverIp" 
                 
                value={serverIp}
                onChange={(e) => setServerIp(e.target.value)}
                className="max-w-xs border-emerald-200 focus-visible:ring-emerald-500"
              />
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-end gap-2 bg-muted/20 py-4 border-t">
        <Button onClick={handleSave} className="gap-2 min-w-[120px]">
          {isSaved ? <CheckCircle2 className="w-4 h-4" /> : null}
          {isSaved ? "Kaydedildi" : "Kaydet"}
        </Button>
      </CardFooter>
    </Card>
  );
}
