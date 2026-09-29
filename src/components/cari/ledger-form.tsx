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
import { Textarea } from '@/components/ui/textarea';
import { parseTurkishNumber, formatCurrencyTRY } from '@/lib/format';
import type { LedgerEntry } from '@/hooks/use-cari';

interface LedgerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    date: string;
    document_no?: string;
    description?: string;
    debit: number;
    credit: number;
    entry_type?: string;
  }) => Promise<void>;
  initialData?: LedgerEntry;
  isLoading?: boolean;
}

export function LedgerForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isLoading = false,
}: LedgerFormProps) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    document_no: '',
    description: '',
    debit: '',
    credit: '',
    entry_type: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        date: initialData.date,
        document_no: initialData.document_no || '',
        description: initialData.description || '',
        debit: initialData.debit > 0 ? initialData.debit.toString() : '',
        credit: initialData.credit > 0 ? initialData.credit.toString() : '',
        entry_type: initialData.entry_type || '',
      });
    } else {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        document_no: '',
        description: '',
        debit: '',
        credit: '',
        entry_type: '',
      });
    }
    setErrors({});
  }, [open, initialData]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.date) {
      newErrors.date = 'Tarih gereklidir';
    }

    const debit = parseTurkishNumber(formData.debit);
    const credit = parseTurkishNumber(formData.credit);

    if (debit === 0 && credit === 0) {
      newErrors.amount = 'Firmadan Alacak veya Firmaya Borç değeri girilmelidir';
    }

    if (debit > 0 && credit > 0) {
      newErrors.amount = 'Aynı anda hem Firmadan Alacak hem Firmaya Borç girilemez';
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
      const debit = parseTurkishNumber(formData.debit);
      const credit = parseTurkishNumber(formData.credit);

      await onSubmit({
        date: formData.date,
        document_no: formData.document_no.trim() || undefined,
        description: formData.description.trim() || undefined,
        debit,
        credit,
        entry_type: formData.entry_type.trim() || undefined,
      });
      onOpenChange(false);
    } catch (error) {
      // Hata hook tarafından işleniyor
    }
  };

  const debit = parseTurkishNumber(formData.debit);
  const credit = parseTurkishNumber(formData.credit);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Hareketi Düzenle' : 'Yeni Hareket Ekle'}
          </DialogTitle>
          <DialogDescription>
            {initialData
              ? 'Hareket bilgilerini güncelleyin'
              : 'Yeni bir cari hareket oluşturun'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tarih */}
          <div className="space-y-2">
            <Label htmlFor="date">Tarih *</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, date: e.target.value }))
              }
              disabled={isLoading}
              className={errors.date ? 'border-red-500' : ''}
            />
            {errors.date && (
              <p className="text-sm text-red-500">{errors.date}</p>
            )}
          </div>

          {/* Belge No */}
          <div className="space-y-2">
            <Label htmlFor="document_no">Belge No</Label>
            <Input
              id="document_no"
              
              value={formData.document_no}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  document_no: e.target.value,
                }))
              }
              disabled={isLoading}
            />
          </div>

          {/* Açıklama */}
          <div className="space-y-2">
            <Label htmlFor="description">Açıklama</Label>
            <Textarea
              id="description"
              
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              disabled={isLoading}
              rows={3}
            />
          </div>

          {/* Firmadan Alacak ve Firmaya Borç */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="debit">Firmadan Alacak (₺)</Label>
              <Input
                id="debit"
                
                value={formData.debit}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, debit: e.target.value }))
                }
                disabled={isLoading}
              />
              {debit > 0 && (
                <p className="text-xs text-gray-600">
                  {formatCurrencyTRY(debit)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="credit">Firmaya Borç (₺)</Label>
              <Input
                id="credit"
                
                value={formData.credit}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, credit: e.target.value }))
                }
                disabled={isLoading}
              />
              {credit > 0 && (
                <p className="text-xs text-gray-600">
                  {formatCurrencyTRY(credit)}
                </p>
              )}
            </div>
          </div>

          {errors.amount && (
            <p className="text-sm text-red-500">{errors.amount}</p>
          )}

          {/* Hareket Türü */}
          <div className="space-y-2">
            <Label htmlFor="entry_type">Hareket Türü</Label>
            <Input
              id="entry_type"
              
              value={formData.entry_type}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  entry_type: e.target.value,
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
