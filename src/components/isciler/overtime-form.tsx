'use client';

import { useState, useEffect } from 'react';
import { Overtime } from '@/hooks/use-isciler';
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

interface OvertimeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    date: string;
    hours: number;
    rate: number;
  }) => Promise<void>;
  workerId: string;
  initialData?: Overtime;
  isLoading: boolean;
}

export function OvertimeForm({
  open,
  onOpenChange,
  onSubmit,
  workerId,
  initialData,
  isLoading,
}: OvertimeFormProps) {
  const { addToast } = useToast();
  const [formData, setFormData] = useState({
    date: '',
    hours: '',
    rate: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        date: initialData.date.split('T')[0],
        hours: initialData.hours.toString(),
        rate: initialData.rate.toString(),
      });
    } else {
      setFormData({
        date: '',
        hours: '',
        rate: '',
      });
    }
  }, [initialData, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.date || !formData.hours || !formData.rate) {
      addToast({ title: 'Lütfen tüm alanları doldurunuz.', variant: 'destructive' });
      return;
    }

    try {
      await onSubmit({
        date: formData.date,
        hours: parseFloat(formData.hours),
        rate: parseFloat(formData.rate),
      });
      onOpenChange(false);
    } catch (error) {
      // Hata zaten hook tarafından işleniyor
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Mesai Ekle</DialogTitle>
          <DialogDescription>
            Mesai bilgilerini doldurunuz.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Tarih *</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, date: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hours">Saat *</Label>
            <Input
              id="hours"
              type="number"
              
              step="0.5"
              value={formData.hours}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, hours: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rate">Oran *</Label>
            <Input
              id="rate"
              type="number"
              
              step="0.1"
              value={formData.rate}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, rate: e.target.value }))
              }
            />
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
