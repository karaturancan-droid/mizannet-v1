'use client';

import { useState, useEffect } from 'react';
import { useAyarlar, Settings } from '@/hooks/use-ayarlar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { User, Loader2, Save } from 'lucide-react';

export default function ProfilPage() {
  const { settings, loading, setSetting, loadAllSettings } = useAyarlar();
  const { addToast } = useToast();
  const [formData, setFormData] = useState<Settings>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadAllSettings();
  }, [loadAllSettings]);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const keys: (keyof Settings)[] = [
        'company_name',
        'tax_no',
        'phone',
        'email',
        'contact_person',
        'profile_image',
      ];

      for (const key of keys) {
        if (formData[key]) {
          await setSetting(key, formData[key] as string);
        }
      }

      window.dispatchEvent(new Event('settings-changed'));
      addToast({ title: 'Profil bilgileri kaydedildi', variant: 'success' });
    } catch (err) {
      addToast({
        title: 'Kaydetme başarısız',
        description: err instanceof Error ? err.message : 'Bilinmeyen hata',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <User className="h-8 w-8" />
          Profil
        </h1>
        <p className="text-muted-foreground">İşletme ve kullanıcı bilgilerinizi yönetin</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardContent className="pt-6 text-center">
            <div className="mx-auto flex h-24 w-24 relative group rounded-full overflow-hidden border-2 border-primary/20 bg-muted">
              {formData.profile_image ? (
                <img src={formData.profile_image} alt="Profil" className="h-full w-full object-cover" />
              ) : (
                <User className="h-12 w-12 text-muted-foreground m-auto" />
              )}
              <label className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                <span className="text-white text-xs font-semibold">Görsel Değiştir</span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => {
                        if (typeof reader.result === 'string') {
                          setFormData({ ...formData, profile_image: reader.result });
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            </div>
            <h3 className="mt-4 font-semibold">{formData.company_name || 'İşletme Adı'}</h3>
            <p className="text-sm text-muted-foreground">{formData.contact_person || 'Yetkili Kişi'}</p>
            <p className="text-sm text-muted-foreground">{formData.email || 'E-posta'}</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Save className="h-5 w-5" />
              Profil Bilgileri
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="company_name">İşletme Adı</Label>
              <Input
                id="company_name"
                value={formData.company_name || ''}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                
                disabled={isSaving}
              />
            </div>

            <div>
              <Label htmlFor="tax_no">Vergi Kimlik Numarası (VKN)</Label>
              <Input
                id="tax_no"
                value={formData.tax_no || ''}
                onChange={(e) => setFormData({ ...formData, tax_no: e.target.value })}
                
                disabled={isSaving}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  
                  disabled={isSaving}
                />
              </div>

              <div>
                <Label htmlFor="email">E-posta</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  
                  disabled={isSaving}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="contact_person">Yetkili Kişi</Label>
              <Input
                id="contact_person"
                value={formData.contact_person || ''}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                
                disabled={isSaving}
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Kaydet
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
