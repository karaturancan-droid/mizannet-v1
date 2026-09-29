'use client';

import { useState, useEffect } from 'react';
import { Payroll } from '@/hooks/use-isciler';
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

interface PayrollFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    period: string;
    gross?: number;
    net?: number;
    deductions?: number;
    status: 'taslak' | 'ödendi';
    receipt_path?: string;
  }) => Promise<void>;
  workerId: string;
  initialData?: Payroll;
  isLoading: boolean;
}

export function PayrollForm({
  open,
  onOpenChange,
  onSubmit,
  workerId,
  initialData,
  isLoading,
}: PayrollFormProps) {
  const { addToast } = useToast();
  const [formData, setFormData] = useState({
    period: '',
    gross: '',
    net: '',
    deductions: '',
    status: 'taslak' as 'taslak' | 'ödendi',
    receipt_path: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        period: initialData.period,
        gross: initialData.gross?.toString() || '',
        net: initialData.net?.toString() || '',
        deductions: initialData.deductions?.toString() || '',
        status: initialData.status,
        receipt_path: initialData.receipt_path || '',
      });
    } else {
      setFormData({
        period: '',
        gross: '',
        net: '',
        deductions: '',
        status: 'taslak',
        receipt_path: '',
      });
    }
  }, [initialData, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.period) {
      addToast({ title: 'Lütfen dönem bilgisini doldurunuz.', variant: 'destructive' });
      return;
    }

    try {
      await onSubmit({
        period: formData.period,
        gross: formData.gross ? parseFloat(formData.gross) : undefined,
        net: formData.net ? parseFloat(formData.net) : undefined,
        deductions: formData.deductions ? parseFloat(formData.deductions) : undefined,
        status: formData.status,
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
            {initialData ? 'Maaşı Düzenle' : 'Maaş Ekle'}
          </DialogTitle>
          <DialogDescription>
            Maaş bilgilerini doldurunuz.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="period">Dönem (örn: 2024-01) *</Label>
            <Input
              id="period"
              
              value={formData.period}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, period: e.target.value }))
              }
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gross">Brüt (₺)</Label>
              <Input
                id="gross"
                type="number"
                
                step="0.01"
                value={formData.gross}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, gross: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="net">Net (₺)</Label>
              <Input
                id="net"
                type="number"
                
                step="0.01"
                value={formData.net}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, net: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deductions">Kesintiler (₺)</Label>
              <Input
                id="deductions"
                type="number"
                
                step="0.01"
                value={formData.deductions}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, deductions: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Durum</Label>
            <Select
              value={formData.status}
              onValueChange={(value: 'taslak' | 'ödendi') =>
                setFormData((prev) => ({ ...prev, status: value }))
              }
            >
              <SelectTrigger>
                <SelectValue  />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="taslak">Taslak</SelectItem>
                <SelectItem value="ödendi">Ödendi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="receipt_path">Makbuz Dosya Yolu</Label>
            <Input
              id="receipt_path"
              
              value={formData.receipt_path}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, receipt_path: e.target.value }))
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
