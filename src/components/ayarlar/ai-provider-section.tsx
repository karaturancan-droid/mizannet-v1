'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAyarlar } from '@/hooks/use-ayarlar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { invoke } from '@tauri-apps/api/core';
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Zap,
  Brain,
  Server,
  Eye,
  EyeOff,
  ExternalLink,
  ChevronDown,
  Gift,
} from 'lucide-react';

type Provider = 'local' | 'nvidia' | 'google';

interface ModelOption {
  id: string;
  name: string;
  free: boolean;
  description: string;
}

const NVIDIA_MODELS: ModelOption[] = [
  // ─── Görsel ve Ajan Yetenekli Modeller ───
  { id: 'meta/llama-3.2-11b-vision-instruct', name: 'Llama 3.2 11B Vision', free: true, description: 'Hızlı görsel analiz, metin ve ajan yeteneği' },
  { id: 'meta/llama-3.2-90b-vision-instruct', name: 'Llama 3.2 90B Vision', free: true, description: 'En güçlü görsel analiz ve mantıksal çıkarım' },
  { id: 'microsoft/phi-3.5-vision-instruct', name: 'Phi-3.5 Vision', free: true, description: 'Kompakt, çok hızlı görsel + metin modeli' },
];

const GOOGLE_MODELS: ModelOption[] = [
  // ─── Gemini 3.x Serisi (Görsel, Belge Analizi ve Üretimi) ───
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', free: true, description: 'Görsel, Word, Excel Analizi ve Dosya/Belge Üretimi (En Güncel)' },
  { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash', free: true, description: 'Görsel ve Dosya Analizi, Ajan Yeteneği' },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', free: true, description: 'Görsel/Belge anlama ve Dosya üretme (Stabil)' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite', free: true, description: 'Daha hızlı görsel analiz ve belge işleme' },
  { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Deneysel)', free: true, description: 'Deneysel görsel ve dosya işleme' },
];

interface ProviderOption {
  id: Provider;
  name: string;
  description: string;
  badge: string;
  badgeColor: string;
  icon: React.ReactNode;
  keyLabel: string;
  keyPlaceholder: string;
  docsUrl: string;
  gradient: string;
  models: ModelOption[];
  defaultModel: string;
}

const PROVIDERS: ProviderOption[] = [
  {
    id: 'local',
    name: 'Yerel Model',
    description: 'Bilgisayarınızda çalışır. İnternet gerekmez, veriler dışarı çıkmaz.',
    badge: 'Çevrimdışı',
    badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: <Server className="h-5 w-5" />,
    keyLabel: '',
    keyPlaceholder: '',
    docsUrl: '',
    gradient: 'from-blue-500 to-cyan-500',
    models: [],
    defaultModel: '',
  },
  {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    description: 'NVIDIA\'nın bulut API\'si. DeepSeek V4, Nemotron 3 gibi güçlü modeller ücretsiz.',
    badge: 'Bulut API',
    badgeColor: 'bg-green-100 text-green-700 border-green-200',
    icon: <Zap className="h-5 w-5" />,
    keyLabel: 'NVIDIA API Anahtarı',
    keyPlaceholder: 'nvapi-xxxxxxxxxxxxxxxxxxxx',
    docsUrl: 'https://build.nvidia.com',
    gradient: 'from-green-500 to-emerald-500',
    models: NVIDIA_MODELS,
    defaultModel: 'deepseek-ai/deepseek-v4.1-flash',
  },
  {
    id: 'google',
    name: 'Google AI Studio',
    description: 'Google Gemini modelleri. Gemini 3.8 Flash ücretsiz ve en yeni.',
    badge: 'Bulut API',
    badgeColor: 'bg-orange-100 text-orange-700 border-orange-200',
    icon: <Brain className="h-5 w-5" />,
    keyLabel: 'Google AI Studio API Anahtarı',
    keyPlaceholder: 'AIzaSy-xxxxxxxxxxxxxxxxxxxx',
    docsUrl: 'https://aistudio.google.com/apikey',
    gradient: 'from-orange-500 to-yellow-500',
    models: GOOGLE_MODELS,
    defaultModel: 'gemini-3.8-flash',
  },
];

export function AiProviderSection() {
  const { getSetting, setSetting } = useAyarlar();
  const { addToast } = useToast();

  const [activeProvider, setActiveProvider] = useState<Provider>('local');
  const [nvidiaKey, setNvidiaKey] = useState('');
  const [googleKey, setGoogleKey] = useState('');
  const [nvidiaModel, setNvidiaModel] = useState('deepseek-ai/deepseek-v4.1-flash');
  const [googleModel, setGoogleModel] = useState('gemini-3.8-flash');
  const [showNvidiaKey, setShowNvidiaKey] = useState(false);
  const [showGoogleKey, setShowGoogleKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      const provider = (await getSetting('ai_provider')) as Provider | undefined;
      if (provider) setActiveProvider(provider);

      const nKey = await getSetting('nvidia_api_key');
      if (nKey) setNvidiaKey(nKey);

      const gKey = await getSetting('google_api_key');
      if (gKey) setGoogleKey(gKey);

      const nModel = await getSetting('nvidia_model');
      if (nModel) setNvidiaModel(nModel);

      const gModel = await getSetting('google_model');
      if (gModel) setGoogleModel(gModel);
    } catch {
      // ignore
    }
  }, [getSetting]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    setTestResult(null);
    try {
      await setSetting('ai_provider', activeProvider);
      if (activeProvider === 'nvidia') {
        await setSetting('nvidia_api_key', nvidiaKey.trim());
        await setSetting('nvidia_model', nvidiaModel);
      } else if (activeProvider === 'google') {
        await setSetting('google_api_key', googleKey.trim());
        await setSetting('google_model', googleModel);
      }
      addToast({ title: 'Yapay Zeka Ayarları Kaydedildi', variant: 'success' });
    } catch (err) {
      addToast({ title: 'Kayıt Hatası', description: String(err), variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    const currentKey = activeProvider === 'nvidia' ? nvidiaKey : activeProvider === 'google' ? googleKey : '';
    const currentModel = activeProvider === 'nvidia' ? nvidiaModel : activeProvider === 'google' ? googleModel : '';
    try {
      const result = await invoke<string>('test_ai_provider', {
        provider: activeProvider,
        apiKey: currentKey.trim(),
        model: currentModel,
      });
      setTestResult({ ok: true, message: result });
      addToast({ title: 'Bağlantı Başarılı!', description: result, variant: 'success' });
    } catch (err) {
      const msg = String(err);
      setTestResult({ ok: false, message: msg });
      addToast({ title: 'Bağlantı Hatası', description: msg, variant: 'destructive' });
    } finally {
      setIsTesting(false);
    }
  };

  const currentKeyValue = activeProvider === 'nvidia' ? nvidiaKey : activeProvider === 'google' ? googleKey : '';
  const selectedProviderData = PROVIDERS.find((p) => p.id === activeProvider)!;
  const currentModels = selectedProviderData.models;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-bold">
          <Brain className="h-6 w-6 text-primary" />
          Yapay Zeka Sağlayıcısı
        </CardTitle>
        <CardDescription>
          Asistan ve analiz özelliklerinin hangi yapay zeka motoru üzerinden çalışacağını seçin.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* PROVIDER CARD SEÇİCİ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => { setActiveProvider(p.id); setTestResult(null); }}
              className={`relative flex flex-col gap-2 p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                activeProvider === p.id
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border bg-background hover:border-primary/40 hover:bg-muted/30'
              }`}
            >
              {activeProvider === p.id && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
              )}
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${p.gradient} flex items-center justify-center text-white shadow-sm`}>
                {p.icon}
              </div>
              <div>
                <p className="font-semibold text-sm">{p.name}</p>
                <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded border mt-0.5 ${p.badgeColor}`}>
                  {p.badge}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{p.description}</p>
            </button>
          ))}
        </div>

        {/* API KEY + MODEL SEÇİMİ */}
        {activeProvider !== 'local' && (
          <div className="space-y-4 p-4 bg-muted/30 rounded-xl border animate-in fade-in duration-200">
            {/* API KEY */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-semibold">{selectedProviderData.keyLabel}</Label>
                {selectedProviderData.docsUrl && (
                  <a
                    href={selectedProviderData.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary flex items-center gap-1 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Ücretsiz API Anahtarı Al
                  </a>
                )}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={
                      activeProvider === 'nvidia'
                        ? showNvidiaKey ? 'text' : 'password'
                        : showGoogleKey ? 'text' : 'password'
                    }
                    value={activeProvider === 'nvidia' ? nvidiaKey : googleKey}
                    onChange={(e) => {
                      if (activeProvider === 'nvidia') setNvidiaKey(e.target.value);
                      else setGoogleKey(e.target.value);
                      setTestResult(null);
                    }}
                    
                    className="pr-10 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (activeProvider === 'nvidia') setShowNvidiaKey(!showNvidiaKey);
                      else setShowGoogleKey(!showGoogleKey);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {(activeProvider === 'nvidia' ? showNvidiaKey : showGoogleKey) ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <Button
                  variant="outline"
                  onClick={handleTest}
                  disabled={isTesting || !currentKeyValue.trim()}
                  className="shrink-0 gap-1.5"
                >
                  {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                  {isTesting ? 'Test...' : 'Test Et'}
                </Button>
              </div>
            </div>

            {/* MODEL SEÇİMİ */}
            <div className="space-y-2">
              <Label className="font-semibold flex items-center gap-2">
                Model Seçimi
                <span className="text-[10px] font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {currentModels.filter(m => m.free).length} ücretsiz model mevcut
                </span>
              </Label>
              <div className="grid gap-2">
                {currentModels.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      if (activeProvider === 'nvidia') setNvidiaModel(model.id);
                      else setGoogleModel(model.id);
                      setTestResult(null);
                    }}
                    className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all text-sm ${
                      (activeProvider === 'nvidia' ? nvidiaModel : googleModel) === model.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-background hover:border-primary/30 hover:bg-muted/20'
                    }`}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium truncate">{model.name}</span>
                      <span className="text-xs text-muted-foreground mt-0.5">{model.description}</span>
                      <span className="text-[10px] font-mono text-muted-foreground/60 mt-0.5 truncate">{model.id}</span>
                    </div>
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      {model.free && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-100 border border-green-200 px-1.5 py-0.5 rounded-full">
                          <Gift className="h-2.5 w-2.5" />
                          Ücretsiz
                        </span>
                      )}
                      {(activeProvider === 'nvidia' ? nvidiaModel : googleModel) === model.id && (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* TEST SONUCU */}
            {testResult && (
              <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                testResult.ok
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                {testResult.ok
                  ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-green-600" />
                  : <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-600" />
                }
                <p className="text-xs leading-relaxed">{testResult.message}</p>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              🔒 API anahtarınız yalnızca bu cihazda saklanır ve şifrelenmiş veritabanında tutulur.
            </p>
          </div>
        )}

        {/* KAYDET BUTONU */}
        <div className="flex justify-end pt-1">
          <Button onClick={handleSave} disabled={isSaving} className="gap-2 min-w-[140px]">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {isSaving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
