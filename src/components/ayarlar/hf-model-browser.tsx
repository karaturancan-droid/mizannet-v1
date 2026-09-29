'use client';

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { Loader2, Search, Download, ChevronDown, ChevronUp, ExternalLink, Sparkles } from 'lucide-react';

interface HfModel {
  id: string;
  downloads: number;
  likes: number;
  pipeline_tag: string | null;
  tags: string[];
  description: string;
}

interface HfModelFile {
  filename: string;
  size_bytes: number;
  download_url: string;
  quantization: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '?';
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(0)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

const Q_INFO: Record<string, { label: string; color: string; priority: number }> = {
  'Q2_K':   { label: 'Q2 - Çok Küçük',       color: 'text-red-400',    priority: 1 },
  'Q3_K_S': { label: 'Q3 - Küçük',            color: 'text-orange-400', priority: 2 },
  'Q3_K_M': { label: 'Q3M - Orta Küçük',      color: 'text-orange-400', priority: 3 },
  'Q4_0':   { label: 'Q4 - Hızlı',            color: 'text-yellow-400', priority: 4 },
  'Q4_K_S': { label: 'Q4S - İyi',             color: 'text-yellow-300', priority: 5 },
  'Q4_K_M': { label: '⭐ Q4KM - Önerilen',    color: 'text-green-500',  priority: 6 },
  'Q5_0':   { label: 'Q5 - Yüksek',           color: 'text-blue-400',   priority: 7 },
  'Q5_K_M': { label: 'Q5KM - Çok Yüksek',    color: 'text-blue-500',   priority: 8 },
  'Q6_K':   { label: 'Q6 - Neredeyse Kayıpsız', color: 'text-purple-400', priority: 9 },
  'Q8_0':   { label: 'Q8 - Kayıpsız',         color: 'text-purple-500', priority: 10 },
};

interface HfModelBrowserProps {
  onModelDownloaded?: () => void;
  customDir?: string;
  searchQuery?: string;
}

export function HfModelBrowser({ onModelDownloaded, customDir, searchQuery }: HfModelBrowserProps) {
  const { addToast } = useToast();
  const [query, setQuery] = useState(searchQuery || '');
  const [models, setModels] = useState<HfModel[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Hangi modelin dosya listesi açık (accordion)
  const [expandedModelId, setExpandedModelId] = useState<string | null>(null);
  const [loadingFilesFor, setLoadingFilesFor] = useState<string | null>(null);
  const [filesMap, setFilesMap] = useState<Record<string, HfModelFile[]>>({});
  
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    if (searchQuery) {
      setQuery(searchQuery);
      handleSearch(false, searchQuery);
    } else {
      handleSearch(true, '');
    }
  }, [searchQuery]);

  useEffect(() => {
    invoke<any>('get_active_download_state').then((state) => {
      if (state.is_downloading) {
        setDownloadingFile(state.filename);
        setDownloadProgress(state.percent);
      }
    }).catch(console.error);

    const unlisten = listen<any>('ai_download_progress', (e) => {
      const { downloaded, total, file } = e.payload;
      if (total > 0) {
        setDownloadProgress(Math.round((downloaded / total) * 100));
        if (file) setDownloadingFile(file);
      }
    });
    return () => { unlisten.then(f => f()); };
  }, []);

  const handleSearch = async (initial = false, searchOverride?: string) => {
    setIsSearching(true);
    setExpandedModelId(null);
    const q = searchOverride !== undefined ? searchOverride : query;
    try {
      const result = await invoke<HfModel[]>('search_hf_models', { query: initial ? '' : q, limit: 25 });
      setModels(result);
      if (searchOverride && result.length > 0) {
        const topModel = result[0];
        setExpandedModelId(topModel.id);
        loadFilesForModel(topModel.id);
      }
    } catch (err) {
      addToast({ title: 'Arama Hatası', description: String(err), variant: 'destructive' });
    } finally {
      setIsSearching(false);
    }
  };

  const loadFilesForModel = async (modelId: string): Promise<HfModelFile[]> => {
    if (filesMap[modelId]) return filesMap[modelId];
    setLoadingFilesFor(modelId);
    try {
      const result = await invoke<HfModelFile[]>('get_hf_model_files', { repoId: modelId });
      const sorted = [...result].sort((a, b) => {
        const pa = Q_INFO[a.quantization]?.priority ?? 0;
        const pb = Q_INFO[b.quantization]?.priority ?? 0;
        return Math.abs(pb - 6) - Math.abs(pa - 6);
      });
      setFilesMap(prev => ({ ...prev, [modelId]: sorted }));
      return sorted;
    } catch (err) {
      addToast({ title: 'Dosyalar yüklenemedi', description: String(err), variant: 'destructive' });
      return [];
    } finally {
      setLoadingFilesFor(null);
    }
  };

  const handleToggleExpand = async (model: HfModel) => {
    if (expandedModelId === model.id) {
      setExpandedModelId(null);
      return;
    }
    setExpandedModelId(model.id);
    await loadFilesForModel(model.id);
  };

  const handleDownload = async (file: HfModelFile) => {
    setDownloadingFile(file.filename);
    setDownloadProgress(0);
    addToast({ title: '⬇ İndirme Başladı', description: file.filename });
    try {
      await invoke<string>('download_hf_model', {
        downloadUrl: file.download_url,
        filename: file.filename,
        customDir: customDir || null,
      });
      addToast({ title: '✅ İndirme Tamamlandı', description: `${file.filename} indirildi ve kullanıma hazır.`, variant: 'success' });
      onModelDownloaded?.();
    } catch (err) {
      addToast({ title: 'İndirme Hatası', description: String(err), variant: 'destructive' });
    } finally {
      setDownloadingFile(null);
      setDownloadProgress(0);
    }
  };

  const handleQuickDownload = async (model: HfModel, e: React.MouseEvent) => {
    e.stopPropagation();
    const files = await loadFilesForModel(model.id);
    if (!files || files.length === 0) {
      addToast({ title: 'GGUF Dosyası Bulunamadı', description: 'Bu model dizininde uyumlu .gguf dosyası tespit edilemedi.', variant: 'destructive' });
      return;
    }
    // Pick Q4_K_M or first available file
    const bestFile = files.find(f => f.quantization === 'Q4_K_M') || files[0];
    handleDownload(bestFile);
  };

  return (
    <div className="space-y-3">
      {/* Arama Çubuğu */}
      <div className="flex gap-2">
        <Input
          placeholder="Model ara... (llama, qwen, mistral, phi, gemma...)"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          className="flex-1"
        />
        <Button onClick={() => handleSearch()} disabled={isSearching} className="shrink-0">
          {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        HuggingFace'deki tüm GGUF yapay zeka modelleri listeleniyor. Doğrudan <strong>"İndir"</strong> butonuna tıklayabilir veya <strong>"Dosyaları Gör"</strong> ile farklı versiyonları görebilirsiniz.
      </p>

      {/* Önerilen Modeller */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs font-semibold flex items-center text-zinc-500 mr-2">
          <Sparkles className="w-3.5 h-3.5 mr-1" /> Sisteme En Uygun Modeller:
        </span>
        <Button size="sm" variant="outline" className="h-7 text-xs rounded-full border-primary/20 text-primary hover:bg-primary/10" onClick={() => handleSearch(false, 'Qwen/Qwen2.5-7B-Instruct-GGUF')}>
          Qwen 2.5 7B (Önerilen)
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs rounded-full" onClick={() => handleSearch(false, 'unsloth/Meta-Llama-3.1-8B-Instruct-GGUF')}>
          Llama 3.1 8B
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs rounded-full" onClick={() => handleSearch(false, 'bartowski/gemma-2-9b-it-GGUF')}>
          Gemma 2 9B
        </Button>
      </div>

      {/* İndirme İlerleme Çubuğu (global) */}
      {downloadingFile && (
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
              Model İndiriliyor: <strong>{downloadingFile}</strong>
            </span>
            <span className="text-sm font-bold text-blue-700 dark:text-blue-300">%{downloadProgress}</span>
          </div>
          <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-2">
            <div
              className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${downloadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Model Listesi */}
      {isSearching ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">HuggingFace modelleri taranıyor...</span>
        </div>
      ) : models.length === 0 ? (
        <p className="text-center text-muted-foreground py-8 text-sm">Aranan kriterde model bulunamadı.</p>
      ) : (
        <div className="space-y-2.5">
          {models.map(model => {
            const isExpanded = expandedModelId === model.id;
            const isLoadingThis = loadingFilesFor === model.id;
            const modelFiles = filesMap[model.id] ?? [];
            const isAnyDownloading = downloadingFile !== null;

            return (
              <div key={model.id} className="rounded-lg border bg-card hover:border-primary/40 transition-all overflow-hidden shadow-sm">
                {/* Model Başlık Satırı */}
                <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold truncate">{model.id}</p>
                      {model.pipeline_tag && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20 shrink-0">
                          {model.pipeline_tag}
                        </span>
                      )}
                      {model.downloads > 0 && (
                        <span className="text-[11px] text-muted-foreground shrink-0">
                          ⬇ {model.downloads.toLocaleString()} indirme
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{model.description}</p>
                  </div>

                  {/* Sağ Butonlar */}
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`https://huggingface.co/${model.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 text-muted-foreground hover:text-primary rounded-md hover:bg-secondary transition-colors"
                      title="HuggingFace Sayfası"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>

                    {/* Doğrudan İndirme Butonu */}
                    <Button
                      size="sm"
                      onClick={(e) => handleQuickDownload(model, e)}
                      disabled={isAnyDownloading || isLoadingThis}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs h-8 px-3 gap-1.5 shadow-sm"
                    >
                      {isLoadingThis ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <Download className="h-3.5 w-3.5" />
                          <span>İndir (Önerilen Q4)</span>
                        </>
                      )}
                    </Button>

                    {/* Detay/Dosyaları Seç Akordeon Butonu */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleExpand(model)}
                      disabled={isLoadingThis}
                      className="text-xs h-8 px-2.5 gap-1"
                    >
                      {isLoadingThis ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <span>Dosyaları Gör</span>
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Dosya Listesi (Accordion İçeriği) */}
                {isExpanded && !isLoadingThis && (
                  <div className="border-t bg-secondary/10 p-3 space-y-2">
                    {modelFiles.length === 0 ? (
                      <p className="text-center text-muted-foreground text-xs py-3">
                        Bu model deposunda doğrudan .gguf dosyası bulunamadı.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-muted-foreground font-medium px-1 pb-1">
                          <span>Mevcut Dosya Formatları ({modelFiles.length} dosya):</span>
                          <span>Büyüklük / Kalite</span>
                        </div>
                        {modelFiles.map(file => {
                          const qInfo = Q_INFO[file.quantization] || { label: file.quantization, color: 'text-muted-foreground', priority: 0 };
                          const isThisDownloading = downloadingFile === file.filename;
                          const isRecommended = file.quantization === 'Q4_K_M';

                          return (
                            <div
                              key={file.filename}
                              className={`flex items-center justify-between p-2.5 rounded-md border transition-all ${
                                isRecommended
                                  ? 'bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-800/60 shadow-sm'
                                  : 'bg-background hover:border-primary/30'
                              }`}
                            >
                              <div className="flex-1 min-w-0 mr-3">
                                <div className="flex items-center gap-2">
                                  <p className="text-xs font-semibold truncate" title={file.filename}>
                                    {file.filename}
                                  </p>
                                  {isRecommended && (
                                    <span className="px-1.5 py-0.2 text-[9px] font-bold bg-green-600 text-white rounded shrink-0">
                                      EN İYİ DENGE
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`text-[11px] font-medium ${qInfo.color}`}>{qInfo.label}</span>
                                  <span className="text-[11px] text-muted-foreground">• {formatBytes(file.size_bytes)}</span>
                                </div>
                                {isThisDownloading && downloadProgress > 0 && (
                                  <div className="mt-2">
                                    <div className="w-full bg-secondary rounded-full h-1.5">
                                      <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${downloadProgress}%` }} />
                                    </div>
                                  </div>
                                )}
                              </div>

                              <Button
                                size="sm"
                                variant={isRecommended ? "default" : "outline"}
                                onClick={() => handleDownload(file)}
                                disabled={isAnyDownloading}
                                className="shrink-0 h-8 px-3 text-xs gap-1 font-medium"
                              >
                                {isThisDownloading ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <>
                                    <Download className="h-3.5 w-3.5" />
                                    <span>{isRecommended ? 'Önerileni İndir' : 'İndir'}</span>
                                  </>
                                )}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
