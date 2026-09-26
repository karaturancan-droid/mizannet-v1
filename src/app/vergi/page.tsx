'use client';

import { useState, useCallback } from 'react';
import { useVergi, type TaxItem } from '@/hooks/use-vergi';
import { TaxList } from '@/components/vergi/tax-list';
import { TaxForm } from '@/components/vergi/tax-form';
import { KdvCalculator } from '@/components/vergi/kdv-calculator';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatCard, StatCardRow } from '@/components/ui/stat-card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { formatCurrencyTRY } from '@/lib/format';

const STATUS_TABS: { value: 'tümü' | 'bekliyor' | 'gecikti' | 'ödendi'; label: string }[] = [
  { value: 'tümü', label: 'Tümü' },
  { value: 'bekliyor', label: 'Bekleyen' },
  { value: 'gecikti', label: 'Gecikmiş' },
  { value: 'ödendi', label: 'Ödenmiş' },
];

export default function VergiPage() {
  const vergi = useVergi();
  const { addToast } = useToast();
  const [taxFormOpen, setTaxFormOpen] = useState(false);
  const [editingTaxItem, setEditingTaxItem] = useState<TaxItem | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{ description: string; onConfirm: () => void } | null>(null);

  const toplamOdenecek = vergi.allTaxItems
    .filter((i) => i.status === 'bekliyor')
    .reduce((sum, i) => sum + i.amount, 0);
  const gecikmisKalemler = vergi.allTaxItems.filter((i) => i.status === 'gecikti');
  const odenmisToplam = vergi.allTaxItems
    .filter((i) => i.status === 'ödendi')
    .reduce((sum, i) => sum + i.amount, 0);

  const showConfirm = (description: string, onConfirm: () => void) => {
    setConfirmConfig({ description, onConfirm });
    setConfirmOpen(true);
  };

  // Vergi Formu İşlemleri
  const handleAddTax = useCallback(() => {
    setEditingTaxItem(null);
    setTaxFormOpen(true);
  }, []);

  const handleEditTax = useCallback((item: TaxItem) => {
    setEditingTaxItem(item);
    setTaxFormOpen(true);
  }, []);

  const handleDeleteTax = useCallback(
    (id: string) => {
      showConfirm(
        'Bu vergi kaydını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
        async () => {
          try {
            await vergi.deleteTaxItem(id);
            addToast({ title: 'Vergi kaydı silindi', variant: 'success' });
          } catch (error) {
            addToast({ title: 'Hata', description: 'Kayıt silinemedi', variant: 'destructive' });
          }
        }
      );
    },
    [vergi, addToast]
  );

  const handleSubmitTaxForm = useCallback(
    async (data: {
      type: string;
      period?: string;
      amount: number;
      due_date: string;
      notes?: string;
      receipt_path?: string;
    }) => {
      try {
        if (editingTaxItem) {
          await vergi.updateTaxItem(editingTaxItem.id, data);
          addToast({ title: 'Vergi kaydı güncellendi', variant: 'success' });
        } else {
          await vergi.createTaxItem(data);
          addToast({ title: 'Vergi kaydı eklendi', variant: 'success' });
        }
      } catch (error) {
        addToast({ title: 'Hata', description: 'İşlem başarısız', variant: 'destructive' });
      }
    },
    [editingTaxItem, vergi, addToast]
  );

  const handleMarkAsPaid = useCallback(
    async (id: string) => {
      try {
        await vergi.markAsPaid(id);
        addToast({ title: 'Ödendi olarak işaretlendi', variant: 'success' });
      } catch (error) {
        addToast({ title: 'Hata', description: 'İşlem başarısız', variant: 'destructive' });
      }
    },
    [vergi, addToast]
  );

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Başlık */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Vergi Takibi</h1>
        <Button onClick={handleAddTax}>+ Yeni Vergi</Button>
      </div>

      <KdvCalculator />

      <StatCardRow>
        <StatCard label="Toplam" value={vergi.allTaxItems.length} />
        <StatCard label="Ödenecek" value={formatCurrencyTRY(toplamOdenecek)} variant="warning" />
        <StatCard
          label="Gecikmiş"
          value={`${gecikmisKalemler.length} · ${formatCurrencyTRY(gecikmisKalemler.reduce((s, i) => s + i.amount, 0))}`}
          variant={gecikmisKalemler.length > 0 ? 'danger' : 'default'}
        />
        <StatCard label="Ödenmiş" value={formatCurrencyTRY(odenmisToplam)} variant="success" />
      </StatCardRow>

      {/* Durum Sekmeleri */}
      <div className="flex gap-1 rounded-md bg-muted/50 p-1 w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => vergi.setStatusFilter(tab.value)}
            className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              vergi.statusFilter === tab.value
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Vergi Listesi */}
      <Card className="flex-1">
        <CardContent className="pt-6">
          <TaxList
            items={vergi.taxItems}
            loading={vergi.loading}
            onEdit={handleEditTax}
            onDelete={handleDeleteTax}
            onMarkAsPaid={handleMarkAsPaid}
          />
        </CardContent>
      </Card>

      {/* Vergi Formu Dialog */}
      <TaxForm
        open={taxFormOpen}
        onOpenChange={setTaxFormOpen}
        onSubmit={handleSubmitTaxForm}
        initialData={editingTaxItem || undefined}
        isLoading={vergi.loading}
      />

      {/* Onay Dialog */}
      {confirmConfig && (
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Vergi Kaydını Sil"
          description={confirmConfig.description}
          confirmLabel="Sil"
          onConfirm={confirmConfig.onConfirm}
        />
      )}
    </div>
  );
}
