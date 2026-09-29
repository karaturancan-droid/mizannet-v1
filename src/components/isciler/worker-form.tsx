'use client';

import { useState, useEffect } from 'react';
import { Worker } from '@/hooks/use-isciler';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';

interface WorkerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    full_name: string;
    tc_no?: string;
    birth_date?: string;
    hire_date?: string;
    exit_date?: string;
    position?: string;
    sgk_no?: string;
    iban?: string;
    salary: number;
    contract_end_date?: string;
    image_path?: string;
    phone?: string;
    email?: string;
  }) => Promise<void>;
  initialData?: Worker;
  isLoading: boolean;
}

export function WorkerForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isLoading,
}: WorkerFormProps) {
  const { addToast } = useToast();
  const [formData, setFormData] = useState({
    full_name: '',
    tc_no: '',
    birth_date: '',
    hire_date: '',
    exit_date: '',
    position: '',
    sgk_no: '',
    iban: '',
    salary: '',
    contract_end_date: '',
    image_path: '',
    phone: '',
    email: '',
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, image_path: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (initialData) {
      setFormData({
        full_name: initialData.full_name,
        tc_no: initialData.tc_no || '',
        birth_date: initialData.birth_date ? initialData.birth_date.split('T')[0] : '',
        hire_date: initialData.hire_date ? initialData.hire_date.split('T')[0] : '',
        exit_date: initialData.exit_date ? initialData.exit_date.split('T')[0] : '',
        position: initialData.position || '',
        sgk_no: initialData.sgk_no || '',
        iban: initialData.iban || '',
        salary: initialData.salary.toString(),
        contract_end_date: initialData.contract_end_date ? initialData.contract_end_date.split('T')[0] : '',
        image_path: initialData.image_path || '',
        phone: initialData.phone || '',
        email: initialData.email || '',
      });
    } else {
      setFormData({
        full_name: '',
        tc_no: '',
        birth_date: '',
        hire_date: '',
        exit_date: '',
        position: '',
        sgk_no: '',
        iban: '',
        salary: '',
        contract_end_date: '',
        image_path: '',
        phone: '',
        email: '',
      });
    }
  }, [initialData, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name || !formData.salary) {
      addToast({ title: 'Lütfen zorunlu alanları doldurunuz.', variant: 'destructive' });
      return;
    }

    try {
      await onSubmit({
        full_name: formData.full_name,
        tc_no: formData.tc_no || undefined,
        birth_date: formData.birth_date || undefined,
        hire_date: formData.hire_date || undefined,
        exit_date: formData.exit_date || undefined,
        position: formData.position || undefined,
        sgk_no: formData.sgk_no || undefined,
        iban: formData.iban || undefined,
        salary: parseFloat(formData.salary),
        contract_end_date: formData.contract_end_date || undefined,
        image_path: formData.image_path || undefined,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
      });
      onOpenChange(false);
    } catch (error) {
      // Hata zaten hook tarafından işleniyor
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'İşçiyi Düzenle' : 'İşçi Ekle'}
          </DialogTitle>
          <DialogDescription>
            İşçi bilgilerini doldurunuz.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Ad Soyad *</Label>
            <Input
              id="full_name"
              
              value={formData.full_name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, full_name: e.target.value }))
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tc_no">TC Kimlik No</Label>
              <Input
                id="tc_no"
                
                value={formData.tc_no}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, tc_no: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="birth_date">Doğum Tarihi</Label>
              <Input
                id="birth_date"
                type="date"
                value={formData.birth_date}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, birth_date: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hire_date">İşe Giriş Tarihi</Label>
              <Input
                id="hire_date"
                type="date"
                value={formData.hire_date}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, hire_date: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="exit_date">Ayrılış Tarihi</Label>
              <Input
                id="exit_date"
                type="date"
                value={formData.exit_date}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, exit_date: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="position">Pozisyon</Label>
            <Input
              id="position"
              
              value={formData.position}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, position: e.target.value }))
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sgk_no">SGK No</Label>
              <Input
                id="sgk_no"
                
                value={formData.sgk_no}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, sgk_no: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="iban">IBAN</Label>
              <Input
                id="iban"
                
                value={formData.iban}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, iban: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salary">Maaş (₺) *</Label>
              <Input
                id="salary"
                type="number"
                
                step="0.01"
                value={formData.salary}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, salary: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contract_end_date">Sözleşme Bitiş Tarihi</Label>
              <Input
                id="contract_end_date"
                type="date"
                value={formData.contract_end_date}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, contract_end_date: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>İşçi Fotoğrafı (Opsiyonel)</Label>
            <div className="mt-2 flex items-center gap-4">
              {formData.image_path ? (
                <img
                  src={formData.image_path.startsWith('data:') ? formData.image_path : `file://${formData.image_path}`}
                  alt="Preview"
                  className="w-16 h-16 object-cover rounded-full border shadow-sm"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-muted border flex items-center justify-center text-muted-foreground text-xs shadow-sm">
                  Yok
                </div>
              )}
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                disabled={isLoading}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              İptal
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
