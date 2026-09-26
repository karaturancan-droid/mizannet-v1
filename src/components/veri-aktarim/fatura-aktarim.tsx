'use client';

import { useState } from 'react';
import { useFaturaAktarim, Invoice } from '@/hooks/use-fatura-aktarim';
import { InvoiceUpload } from '@/components/fatura-aktarim/invoice-upload';
import { InvoicePreview } from '@/components/fatura-aktarim/invoice-preview';
import { InvoiceApproval } from '@/components/fatura-aktarim/invoice-approval';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { CheckCircle } from 'lucide-react';

type Step = 'upload' | 'preview' | 'approval' | 'success';

export function FaturaAktarimPage() {
  const { uploadAndExtractInvoice, approveInvoice, rejectInvoice, updateInvoice, loading } =
    useFaturaAktarim();
  const { addToast } = useToast();
  const [step, setStep] = useState<Step>('upload');
  const [invoice, setInvoice] = useState<Invoice | null>(null);

  const handleFileSelect = async (file: File) => {
    try {
      const result = await uploadAndExtractInvoice(file);
      setInvoice(result);
      setStep('preview');
      addToast({ title: 'Fatura başarıyla yüklendi ve işlendi', variant: 'success' });
    } catch (err) {
      addToast({
        title: 'Fatura yüklenemedi',
        description: err instanceof Error ? err.message : 'Bilinmeyen hata',
        variant: 'destructive',
      });
    }
  };

  const handleApprove = async () => {
    if (!invoice?.id) return;

    try {
      await approveInvoice(invoice.id);
      setStep('success');
      addToast({ title: 'Fatura onaylandı ve muhasebe defterine kaydedildi', variant: 'success' });
    } catch (err) {
      addToast({
        title: 'Fatura onaylanamadı',
        description: err instanceof Error ? err.message : 'Bilinmeyen hata',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async () => {
    if (!invoice?.id) return;

    try {
      await rejectInvoice(invoice.id);
      setStep('upload');
      setInvoice(null);
      addToast({ title: 'Fatura reddedildi', variant: 'default' });
    } catch (err) {
      addToast({
        title: 'Fatura reddedilemedi',
        description: err instanceof Error ? err.message : 'Bilinmeyen hata',
        variant: 'destructive',
      });
    }
  };

  const handleUpdate = (data: Partial<Invoice>) => {
    if (!invoice?.id) return;
    setInvoice({ ...invoice, ...data });
  };

  const handleReset = () => {
    setStep('upload');
    setInvoice(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Fatura Aktarımı</h1>
        <p className="text-muted-foreground">PDF, JPG veya PNG formatındaki faturalardan veri çıkarın</p>
      </div>

      {step === 'upload' && <InvoiceUpload onFileSelect={handleFileSelect} isLoading={loading} />}

      {step === 'preview' && invoice && (
        <InvoicePreview
          invoice={invoice}
          onConfirm={async () => setStep('approval')}
          onBack={() => setStep('upload')}
          onUpdate={handleUpdate}
          isLoading={loading}
        />
      )}

      {step === 'approval' && invoice && (
        <InvoiceApproval
          invoice={invoice}
          onApprove={handleApprove}
          onReject={handleReject}
          onReset={handleReset}
          isLoading={loading}
        />
      )}

      {step === 'success' && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Başarılı
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-green-800">
              Fatura başarıyla onaylandı ve muhasebe defterine kaydedildi.
            </p>
            <Button onClick={handleReset} className="bg-green-600 hover:bg-green-700 text-white">
              Yeni Fatura Yükle
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
