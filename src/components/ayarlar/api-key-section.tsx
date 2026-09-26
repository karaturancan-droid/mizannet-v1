'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAyarlar } from '@/hooks/use-ayarlar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import {
  Loader2,
  Server,
  Download,
  Play,
  Square,
  Cpu,
  HardDrive,
  Activity,
  Globe,
  FolderOpen,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Send,
  Sparkles,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import { HfModelBrowser } from './hf-model-browser';

interface HardwareInfo {
  cpu_ram_gb: number;
  gpu_name: string;
  gpu_vram_gb: number;
  recommended_models: string[];
}

interface LocalModelInfo {
  name: string;
  path: string;
  size_bytes: number;
  is_vision: boolean;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export function ApiKeySection() {
  const { getSetting, setSetting } = useAyarlar();
  const { addToast } = useToast();

  // Yerel Yapay Zeka State'leri
  const [localInstalled, setLocalInstalled] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadText, setDownloadText] = useState('');
  const [isLocalRunning, setIsLocalRunning] = useState(false);
  const [customModelPath, setCustomModelPath] = useState('');

  // Donanım Analiz State'leri
  const [isDetecting, setIsDetecting] = useState(false);
  const [hardware, setHardware] = useState<HardwareInfo | null>(null);

  const [localAiDir, setLocalAiDir] = useState<string>('');
  const [localModels, setLocalModels] = useState<LocalModelInfo[]>([]);
  const [selectedModelPath, setSelectedModelPath] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'local' | 'catalog'>('local');
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');

  const getSearchTermForRecommendation = (rm: string): string => {
    const lower = rm.toLowerCase();
    if (lower.includes('qwen-2.5 7b') || lower.includes('qwen 2.5 7b') || lower.includes('qwen')) {
      return 'Qwen2.5-7B-Instruct-GGUF';
    }
    if (lower.includes('llama-3.1 8b') || lower.includes('llama 3.1 8b') || lower.includes('llama-3.1')) {
      return 'Meta-Llama-3.1-8B-Instruct-GGUF';
    }
    if (lower.includes('mistral nemo') || lower.includes('nemo 12b')) {
      return 'Mistral-Nemo-Instruct-2407-GGUF';
    }
    if (lower.includes('phi-3') || lower.includes('phi 3')) {
      return 'Phi-3-mini-4k-instruct-gguf';
    }
    if (lower.includes('gemma-2 2b') || lower.includes('gemma 2 2b')) {
      return 'gemma-2-2b-it-GGUF';
    }
    if (lower.includes('llama-3 70b') || lower.includes('llama 3 70b')) {
      return 'Meta-Llama-3-70B-Instruct-GGUF';
    }
    if (lower.includes('mixtral')) {
      return 'Mixtral-8x7B-Instruct-v0.1-GGUF';
    }
    return rm.split('(')[0].trim();
  };

  const handleDownloadRecommendation = (rm: string) => {
    const query = getSearchTermForRecommendation(rm);
    setCatalogSearchQuery(query);
    setActiveTab('catalog');
    addToast({
      title: 'HuggingFace Kataloğu Açıldı',
      description: `"${query}" modeli aranıyor. İstediğiniz kalitedeki (.gguf) dosyayı tek tıkla indirebilirsiniz.`,
      variant: 'success',
    });
  };

  // Hızlı Test State'leri
  const [testPrompt, setTestPrompt] = useState('Merhaba, sistem durumunu kontrol eder misin?');
  const [testResponse, setTestResponse] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  const checkLocalAi = useCallback(async (pathOverride?: string) => {
    try {
      const pathToCheck = pathOverride !== undefined ? pathOverride : customModelPath;
      const dir = await invoke<string>('get_local_ai_dir');
      setLocalAiDir(dir);

      // Model listesini tara (Hem default dir hem custom dir)
      const models = await invoke<LocalModelInfo[]>('list_local_models', { customDir: pathToCheck || null });
      setLocalModels(models);

      // Sunucu veya model kurulu mu?
      const installed = await invoke<boolean>('check_local_ai_installed', { customModelPath: pathToCheck || null });
      setLocalInstalled(installed);

      // Sunucu çalışıyor mu?
      const running = await invoke<boolean>('check_local_ai_running');
      setIsLocalRunning(running);
    } catch (e) {
      console.error('Local AI check failed', e);
    }
  }, [customModelPath]);

  const loadSettings = useCallback(async () => {
    try {
      await setSetting('ai_provider', 'local');

      const savedModelPath = await getSetting('local_model_path');
      if (savedModelPath) {
        setCustomModelPath(savedModelPath);
      }

      const savedSelectedPath = await getSetting('selected_model_path');
      if (savedSelectedPath) {
        setSelectedModelPath(savedSelectedPath);
      }

      await checkLocalAi(savedModelPath || undefined);
    } catch {
      // Hataları yok say
    }
  }, [getSetting, setSetting, checkLocalAi]);

  useEffect(() => {
    loadSettings();

    invoke<any>('get_active_download_state').then((state) => {
      if (state.is_downloading) {
        setIsDownloading(true);
        setDownloadProgress(state.percent);
        setDownloadText(`${state.filename} indiriliyor... %${state.percent}`);
      }
    }).catch(console.error);

    const unlisten = listen<any>('ai_download_progress', (event) => {
      const { file, downloaded, total } = event.payload;
      const percent = Math.round((downloaded / total) * 100);
      setIsDownloading(true);
      setDownloadProgress(percent);
      setDownloadText(`${file} indiriliyor... %${percent}`);
    });

    // Periyodik kontrol
    const interval = setInterval(() => {
      invoke<boolean>('check_local_ai_running')
        .then((r) => setIsLocalRunning(r))
        .catch(() => {});
    }, 4000);

    return () => {
      unlisten.then((f) => f());
      clearInterval(interval);
    };
  }, [loadSettings]);

  // Model klasörü değiştiğinde listeyi güncelle
  useEffect(() => {
    if (customModelPath) {
      checkLocalAi(customModelPath);
    }
  }, [customModelPath, checkLocalAi]);

  const handleDetectHardware = async () => {
    setIsDetecting(true);
    try {
      const hw = await invoke<HardwareInfo>('detect_hardware');
      setHardware(hw);
      addToast({ title: 'Donanım Analizi Tamamlandı', description: `${hw.gpu_name} tespit edildi.`, variant: 'success' });
    } catch (err) {
      addToast({ title: 'Donanım Analiz Hatası', description: String(err), variant: 'destructive' });
    } finally {
      setIsDetecting(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadText('Bağlanıyor...');
    try {
      await invoke('download_local_ai', { skipModel: !!(selectedModelPath || customModelPath) });
      addToast({ title: 'Yapay zeka motoru indirildi', variant: 'success' });
      await checkLocalAi();
    } catch (err) {
      addToast({ title: 'İndirme hatası', description: String(err), variant: 'destructive' });
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
      setDownloadText('');
    }
  };

  const handleToggleRunning = async () => {
    try {
      if (isLocalRunning) {
        await invoke('stop_local_ai');
        setIsLocalRunning(false);
        addToast({ title: 'Yerel Yapay Zeka Durduruldu' });
      } else {
        addToast({ title: 'Başlatılıyor...', description: 'Model belleğe yükleniyor (10-20 sn sürebilir)' });
        
        // Seçili model dosyasını veya klasörü gönder
        const targetModel = selectedModelPath || customModelPath;
        await invoke('start_local_ai', {
          customModelPath: targetModel || null,
          modelFilename: null,
        });

        setIsLocalRunning(true);
        addToast({ title: 'Yerel Yapay Zeka Başlatıldı', description: 'Port 8085 üzerinden hizmet veriyor.', variant: 'success' });
      }
    } catch (err) {
      addToast({ title: 'Başlatma Hatası', description: String(err), variant: 'destructive' });
    }
  };

  const selectCustomFolder = async () => {
    try {
      const selected = await open({ directory: true, title: 'Modellerin Bulunduğu Klasörü Seçin' });
      if (selected && typeof selected === 'string') {
        setCustomModelPath(selected);
        await setSetting('local_model_path', selected);
        addToast({ title: 'Klasör Güncellendi', description: selected });
        await checkLocalAi(selected);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const selectCustomFile = async () => {
    try {
      const selected = await open({
        multiple: false,
        title: 'Doğrudan .gguf Model Dosyası Seçin',
        filters: [{ name: 'GGUF Yapay Zeka Modeli', extensions: ['gguf'] }],
      });
      if (selected && typeof selected === 'string') {
        setSelectedModelPath(selected);
        await setSetting('selected_model_path', selected);
        const filename = selected.split(/[\\/]/).pop() || selected;
        await setSetting('ai_model', filename);
        addToast({ title: 'Model Seçildi', description: filename, variant: 'success' });
        await checkLocalAi();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveModel = async () => {
    if (!selectedModelPath) {
      addToast({ title: 'Uyarı', description: 'Lütfen listeden bir model seçin.', variant: 'destructive' });
      return;
    }
    try {
      await setSetting('selected_model_path', selectedModelPath);
      const filename = selectedModelPath.split(/[\\/]/).pop() || selectedModelPath;
      await setSetting('ai_model', filename);
      addToast({ title: 'Aktif Model Kaydedildi', description: `${filename} seçildi.`, variant: 'success' });
    } catch (err) {
      addToast({ title: 'Kayıt Hatası', description: String(err), variant: 'destructive' });
    }
  };

  const handleTestChat = async () => {
    if (!testPrompt.trim()) return;
    setIsTesting(true);
    setTestResponse('');
    try {
      // Doğrudan yerel AI portuna test isteği gönder
      const res = await fetch('http://127.0.0.1:8085/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: testPrompt }],
          max_tokens: 300,
        }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || 'Yanıt içeriği boş.';
      setTestResponse(content);
      addToast({ title: 'Test Başarılı', description: 'Yerel yapay zeka başarıyla yanıt verdi!', variant: 'success' });
    } catch (err) {
      setTestResponse(`Hata: ${String(err)}`);
      addToast({ title: 'Test Başarısız', description: 'Yerel sunucuya bağlanılamadı. Motor çalışıyor mu?', variant: 'destructive' });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-bold">
          <Server className="h-6 w-6 text-primary" />
          MizanNet Yerel Yapay Zeka Motoru
        </CardTitle>
        <CardDescription>
          MizanNet yalnızca bilgisayarınızın donanımını kullanan %100 çevrimdışı (Yerel) modelleri destekler. Verileriniz asla internete sızmaz.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* SEKME SEÇİCİ */}
        <div className="flex gap-1 p-1 bg-secondary/40 rounded-lg w-full">
          <button
            onClick={() => setActiveTab('local')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
              activeTab === 'local' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Server className="h-4 w-4" />
            Yerel Ayarlar & Motor
          </button>
          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
              activeTab === 'catalog' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Globe className="h-4 w-4" />
            HuggingFace Kataloğu
          </button>
        </div>

        {/* HF KATALOG SEKMESİ */}
        {activeTab === 'catalog' && (
          <HfModelBrowser
            onModelDownloaded={() => checkLocalAi(customModelPath || undefined)}
            customDir={customModelPath || localAiDir}
            searchQuery={catalogSearchQuery}
          />
        )}

        {/* YEREL AYARLAR SEKMESİ */}
        {activeTab === 'local' && (
          <>
            {/* DONANIM ANALİZİ BÖLÜMÜ */}
            <div className="bg-secondary/30 p-5 rounded-lg border border-border">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                <div>
                  <h3 className="text-base font-semibold flex items-center gap-2">
                    <Cpu className="h-5 w-5 text-blue-500" />
                    Akıllı Donanım Analizi
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Bilgisayarınızın gücünü ölçüp size en uygun modeli önerelim.
                  </p>
                </div>
                <Button
                  onClick={handleDetectHardware}
                  disabled={isDetecting}
                  variant="default"
                  className="w-full sm:w-auto shadow-sm"
                >
                  {isDetecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Activity className="mr-2 h-4 w-4" />}
                  {isDetecting ? 'Analiz Ediliyor...' : 'Sistemi Analiz Et'}
                </Button>
              </div>

              {hardware && (
                <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="bg-background p-3 rounded-md border flex items-center gap-3 shadow-sm">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                        <Cpu className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Sistem RAM</p>
                        <p className="font-semibold">{hardware.cpu_ram_gb.toFixed(1)} GB</p>
                      </div>
                    </div>
                    <div className="bg-background p-3 rounded-md border flex items-center gap-3 shadow-sm md:col-span-2">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                        <HardDrive className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Ekran Kartı (GPU) - {hardware.gpu_vram_gb.toFixed(1)} GB VRAM
                        </p>
                        <p className="font-semibold truncate" title={hardware.gpu_name}>
                          {hardware.gpu_name}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-md border border-green-200 dark:border-green-900/50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-green-900 dark:text-green-300 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-green-600 dark:text-green-400" />
                        Sisteminiz İçin Önerilen Modeller ({hardware.recommended_models.length} Öneri):
                      </h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setCatalogSearchQuery('');
                          setActiveTab('catalog');
                        }}
                        className="text-xs h-7 gap-1 border-green-300 dark:border-green-800 text-green-800 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40"
                      >
                        <Globe className="h-3.5 w-3.5" />
                        Tüm Kataloğu Aç
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {hardware.recommended_models.map((rm, i) => {
                        const searchTerm = getSearchTermForRecommendation(rm);
                        const installedModel = localModels.find(m => {
                          const name = m.name.toLowerCase();
                          if (rm.toLowerCase().includes('qwen') && name.includes('qwen')) return true;
                          if (rm.toLowerCase().includes('llama-3.1') && name.includes('llama-3.1')) return true;
                          if (rm.toLowerCase().includes('mistral') && name.includes('mistral')) return true;
                          if (rm.toLowerCase().includes('phi-3') && name.includes('phi-3')) return true;
                          if (rm.toLowerCase().includes('gemma') && name.includes('gemma')) return true;
                          return false;
                        });

                        return (
                          <div
                            key={i}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-background border border-green-200/70 dark:border-green-900/50 shadow-xs"
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              <div className="w-2.5 h-2.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground">{rm}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  HuggingFace: <span className="text-primary font-mono font-medium">{searchTerm}</span>
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                              {installedModel ? (
                                <>
                                  <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-2 py-0.5 rounded-full flex items-center gap-1 border border-green-300 dark:border-green-800">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Yüklü
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={async () => {
                                      setSelectedModelPath(installedModel.path);
                                      await setSetting('selected_model_path', installedModel.path);
                                      addToast({
                                        title: 'Model Seçildi',
                                        description: `${installedModel.name} aktif model olarak ayarlandı.`,
                                        variant: 'success',
                                      });
                                    }}
                                    className="h-8 text-xs px-3"
                                  >
                                    Aktif Yap
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => handleDownloadRecommendation(rm)}
                                  className="h-8 text-xs px-3.5 bg-green-600 hover:bg-green-700 text-white gap-1.5 shadow-sm font-medium"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  <span>Bu Modeli İndir</span>
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* MODEL KLASÖRÜ VE DOSYA SEÇİMİ */}
            <div className="space-y-4">
              {/* Klasör Seçimi */}
              <div className="flex flex-col gap-2">
                <Label className="font-semibold">Model Klasörü (Modeller Nereden Okunsun / Nereye İnsin?)</Label>
                <div className="flex gap-2">
                  <Input
                    value={customModelPath || localAiDir}
                    readOnly
                    placeholder="Varsayılan Klasör"
                    className="bg-muted/40 font-mono text-xs"
                  />
                  <Button variant="outline" onClick={selectCustomFolder} className="shrink-0 gap-1.5 text-xs">
                    <FolderOpen className="h-4 w-4" />
                    Klasör Seç
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Harici bir diskte veya LM Studio / Bionic klasöründe modelleriniz varsa bu klasörü seçebilirsiniz.
                </p>
              </div>

              {/* Model Dosyası Seçimi (Dropdown + Doğrudan Dosya Seç Butonu) */}
              <div className="flex flex-col gap-2 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold">Aktif Model Dosyası (.gguf)</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={selectCustomFile}
                    className="h-7 text-xs text-primary gap-1"
                  >
                    <FileCode className="h-3.5 w-3.5" />
                    Doğrudan Dosya Seç (.gguf)
                  </Button>
                </div>

                <div className="flex gap-2">
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    value={selectedModelPath}
                    onChange={(e) => setSelectedModelPath(e.target.value)}
                  >
                    <option value="">-- Lütfen listeden bir model seçin ({localModels.length} model bulundu) --</option>
                    {localModels.map((m) => (
                      <option key={m.path} value={m.path}>
                        {m.name} ({formatBytes(m.size_bytes)}) {m.is_vision ? '👁️ Görsel Projektör' : ''}
                      </option>
                    ))}
                  </select>
                  <Button variant="default" onClick={handleSaveModel} className="shrink-0">
                    Seç ve Kaydet
                  </Button>
                </div>

                {localModels.length > 0 ? (
                  <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {localModels.length} adet .gguf modeli tespit edildi.
                  </p>
                ) : (
                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Seçili klasörde .gguf dosyası bulunamadı. "Klasör Seç" veya "Doğrudan Dosya Seç" butonunu kullanabilir ya da "HuggingFace Kataloğu" sekmesinden model indirebilirsiniz.
                  </p>
                )}
              </div>
            </div>

            {/* DURUM VE KONTROL BUTONLARI */}
            <div className="pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex h-3.5 w-3.5">
                  {isLocalRunning ? (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                    </>
                  ) : (
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-sm">
                    Motor Durumu:{' '}
                    {isLocalRunning ? (
                      <span className="text-green-600 dark:text-green-400 font-bold">Çalışıyor (Port 8085)</span>
                    ) : (
                      <span className="text-red-500 font-bold">Durduruldu</span>
                    )}
                  </span>
                  {selectedModelPath && (
                    <span className="text-[11px] text-muted-foreground truncate max-w-sm" title={selectedModelPath}>
                      Aktif: {selectedModelPath.split(/[\\/]/).pop()}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                {!localInstalled && !isDownloading && (
                  <Button onClick={handleDownload} variant="outline" className="w-full sm:w-auto gap-2">
                    <Download className="h-4 w-4" />
                    Motoru İndir
                  </Button>
                )}
                {isDownloading && (
                  <div className="flex items-center gap-2 text-sm text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-md">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {downloadText}
                  </div>
                )}

                <Button
                  onClick={handleToggleRunning}
                  variant={isLocalRunning ? 'destructive' : 'default'}
                  className="w-full sm:w-auto min-w-[150px] gap-2 font-semibold shadow-sm"
                >
                  {isLocalRunning ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {isLocalRunning ? 'Motoru Durdur' : 'Motoru Başlat'}
                </Button>
              </div>
            </div>

            {/* HIZLI TEST PANELİ (Çalışıp çalışmadığını anında görme) */}
            {isLocalRunning && (
              <div className="p-4 bg-muted/30 border rounded-lg space-y-3 mt-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Hızlı Bağlantı Testi (Doğrudan Yanıt Al)
                  </span>
                  <span className="text-[11px] text-green-600 font-medium">Yerel Yapay Zeka Aktif</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={testPrompt}
                    onChange={(e) => setTestPrompt(e.target.value)}
                    placeholder="Test mesajı yazın..."
                    className="text-xs bg-background"
                    onKeyDown={(e) => e.key === 'Enter' && handleTestChat()}
                  />
                  <Button size="sm" onClick={handleTestChat} disabled={isTesting} className="text-xs shrink-0 gap-1">
                    {isTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    <span>{isTesting ? 'Üretiliyor...' : 'Test Et'}</span>
                  </Button>
                </div>
                {testResponse && (
                  <div className="p-3 bg-background border rounded-md text-xs text-foreground whitespace-pre-wrap">
                    <strong>Model Yanıtı:</strong>
                    <p className="mt-1">{testResponse}</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
