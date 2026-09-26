'use client';

import { useState, useEffect } from 'react';
import { Leave } from '@/hooks/use-isciler';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';

interface LeaveFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    start_date: string;
    end_date: string;
    type?: string;
    days?: number;
  }) => Promise<void>;
  workerId: string;
  initialData?: Leave;
  isLoading: boolean;
}

const LEAVE_TYPES = [
  'Yıllık',
  'Hastalık',
  'Mazeret',
  'Diğer',
];

export function LeaveForm({
  open,
  onOpenChange,
  onSubmit,
  workerId,
  initialData,
  isLoading,
}: LeaveFormProps) {
  const { addToast } = useToast();
  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    type: '',
    days: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        start_date: initialData.start_date.split('T')[0],
        end_date: initialData.end_date.split('T')[0],
        type: initialData.type || '',
        days: initialData.days?.toString() || '',
      });
    } else {
      setFormData({
        start_date: '',
        end_date: '',
        type: '',
        days: '',
      });
    }
  }, [initialData, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.start_date || !formData.end_date) {
      addToast({ title: 'Lütfen başlangıç ve bitiş tarihlerini doldurunuz.', variant: 'destructive' });
      return;
    }

    try {
      await onSubmit({
        start_date: formData.start_date,
        end_date: formData.end_date,
        type: formData.type || undefined,
        days: formData.days ? parseInt(formData.days) : undefined,
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
          <DialogTitle>İzin Ekle</DialogTitle>
          <DialogDescription>
            İzin bilgilerini doldurunuz.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="start_date">Başlangıç Tarihi *</Label>
            <Input
              id="start_date"
              type="date"
              value={formData.start_date}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, start_date: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end_date">Bitiş Tarihi *</Label>
            <Input
              id="end_date"
              type="date"
              value={formData.end_date}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, end_date: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">İzin Türü</Label>
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
                {LEAVE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="days">Gün Sayısı</Label>
            <Input
              id="days"
              type="number"
              placeholder="0"
              value={formData.days}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, days: e.target.value }))
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
