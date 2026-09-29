'use client';

import { useState, useEffect } from 'react';
import { Invoice } from '@/hooks/use-fatura-aktarim';
import { formatCurrencyTRY, formatDateTR } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ChevronLeft } from 'lucide-react';

interface InvoicePreviewProps {
  invoice: Invoice;
  onConfirm: () => Promise<void>;
  onBack: () => void;
  onUpdate: (data: Partial<Invoice>) => void;
  isLoading?: boolean;
}

export function InvoicePreview({
  invoice,
  onConfirm,
  onBack,
  onUpdate,
  isLoading = false,
}: InvoicePreviewProps) {
  const [formData, setFormData] = useState<Partial<Invoice>>(invoice);

  useEffect(() => {
    setFormData(invoice);
  }, [invoice]);

  const handleChange = (field: keyof Invoice, value: any) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    onUpdate(updated);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Adım 2: Fatura Bilgilerini Gözden Geçir</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="company_id">Firma ID</Label>
            <Input
              id="company_id"
              value={formData.company_id || ''}
              onChange={(e) => handleChange('company_id', e.target.value)}
              
              disabled={isLoading}
            />
          </div>

          <div>
            <Label htmlFor="invoice_no">Fatura No</Label>
            <Input
              id="invoice_no"
              value={formData.invoice_no || ''}
              onChange={(e) => handleChange('invoice_no', e.target.value)}
              
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="date">Tarih</Label>
            <Input
              id="date"
              type="date"
              value={formData.date || ''}
              onChange={(e) => handleChange('date', e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div>
            <Label htmlFor="iban">IBAN</Label>
            <Input
              id="iban"
              value={formData.iban || ''}
              onChange={(e) => handleChange('iban', e.target.value)}
              
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="subtotal">Ara Toplam</Label>
            <Input
              id="subtotal"
              type="number"
              step="0.01"
              value={formData.subtotal || ''}
              onChange={(e) => handleChange('subtotal', parseFloat(e.target.value))}
              
              disabled={isLoading}
            />
          </div>

          <div>
            <Label htmlFor="vat_amount">KDV</Label>
            <Input
              id="vat_amount"
              type="number"
              step="0.01"
              value={formData.vat_amount || ''}
              onChange={(e) => handleChange('vat_amount', parseFloat(e.target.value))}
              
              disabled={isLoading}
            />
          </div>

          <div>
            <Label htmlFor="total">Toplam</Label>
            <Input
              id="total"
              type="number"
              step="0.01"
              value={formData.total || ''}
              onChange={(e) => handleChange('total', parseFloat(e.target.value))}
              
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
          <p>
            <strong>Not:</strong> Fatura bilgilerini gözden geçirin ve gerekirse düzenleyin.
            Onayladıktan sonra muhasebe defterine otomatik olarak kaydedilecektir.
          </p>
        </div>

        <div className="flex gap-2 justify-end pt-4">
          <Button onClick={onBack} disabled={isLoading} variant="outline">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Geri
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Onayla
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
