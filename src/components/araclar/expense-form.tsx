'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { parseTurkishNumber } from '@/lib/format';

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => Promise<void>;
  loading: boolean;
}

const expenseTypes = [
  { value: 'yakıt', label: 'Yakıt' },
  { value: 'bakım', label: 'Bakım' },
  { value: 'muayene', label: 'Muayene' },
  { value: 'sigorta', label: 'Sigorta' },
  { value: 'HGS-KGS', label: 'HGS-KGS' },
  { value: 'diğer', label: 'Diğer' },
];

export function ExpenseForm({
  open,
  onOpenChange,
  onSubmit,
  loading,
}: ExpenseFormProps) {
  const [formData, setFormData] = useState({
    type: 'yakıt',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    note: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit({
        type: formData.type,
        amount: parseTurkishNumber(formData.amount),
        date: formData.date,
        note: formData.note || undefined,
      });
      setFormData({
        type: 'yakıt',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        note: '',
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
          <DialogTitle>Masraf Ekle</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="type">Masraf Tipi *</Label>
            <select
              id="type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              disabled={loading}
              className="w-full px-3 py-2 border border-input rounded-md bg-card"
            >
              {expenseTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="amount">Tutar (₺) *</Label>
            <Input
              id="amount"
              type="text"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
              disabled={loading}
              
            />
          </div>

          <div>
            <Label htmlFor="date">Tarih *</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="note">Not</Label>
            <Textarea
              id="note"
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
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
