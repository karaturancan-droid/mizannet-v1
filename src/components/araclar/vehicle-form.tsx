'use client';

import { useState } from 'react';
import { Vehicle } from '@/hooks/use-araclar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface VehicleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: Vehicle;
  loading: boolean;
}

export function VehicleForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  loading,
}: VehicleFormProps) {
  const [formData, setFormData] = useState({
    plate: initialData?.plate || '',
    category: initialData?.category || 'Otomobil',
    brand: initialData?.brand || '',
    model: initialData?.model || '',
    year: initialData?.year?.toString() || '',
    status: initialData?.status || 'aktif' as 'aktif' | 'bakımda' | 'pasif',
    km: initialData?.km?.toString() || '',
    inspection_due_date: initialData?.inspection_due_date || '',
    insurance_due_date: initialData?.insurance_due_date || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit({
        plate: formData.plate,
        category: formData.category || undefined,
        brand: formData.brand || undefined,
        model: formData.model || undefined,
        year: formData.year ? parseInt(formData.year) : undefined,
        status: formData.status,
        km: formData.km ? parseInt(formData.km) : undefined,
        inspection_due_date: formData.inspection_due_date || undefined,
        insurance_due_date: formData.insurance_due_date || undefined,
      });
      onOpenChange(false);
    } catch (err) {
      // Error is handled by the hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Aracı Düzenle' : 'Yeni Araç Ekle'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="plate">Plaka *</Label>
              <Input
                id="plate"
                value={formData.plate}
                onChange={(e) => setFormData({ ...formData, plate: e.target.value })}
                required
                disabled={loading}
                
              />
            </div>
            <div>
              <Label htmlFor="category">Araç Tipi</Label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                disabled={loading}
                className="w-full px-3 py-2 border border-input rounded-md bg-card"
              >
                <option value="Otomobil">Otomobil</option>
                <option value="Kamyonet">Kamyonet</option>
                <option value="Kamyon">Kamyon</option>
                <option value="Tır">Tır</option>
                <option value="Traktör">Traktör</option>
                <option value="Minibüs">Minibüs</option>
                <option value="Otobüs">Otobüs</option>
                <option value="Motosiklet">Motosiklet</option>
                <option value="Diğer">Diğer</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="brand">Marka</Label>
              <Input
                id="brand"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="year">Yıl</Label>
              <Input
                id="year"
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="km">KM</Label>
              <Input
                id="km"
                type="number"
                value={formData.km}
                onChange={(e) => setFormData({ ...formData, km: e.target.value })}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="status">Durum *</Label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value as 'aktif' | 'bakımda' | 'pasif' })
              }
              disabled={loading}
              className="w-full px-3 py-2 border border-input rounded-md bg-card"
            >
              <option value="aktif">Aktif</option>
              <option value="bakımda">Bakımda</option>
              <option value="pasif">Pasif</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="inspection_due_date">Muayene Tarihi</Label>
              <Input
                id="inspection_due_date"
                type="date"
                value={formData.inspection_due_date}
                onChange={(e) => setFormData({ ...formData, inspection_due_date: e.target.value })}
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="insurance_due_date">Sigorta Tarihi</Label>
              <Input
                id="insurance_due_date"
                type="date"
                value={formData.insurance_due_date}
                onChange={(e) => setFormData({ ...formData, insurance_due_date: e.target.value })}
                disabled={loading}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              İptal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
