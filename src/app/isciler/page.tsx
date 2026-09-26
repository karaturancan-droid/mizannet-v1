'use client';

import { useState, useCallback } from 'react';
import { useIsciler, type Worker, type Payroll } from '@/hooks/use-isciler';
import { WorkerList } from '@/components/isciler/worker-list';
import { WorkerForm } from '@/components/isciler/worker-form';
import { WorkerDetails } from '@/components/isciler/worker-details';
import { LeaveForm } from '@/components/isciler/leave-form';
import { OvertimeForm } from '@/components/isciler/overtime-form';
import { PayrollForm } from '@/components/isciler/payroll-form';
import { AdvanceForm } from '@/components/isciler/advance-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard, StatCardRow } from '@/components/ui/stat-card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { formatCurrencyTRY } from '@/lib/format';

export default function IscilerPage() {
  const isciler = useIsciler();
  const { addToast } = useToast();
  const [workerFormOpen, setWorkerFormOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [leaveFormOpen, setLeaveFormOpen] = useState(false);
  const [overtimeFormOpen, setOvertimeFormOpen] = useState(false);
  const [payrollFormOpen, setPayrollFormOpen] = useState(false);
  const [advanceFormOpen, setAdvanceFormOpen] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState<Payroll | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{ title: string; description: string; onConfirm: () => void } | null>(null);

  const selectedWorker = isciler.workers.find(
    (w) => w.id === isciler.selectedWorkerId
  );
  const aktifIsciler = isciler.workers.filter((w) => !w.exit_date);
  const aylikMaasToplami = aktifIsciler.reduce((sum, w) => sum + (w.salary || 0), 0);

  const showConfirm = (title: string, description: string, onConfirm: () => void) => {
    setConfirmConfig({ title, description, onConfirm });
    setConfirmOpen(true);
  };

  // İşçi Formu İşlemleri
  const handleAddWorker = useCallback(() => {
    setEditingWorker(null);
    setWorkerFormOpen(true);
  }, []);

  const handleEditWorker = useCallback((worker: Worker) => {
    setEditingWorker(worker);
    setWorkerFormOpen(true);
  }, []);

  const handleDeleteWorker = useCallback(
    (id: string) => {
      showConfirm(
        'İşçiyi Sil',
        'Bu işçi kaydını silmek istediğinizden emin misiniz? Tüm ilgili kayıtlar (izin, mesai, maaş) da silinecektir.',
        async () => {
          try {
            await isciler.deleteWorker(id);
            addToast({ title: 'İşçi silindi', variant: 'success' });
          } catch (error) {
            addToast({ title: 'Hata', description: 'İşçi silinemedi', variant: 'destructive' });
          }
        }
      );
    },
    [isciler, addToast]
  );

  const handleSubmitWorkerForm = useCallback(
    async (data: {
      full_name: string;
      tc_no?: string;
      birth_date?: string;
      hire_date?: string;
      exit_date?: string;
      position?: string;
      sgk_no?: string;
      iban?: string;
      salary: number;
      contract_end_date?: string;
      image_path?: string;
      phone?: string;
      email?: string;
    }) => {
      try {
        if (editingWorker) {
          await isciler.updateWorker(editingWorker.id, data);
          addToast({ title: 'İşçi bilgileri güncellendi', variant: 'success' });
        } else {
          await isciler.createWorker(data);
          addToast({ title: 'İşçi eklendi', variant: 'success' });
        }
      } catch (error) {
        addToast({ title: 'Hata', description: 'İşlem başarısız', variant: 'destructive' });
      }
    },
    [editingWorker, isciler, addToast]
  );

  // İzin Formu İşlemleri
  const handleAddLeave = useCallback(() => {
    setLeaveFormOpen(true);
  }, []);

  const handleSubmitLeaveForm = useCallback(
    async (data: { start_date: string; end_date: string; type?: string; days?: number }) => {
      if (!isciler.selectedWorkerId) return;
      try {
        await isciler.createLeave({ worker_id: isciler.selectedWorkerId, ...data });
        addToast({ title: 'İzin kaydı eklendi', variant: 'success' });
        setLeaveFormOpen(false);
      } catch (error) {
        addToast({ title: 'Hata', description: 'İzin kaydedilemedi', variant: 'destructive' });
      }
    },
    [isciler, addToast]
  );

  const handleDeleteLeave = useCallback(
    (id: string) => {
      showConfirm(
        'İzni Sil',
        'Bu izin kaydını silmek istediğinizden emin misiniz?',
        async () => {
          try {
            await isciler.deleteLeave(id);
            addToast({ title: 'İzin kaydı silindi', variant: 'success' });
          } catch (error) {
            addToast({ title: 'Hata', description: 'İzin silinemedi', variant: 'destructive' });
          }
        }
      );
    },
    [isciler, addToast]
  );

  // Mesai Formu İşlemleri
  const handleAddOvertime = useCallback(() => {
    setOvertimeFormOpen(true);
  }, []);

  const handleSubmitOvertimeForm = useCallback(
    async (data: { date: string; hours: number; rate: number }) => {
      if (!isciler.selectedWorkerId) return;
      try {
        await isciler.createOvertime({ worker_id: isciler.selectedWorkerId, ...data });
        addToast({ title: 'Mesai kaydı eklendi', variant: 'success' });
        setOvertimeFormOpen(false);
      } catch (error) {
        addToast({ title: 'Hata', description: 'Mesai kaydedilemedi', variant: 'destructive' });
      }
    },
    [isciler, addToast]
  );

  const handleDeleteOvertime = useCallback(
    (id: string) => {
      showConfirm(
        'Mesaiyi Sil',
        'Bu mesai kaydını silmek istediğinizden emin misiniz?',
        async () => {
          try {
            await isciler.deleteOvertime(id);
            addToast({ title: 'Mesai kaydı silindi', variant: 'success' });
          } catch (error) {
            addToast({ title: 'Hata', description: 'Mesai silinemedi', variant: 'destructive' });
          }
        }
      );
    },
    [isciler, addToast]
  );

  // Maaş Formu İşlemleri
  const handleAddPayroll = useCallback(() => {
    setEditingPayroll(null);
    setPayrollFormOpen(true);
  }, []);

  const handleEditPayroll = useCallback((payroll: Payroll) => {
    setEditingPayroll(payroll);
    setPayrollFormOpen(true);
  }, []);

  const handleSubmitPayrollForm = useCallback(
    async (data: {
      period: string;
      gross?: number;
      net?: number;
      deductions?: number;
      status: 'taslak' | 'ödendi';
      receipt_path?: string;
    }) => {
      if (!isciler.selectedWorkerId) return;
      try {
        if (editingPayroll) {
          await isciler.updatePayroll(editingPayroll.id, data);
          addToast({ title: 'Maaş kaydı güncellendi', variant: 'success' });
        } else {
          await isciler.createPayroll({ worker_id: isciler.selectedWorkerId, ...data });
          addToast({ title: 'Maaş kaydı eklendi', variant: 'success' });
        }
        setPayrollFormOpen(false);
      } catch (error) {
        addToast({ title: 'Hata', description: 'İşlem başarısız', variant: 'destructive' });
      }
    },
    [editingPayroll, isciler, addToast]
  );

  const handleDeletePayroll = useCallback(
    (id: string) => {
      showConfirm(
        'Maaş Kaydını Sil',
        'Bu maaş kaydını silmek istediğinizden emin misiniz?',
        async () => {
          try {
            await isciler.deletePayroll(id);
            addToast({ title: 'Maaş kaydı silindi', variant: 'success' });
          } catch (error) {
            addToast({ title: 'Hata', description: 'Kayıt silinemedi', variant: 'destructive' });
          }
        }
      );
    },
    [isciler, addToast]
  );

  const handleAddAdvance = useCallback(() => {
    setAdvanceFormOpen(true);
  }, []);

  const handleSubmitAdvanceForm = useCallback(
    async (data: { amount: number; date: string; description?: string }) => {
      if (!isciler.selectedWorkerId) return;
      try {
        await isciler.createAdvance(isciler.selectedWorkerId, data);
        addToast({ title: 'Avans kaydedildi', variant: 'success' });
        setAdvanceFormOpen(false);
      } catch (error) {
        addToast({ title: 'Hata', description: 'Avans kaydedilemedi', variant: 'destructive' });
      }
    },
    [isciler, addToast]
  );

  const handleDeleteAdvance = useCallback(
    (id: string) => {
      if (!isciler.selectedWorkerId) return;
      showConfirm(
        'Avans Kaydını Sil',
        'Bu avans kaydını silmek istediğinizden emin misiniz?',
        async () => {
          try {
            await isciler.deleteAdvance(id, isciler.selectedWorkerId as string);
            addToast({ title: 'Avans kaydı silindi', variant: 'success' });
          } catch (error) {
            addToast({ title: 'Hata', description: 'Kayıt silinemedi', variant: 'destructive' });
          }
        }
      );
    },
    [isciler, addToast]
  );

  const handleCalculateSeverance = useCallback(async () => {
    if (!isciler.selectedWorkerId) return;
    try {
      await isciler.calculateSeverance(isciler.selectedWorkerId);
      addToast({ title: 'Kıdem tazminatı hesaplandı', variant: 'success' });
    } catch (error) {
      addToast({ title: 'Hata', description: 'Hesaplama başarısız', variant: 'destructive' });
    }
  }, [isciler, addToast]);

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Başlık */}
      <div>
        <h1 className="text-2xl font-bold">İşçi Yönetimi</h1>
      </div>

      <StatCardRow>
        <StatCard label="Toplam İşçi" value={isciler.workers.length} />
        <StatCard label="Aktif" value={aktifIsciler.length} variant="success" />
        <StatCard label="Aylık Maaş Toplamı" value={formatCurrencyTRY(aylikMaasToplami)} />
      </StatCardRow>

      {/* Ana İçerik */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Sol Panel - İşçi Listesi */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>İşçiler</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <WorkerList
                workers={isciler.workers}
                selectedWorkerId={isciler.selectedWorkerId}
                onSelectWorker={isciler.selectWorker}
                onAddWorker={handleAddWorker}
                loading={isciler.loading}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sağ Panel - İşçi Detayları */}
        <div className="lg:col-span-3">
            <WorkerDetails
              worker={selectedWorker || null}
              leaves={isciler.leaves}
              overtimes={isciler.overtimes}
              payrolls={isciler.payrolls}
              advances={isciler.advances}
              onEdit={handleEditWorker}
              onDelete={handleDeleteWorker}
              onAddLeave={handleAddLeave}
              onDeleteLeave={handleDeleteLeave}
              onAddOvertime={handleAddOvertime}
              onDeleteOvertime={handleDeleteOvertime}
              onAddPayroll={handleAddPayroll}
              onEditPayroll={handleEditPayroll}
              onDeletePayroll={handleDeletePayroll}
              onAddAdvance={handleAddAdvance}
              onDeleteAdvance={handleDeleteAdvance}
              onCalculateSeverance={handleCalculateSeverance}
              loading={isciler.loading}
            />
        </div>
      </div>

      {/* İşçi Formu Dialog */}
      <WorkerForm
        open={workerFormOpen}
        onOpenChange={setWorkerFormOpen}
        onSubmit={handleSubmitWorkerForm}
        initialData={editingWorker || undefined}
        isLoading={isciler.loading}
      />

      {/* İzin Formu Dialog */}
      <LeaveForm
        open={leaveFormOpen}
        onOpenChange={setLeaveFormOpen}
        onSubmit={handleSubmitLeaveForm}
        workerId={isciler.selectedWorkerId || ''}
        isLoading={isciler.loading}
      />

      {/* Mesai Formu Dialog */}
      <OvertimeForm
        open={overtimeFormOpen}
        onOpenChange={setOvertimeFormOpen}
        onSubmit={handleSubmitOvertimeForm}
        workerId={isciler.selectedWorkerId || ''}
        isLoading={isciler.loading}
      />

      {/* Maaş Formu Dialog */}
      <PayrollForm
        open={payrollFormOpen}
        onOpenChange={setPayrollFormOpen}
        onSubmit={handleSubmitPayrollForm}
        workerId={isciler.selectedWorkerId || ''}
        initialData={editingPayroll || undefined}
        isLoading={isciler.loading}
      />

      {/* Avans Formu Dialog */}
      <AdvanceForm
        open={advanceFormOpen}
        onOpenChange={setAdvanceFormOpen}
        onSubmit={handleSubmitAdvanceForm}
        workerId={isciler.selectedWorkerId || ''}
        isLoading={isciler.loading}
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
