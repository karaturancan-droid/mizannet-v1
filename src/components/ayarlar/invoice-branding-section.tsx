'use client';

import { useEffect, useState, useRef } from 'react';
import { Palette, Loader2, Save, Image as ImageIcon } from 'lucide-react';
import { useAyarlar } from '@/hooks/use-ayarlar';
import { useInvoiceBranding } from '@/hooks/use-invoice-branding';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';

interface BrandingState {
  logo_path: string;
  color: string;
  note: string;
  footer: string;
  show_logo: boolean;
  template: string;
}

const DEFAULTS: BrandingState = {
  logo_path: '',
  color: '#0EA5E9',
  note: '',
  footer: '',
  show_logo: true,
  template: 'modern',
};

export function InvoiceBrandingSection() {
  const { setSetting } = useAyarlar();
  const { getBranding, setBranding, loading } = useInvoiceBranding();
  const { addToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [state, setState] = useState<BrandingState>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getBranding()
      .then((b) => {
        setState({
          logo_path: b.logo_path || '',
          color: b.color || '#0EA5E9',
          note: b.note || '',
          footer: b.footer || '',
          show_logo: b.show_logo ?? true,
          template: b.template || 'modern',
        });
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [getBranding]);

  const handleLogoPick = () => fileRef.current?.click();

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Yerel yolu kaydet (Tauri tarafında file:// ile gösterilir)
    const path = (file as File & { path?: string }).path || file.name;
    setState((s) => ({ ...s, logo_path: path }));
    e.target.value = '';
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setBranding({
        logo_path: state.logo_path,
        color: state.color,
        note: state.note,
        footer: state.footer,
        show_logo: state.show_logo,
        template: state.template,
      });
      addToast({ title: 'Kaydedildi', description: 'Fatura şablonu marka ayarları güncellendi.' });
    } catch (err) {
      addToast({
        title: 'Hata',
        description: err instanceof Error ? err.message : 'Ayarlar kaydedilemedi',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" /> Fatura Şablonu & Marka
        </CardTitle>
        <CardDescription>
          Kesilen faturaların görünümünü markanıza göre özelleştirin: logo, vurgu rengi, alt not ve yazdırma şablonu.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loaded && (
          <>
            {/* Logo */}
            <div className="space-y-1.5">
              <Label>Logo</Label>
              <div className="flex items-center gap-3">
                {state.logo_path && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={state.logo_path.startsWith('file:') ? state.logo_path : `file://${state.logo_path.replace(/\\/g, '/')}`}
                    alt="logo önizleme"
                    className="h-12 w-12 object-contain rounded border"
                  />
                )}
                <Button type="button" variant="outline" size="sm" onClick={handleLogoPick}>
                  <ImageIcon className="h-4 w-4 mr-1" /> {state.logo_path ? 'Değiştir' : 'Logo Seç'}
                </Button>
                {state.logo_path && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setState((s) => ({ ...s, logo_path: '' }))}>
                    Kaldır
                  </Button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFile} />
            </div>

            {/* Renk */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Vurgu Rengi</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={/^#[0-9a-fA-F]{6}$/.test(state.color) ? state.color : '#0EA5E9'}
                    onChange={(e) => setState((s) => ({ ...s, color: e.target.value.toUpperCase() }))}
                    className="h-9 w-14 rounded border cursor-pointer"
                  />
                  <Input value={state.color} onChange={(e) => setState((s) => ({ ...s, color: e.target.value }))}  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Şablon</Label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={state.template}
                  onChange={(e) => setState((s) => ({ ...s, template: e.target.value }))}
                >
                  <option value="modern">Modern</option>
                  <option value="classic">Klasik</option>
                </select>
              </div>
            </div>

            {/* Not & footer */}
            <div className="space-y-1.5">
              <Label>Fatura Alt Notu</Label>
              <Input
                value={state.note}
                
                onChange={(e) => setState((s) => ({ ...s, note: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Alt Bilgi (Footer)</Label>
              <Input
                value={state.footer}
                
                onChange={(e) => setState((s) => ({ ...s, footer: e.target.value }))}
              />
            </div>

            {/* Logo göster */}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={state.show_logo}
                onChange={(e) => setState((s) => ({ ...s, show_logo: e.target.checked }))}
              />
              Faturalarda logoyu göster
            </label>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving || loading}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Kaydet
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
