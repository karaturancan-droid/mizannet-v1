'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCari, type Company, type LedgerEntry } from '@/hooks/use-cari';
import { CompanyList } from '@/components/cari/company-list';
import { CompanyForm } from '@/components/cari/company-form';
import { CompanyDetails } from '@/components/cari/company-details';
import { LedgerForm } from '@/components/cari/ledger-form';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { exportToExcel } from '@/lib/excel';
import { formatDateTR } from '@/lib/format';
import { PaymentForm } from '@/components/cari/payment-form';

function CariContent() {
  const searchParams = useSearchParams();
  const urlId = searchParams.get('id');
  const cari = useCari();
  const { addToast } = useToast();
  const [companyFormOpen, setCompanyFormOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [ledgerFormOpen, setLedgerFormOpen] = useState(false);
  const [editingLedgerEntry, setEditingLedgerEntry] = useState<LedgerEntry | null>(null);
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);

  const selectedCompany = cari.companies.find(
    (c) => c.id === cari.selectedCompanyId
  );

  useEffect(() => {
    if (urlId && cari.companies.some(c => c.id === urlId)) {
      if (cari.selectedCompanyId !== urlId) {
        cari.selectCompany(urlId);
      }
    }
  }, [urlId, cari.companies, cari.selectedCompanyId, cari.selectCompany]);

  const showConfirm = (title: string, description: string, onConfirm: () => void) => {
    setConfirmConfig({ title, description, onConfirm });
    setConfirmOpen(true);
  };

  // Firma Formu İşlemleri
  const handleAddCompany = useCallback(() => {
    setEditingCompany(null);
    setCompanyFormOpen(true);
  }, []);

  const handleEditCompany = useCallback(() => {
    if (selectedCompany) {
      setEditingCompany(selectedCompany);
      setCompanyFormOpen(true);
    }
  }, [selectedCompany]);

  const handleDeleteCompany = useCallback(() => {
    if (!selectedCompany) return;
    showConfirm(
      'Firmayı Sil',
      `"${selectedCompany.name}" firmasını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`,
      async () => {
        try {
          await cari.deleteCompany(selectedCompany.id);
          addToast({ title: 'Firma silindi', variant: 'success' });
        } catch (error) {
          addToast({ title: 'Hata', description: 'Firma silinemedi', variant: 'destructive' });
        }
      }
    );
  }, [selectedCompany, cari, addToast]);

  const handleSubmitCompanyForm = useCallback(
    async (data: {
      name: string;
      tax_no?: string;
      phone?: string;
      email?: string;
      contact_person?: string;
    }) => {
      try {
        if (editingCompany) {
          await cari.updateCompany(editingCompany.id, data);
          addToast({ title: 'Firma güncellendi', variant: 'success' });
        } else {
          await cari.createCompany(data);
          addToast({ title: 'Firma eklendi', variant: 'success' });
        }
      } catch (error) {
        addToast({ title: 'Hata', description: 'İşlem başarısız', variant: 'destructive' });
      }
    },
    [editingCompany, cari, addToast]
  );

  // Hareket Formu İşlemleri
  const handleAddLedgerEntry = useCallback(() => {
    setEditingLedgerEntry(null);
    setLedgerFormOpen(true);
  }, []);

  const handleEditLedgerEntry = useCallback((entry: LedgerEntry) => {
    setEditingLedgerEntry(entry);
    setLedgerFormOpen(true);
  }, []);

  const handleDeleteLedgerEntry = useCallback(
    (id: string) => {
      showConfirm(
        'Hareketi Sil',
        'Bu hareketi silmek istediğinizden emin misiniz?',
        async () => {
          try {
            await cari.deleteLedgerEntry(id);
            addToast({ title: 'Hareket silindi', variant: 'success' });
          } catch (error) {
            addToast({ title: 'Hata', description: 'Hareket silinemedi', variant: 'destructive' });
          }
        }
      );
    },
    [cari, addToast]
  );

  const handleSubmitLedgerForm = useCallback(
    async (data: {
      date: string;
      document_no?: string;
      description?: string;
      debit: number;
      credit: number;
      entry_type?: string;
    }) => {
      if (!cari.selectedCompanyId) return;
      try {
        if (editingLedgerEntry) {
          await cari.updateLedgerEntry(editingLedgerEntry.id, data);
          addToast({ title: 'Hareket güncellendi', variant: 'success' });
        } else {
          await cari.createLedgerEntry({
            company_id: cari.selectedCompanyId,
            ...data,
          });
          addToast({ title: 'Hareket eklendi', variant: 'success' });
        }
      } catch (error) {
        addToast({ title: 'Hata', description: 'İşlem başarısız', variant: 'destructive' });
      }
    },
    [editingLedgerEntry, cari, addToast]
  );

  const handleSubmitPaymentForm = useCallback(
    async (data: { account_id: string; date: string; amount: number; description?: string }) => {
      if (!cari.selectedCompanyId) return;
      try {
        await cari.payCompanyDebt(cari.selectedCompanyId, data.account_id, data.date, data.amount, data.description);
        addToast({ title: 'Ödeme başarıyla eklendi', variant: 'success' });
        setPaymentFormOpen(false);
      } catch (error) {
        addToast({ title: 'Hata', description: 'Ödeme eklenirken hata oluştu', variant: 'destructive' });
      }
    },
    [cari, addToast]
  );

  // Excel Export
  const handleExportExcel = useCallback(async () => {
    if (!selectedCompany || cari.ledgerEntries.length === 0) return;

    try {
      const fileName = `cari_${selectedCompany.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;
      const columns = [
        { header: 'Sıra', key: (_: any, index: number) => index + 1 },
        { header: 'Tarih', key: (row: LedgerEntry) => new Date(row.date).toLocaleDateString('tr-TR') },
        { header: 'Belge No', key: (row: LedgerEntry) => row.document_no || '-' },
        { header: 'Açıklama', key: (row: LedgerEntry) => row.description || '-' },
        { header: 'Borç (TL)', key: (row: LedgerEntry) => row.debit || 0 },
        { header: 'Alacak (TL)', key: (row: LedgerEntry) => row.credit || 0 },
        { header: 'Bakiye İşlem (TL)', key: (row: LedgerEntry) => row.running_balance || 0 }
      ];

      const success = await exportToExcel(
        fileName,
        'Cari Hareketler',
        cari.ledgerEntries,
        columns as any
      );

      if (success) {
        addToast({ title: 'Dosya başarıyla Excel olarak kaydedildi', variant: 'success' });
      }
    } catch (err) {
      console.error(err);
      addToast({ title: 'Kayıt sırasında hata oluştu', variant: 'destructive' });
    }
  }, [selectedCompany, cari.ledgerEntries, addToast]);

  return (
    <div className="h-full flex gap-4">
      {/* Sol Panel - Firma Listesi */}
      <div className="w-80 border-r">
        <CompanyList
          companies={cari.companies}
          selectedCompanyId={cari.selectedCompanyId}
          onSelectCompany={cari.selectCompany}
          onAddCompany={handleAddCompany}
          loading={cari.loading}
        />
      </div>

      {/* Sağ Panel - Firma Detayları */}
      <div className="flex-1">
        <CompanyDetails
          company={selectedCompany || null}
          ledgerEntries={cari.ledgerEntries}
          ledgerSummary={cari.ledgerSummary}
          yearFilter={cari.yearFilter}
          onChangeYearFilter={cari.changeYearFilter}
          onEditCompany={handleEditCompany}
          onDeleteCompany={handleDeleteCompany}
          onPayDebt={() => setPaymentFormOpen(true)}
          onAddLedgerEntry={handleAddLedgerEntry}
          onEditLedgerEntry={handleEditLedgerEntry}
          onDeleteLedgerEntry={handleDeleteLedgerEntry}
          onExportCSV={handleExportExcel}
          loading={cari.loading}
        />
      </div>

      {/* Firma Formu Dialog */}
      <CompanyForm
        open={companyFormOpen}
        onOpenChange={setCompanyFormOpen}
        onSubmit={handleSubmitCompanyForm}
        initialData={editingCompany || undefined}
        isLoading={cari.loading}
      />

      {/* Hareket Formu Dialog */}
      <LedgerForm
        open={ledgerFormOpen}
        onOpenChange={setLedgerFormOpen}
        onSubmit={handleSubmitLedgerForm}
        initialData={editingLedgerEntry || undefined}
        isLoading={cari.loading}
      />

      <PaymentForm
        open={paymentFormOpen}
        onOpenChange={setPaymentFormOpen}
        onSubmit={handleSubmitPaymentForm}
        isLoading={cari.loading}
      />

      {/* Onay Dialog */}
      {confirmConfig && (
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={confirmConfig.title}
          description={confirmConfig.description}
          confirmLabel="Sil"
          onConfirm={confirmConfig.onConfirm}
        />
      )}
    </div>
  );
}

export default function CariPage() {
  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Yükleniyor...</div>}>
      <CariContent />
    </Suspense>
  );
}
