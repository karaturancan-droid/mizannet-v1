'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Company } from '@/hooks/use-cari';

interface CompanyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    tax_no?: string;
    phone?: string;
    email?: string;
    contact_person?: string;
  }) => Promise<void>;
  initialData?: Company;
  isLoading?: boolean;
}

export function CompanyForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isLoading = false,
}: CompanyFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    tax_no: '',
    phone: '',
    email: '',
    contact_person: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        tax_no: initialData.tax_no || '',
        phone: initialData.phone || '',
        email: initialData.email || '',
        contact_person: initialData.contact_person || '',
      });
    } else {
      setFormData({
        name: '',
        tax_no: '',
        phone: '',
        email: '',
        contact_person: '',
      });
    }
    setErrors({});
  }, [open, initialData]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Firma adı gereklidir';
    }

    if (formData.email && !formData.email.includes('@')) {
      newErrors.email = 'Geçerli bir e-posta adresi girin';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit({
        name: formData.name.trim(),
        tax_no: formData.tax_no.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        contact_person: formData.contact_person.trim() || undefined,
      });
      onOpenChange(false);
    } catch (error) {
      // Hata hook tarafından işleniyor
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Firmayı Düzenle' : 'Yeni Firma Ekle'}
          </DialogTitle>
          <DialogDescription>
            {initialData
              ? 'Firma bilgilerini güncelleyin'
              : 'Yeni bir firma oluşturun'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Firma Adı */}
          <div className="space-y-2">
            <Label htmlFor="name">Firma Adı *</Label>
            <Input
              id="name"
              
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              disabled={isLoading}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          {/* VKN */}
          <div className="space-y-2">
            <Label htmlFor="tax_no">Vergi Kimlik Numarası (VKN)</Label>
            <Input
              id="tax_no"
              
              value={formData.tax_no}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, tax_no: e.target.value }))
              }
              disabled={isLoading}
            />
          </div>

          {/* Telefon */}
          <div className="space-y-2">
            <Label htmlFor="phone">Telefon</Label>
            <Input
              id="phone"
              
              value={formData.phone}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, phone: e.target.value }))
              }
              disabled={isLoading}
            />
          </div>

          {/* E-posta */}
          <div className="space-y-2">
            <Label htmlFor="email">E-posta</Label>
            <Input
              id="email"
              type="email"
              
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              disabled={isLoading}
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email}</p>
            )}
          </div>

          {/* Yetkili Kişi */}
          <div className="space-y-2">
            <Label htmlFor="contact_person">Yetkili Kişi</Label>
            <Input
              id="contact_person"
              
              value={formData.contact_person}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  contact_person: e.target.value,
                }))
              }
              disabled={isLoading}
            />
          </div>
        </form>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            İptal
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
