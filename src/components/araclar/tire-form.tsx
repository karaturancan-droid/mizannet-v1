'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface TireFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => Promise<void>;
  loading: boolean;
}

export function TireForm({
  open,
  onOpenChange,
  onSubmit,
  loading,
}: TireFormProps) {
  const [formData, setFormData] = useState({
    position: '',
    dot_code: '',
    tread_depth: '',
    change_date: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit({
        position: formData.position || undefined,
        dot_code: formData.dot_code || undefined,
        tread_depth: formData.tread_depth ? parseFloat(formData.tread_depth) : undefined,
        change_date: formData.change_date || undefined,
      });
      setFormData({
        position: '',
        dot_code: '',
        tread_depth: '',
        change_date: '',
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
          <DialogTitle>Lastik Ekle</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="position">Pozisyon</Label>
            <Input
              id="position"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              disabled={loading}
              
            />
          </div>

          <div>
            <Label htmlFor="dot_code">DOT Kodu</Label>
            <Input
              id="dot_code"
              value={formData.dot_code}
              onChange={(e) => setFormData({ ...formData, dot_code: e.target.value })}
              disabled={loading}
              
            />
          </div>

          <div>
            <Label htmlFor="tread_depth">Diş Derinliği (mm)</Label>
            <Input
              id="tread_depth"
              type="number"
              step="0.1"
              value={formData.tread_depth}
              onChange={(e) => setFormData({ ...formData, tread_depth: e.target.value })}
              disabled={loading}
              
            />
          </div>

          <div>
            <Label htmlFor="change_date">Değişim Tarihi</Label>
            <Input
              id="change_date"
              type="date"
              value={formData.change_date}
              onChange={(e) => setFormData({ ...formData, change_date: e.target.value })}
              disabled={loading}
            />
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
