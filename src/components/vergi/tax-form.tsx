'use client';

import { open as openDialog } from '@tauri-apps/plugin-dialog';

import { useState, useEffect } from 'react';
import { TaxItem } from '@/hooks/use-vergi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';

interface TaxFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    type: string;
    period?: string;
    amount: number;
    due_date: string;
    notes?: string;
    receipt_path?: string;
  }) => Promise<void>;
  initialData?: TaxItem;
  isLoading: boolean;
}

const TAX_TYPES = [
  'KDV',
  'Gelir Vergisi',
  'Kurumlar Vergisi',
  'SGK',
  'Damga Vergisi',
  'Diğer',
];

export function TaxForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isLoading,
}: TaxFormProps) {
  const { addToast } = useToast();
  const [formData, setFormData] = useState({
    type: '',
    period: '',
    amount: '',
    due_date: '',
    notes: '',
    receipt_path: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        type: initialData.type,
        period: initialData.period || '',
        amount: initialData.amount.toString(),
        due_date: initialData.due_date.split('T')[0],
        notes: initialData.notes || '',
        receipt_path: initialData.receipt_path || '',
      });
    } else {
      setFormData({
        type: '',
        period: '',
        amount: '',
        due_date: '',
        notes: '',
        receipt_path: '',
      });
    }
  }, [initialData, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.type || !formData.amount || !formData.due_date) {
      addToast({ title: 'Lütfen zorunlu alanları doldurunuz.', variant: 'destructive' });
      return;
    }

    try {
      await onSubmit({
        type: formData.type,
        period: formData.period || undefined,
        amount: parseFloat(formData.amount),
        due_date: formData.due_date,
        notes: formData.notes || undefined,
        receipt_path: formData.receipt_path || undefined,
      });
      onOpenChange(false);
    } catch (error) {
      // Hata zaten hook tarafından işleniyor
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Vergi Kaydını Düzenle' : 'Vergi Kaydı Ekle'}
          </DialogTitle>
          <DialogDescription>
            Vergi bilgilerini doldurunuz.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Vergi Türü *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, type: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seçiniz" />
              </SelectTrigger>
              <SelectContent>
                {TAX_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="period">Dönem (örn: 2024-01)</Label>
            <Input
              id="period"
              placeholder="2024-01"
              value={formData.period}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, period: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Tutar (₺) *</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              step="0.01"
              value={formData.amount}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, amount: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="due_date">Vade Tarihi *</Label>
            <Input
              id="due_date"
              type="date"
              value={formData.due_date}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, due_date: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notlar</Label>
            <Textarea
              id="notes"
              placeholder="Ek notlar..."
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="receipt_path">Makbuz Dosya Yolu</Label>
            <div className="flex gap-2">
              <Input
                id="receipt_path"
                placeholder="/path/to/receipt.pdf"
                value={formData.receipt_path}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, receipt_path: e.target.value }))
                }
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  try {
                    const selected = await openDialog({
                      multiple: false,
                      directory: false,
                      filters: [{
                        name: 'Makbuz Dosyaları',
                        extensions: ['pdf', 'png', 'jpg', 'jpeg']
                      }]
                    });
                    if (selected && typeof selected === 'string') {
                      setFormData(prev => ({ ...prev, receipt_path: selected }));
                    }
                  } catch (err) {
                    console.error("Dosya seçilemedi:", err);
                  }
                }}
              >
                Gözat
              </Button>
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
