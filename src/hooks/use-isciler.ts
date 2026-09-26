'use client';

import { useState, useCallback, useEffect } from 'react';
import { callBackend } from '@/lib/tauri';

import { useBranch } from '@/contexts/BranchContext';

export interface Worker {
  id: string;
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
  created_at: string;
  image_path?: string;
  branch_id?: string;
  phone?: string;
  email?: string;
}

export interface Leave {
  id: string;
  worker_id: string;
  start_date: string;
  end_date: string;
  type?: string;
  days?: number;
  created_at: string;
}

export interface Overtime {
  id: string;
  worker_id: string;
  date: string;
  hours: number;
  rate: number;
  created_at: string;
}

export interface Payroll {
  id: string;
  worker_id: string;
  period: string;
  gross?: number;
  net?: number;
  deductions?: number;
  status: 'taslak' | 'ödendi';
  receipt_path?: string;
  created_at: string;
}

export interface WorkerAdvance {
  id: string;
  worker_id: string;
  amount: number;
  date: string;
  description?: string;
  created_at: string;
}

export function useIsciler() {
  const { activeBranchId } = useBranch();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [overtimes, setOvertimes] = useState<Overtime[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [advances, setAdvances] = useState<WorkerAdvance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // İşçileri listele
  const loadWorkers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await callBackend<Worker[]>('list_workers', { branch_id: activeBranchId });
      setWorkers(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'İşçiler yüklenemedi';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [activeBranchId]);

  // Seçili işçi için izinleri yükle
  const loadLeaves = useCallback(async (workerId: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await callBackend<Leave[]>('list_leaves', { worker_id: workerId });
      setLeaves(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'İzinler yüklenemedi';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Seçili işçi için mesaileri yükle
  const loadOvertimes = useCallback(async (workerId: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await callBackend<Overtime[]>('list_overtimes', { worker_id: workerId });
      setOvertimes(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Mesailer yüklenemedi';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Seçili işçi için maaşları yükle
  const loadPayrolls = useCallback(async (workerId: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await callBackend<Payroll[]>('list_payrolls', { worker_id: workerId });
      setPayrolls(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Maaşlar yüklenemedi';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Seçili işçi için avansları yükle
  const loadAdvances = useCallback(async (workerId: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await callBackend<WorkerAdvance[]>('get_worker_advances', { workerId });
      setAdvances(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Avanslar yüklenemedi';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // İşçi seç ve verilerini yükle
  const selectWorker = useCallback(
    async (workerId: string) => {
      setSelectedWorkerId(workerId);
      await Promise.all([
        loadLeaves(workerId),
        loadOvertimes(workerId),
        loadPayrolls(workerId),
        loadAdvances(workerId),
      ]);
    },
    [loadLeaves, loadOvertimes, loadPayrolls, loadAdvances]
  );

  // İşçi oluştur
  const createWorker = useCallback(
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
    }) => {
      setError(null);
      try {
        const newWorker = await callBackend<Worker>('create_worker', { ...data, branch_id: activeBranchId });
        setWorkers((prev) => [...prev, newWorker].sort((a, b) => a.full_name.localeCompare(b.full_name)));
        return newWorker;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'İşçi oluşturulamadı';
        setError(message);
        throw err;
      }
    },
    [activeBranchId]
  );

  // İşçi güncelle
  const updateWorker = useCallback(
    async (
      id: string,
      data: {
        full_name?: string;
        tc_no?: string;
        birth_date?: string;
        hire_date?: string;
        exit_date?: string;
        position?: string;
        sgk_no?: string;
        iban?: string;
        salary?: number;
        contract_end_date?: string;
      }
    ) => {
      setError(null);
      try {
        await callBackend('update_worker', { id, ...data, branch_id: activeBranchId });
        setWorkers((prev) =>
          prev
            .map((w) => (w.id === id ? { ...w, ...data, branch_id: activeBranchId ?? undefined } : w))
            .sort((a, b) => a.full_name.localeCompare(b.full_name))
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'İşçi güncellenemedi';
        setError(message);
        throw err;
      }
    },
    [activeBranchId]
  );

  // İşçi sil
  const deleteWorker = useCallback(
    async (id: string) => {
      setError(null);
      try {
        await callBackend('delete_worker', { id });
        setWorkers((prev) => prev.filter((w) => w.id !== id));
        if (selectedWorkerId === id) {
          setSelectedWorkerId(null);
          setLeaves([]);
          setOvertimes([]);
          setPayrolls([]);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'İşçi silinemedi';
        setError(message);
        throw err;
      }
    },
    [selectedWorkerId]
  );

  // Kıdem tazminatı hesapla
  const calculateSeverance = useCallback(
    async (workerId: string) => {
      setError(null);
      try {
        const result = await callBackend<{ amount: number }>('calculate_severance', {
          worker_id: workerId,
        });
        return result.amount;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Kıdem tazminatı hesaplanamadı';
        setError(message);
        throw err;
      }
    },
    []
  );

  // İzin oluştur
  const createLeave = useCallback(
    async (data: {
      worker_id: string;
      start_date: string;
      end_date: string;
      type?: string;
      days?: number;
    }) => {
      setError(null);
      try {
        const newLeave = await callBackend<Leave>('create_leave', data);
        if (data.worker_id === selectedWorkerId) {
          setLeaves((prev) => [...prev, newLeave]);
        }
        return newLeave;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'İzin oluşturulamadı';
        setError(message);
        throw err;
      }
    },
    [selectedWorkerId]
  );

  // İzin sil
  const deleteLeave = useCallback(
    async (id: string) => {
      setError(null);
      try {
        await callBackend('delete_leave', { id });
        setLeaves((prev) => prev.filter((l) => l.id !== id));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'İzin silinemedi';
        setError(message);
        throw err;
      }
    },
    []
  );

  // Mesai oluştur
  const createOvertime = useCallback(
    async (data: {
      worker_id: string;
      date: string;
      hours: number;
      rate: number;
    }) => {
      setError(null);
      try {
        const newOvertime = await callBackend<Overtime>('create_overtime', data);
        if (data.worker_id === selectedWorkerId) {
          setOvertimes((prev) => [...prev, newOvertime]);
        }
        return newOvertime;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Mesai oluşturulamadı';
        setError(message);
        throw err;
      }
    },
    [selectedWorkerId]
  );

  // Mesai sil
  const deleteOvertime = useCallback(
    async (id: string) => {
      setError(null);
      try {
        await callBackend('delete_overtime', { id });
        setOvertimes((prev) => prev.filter((o) => o.id !== id));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Mesai silinemedi';
        setError(message);
        throw err;
      }
    },
    []
  );

  // Maaş oluştur
  const createPayroll = useCallback(
    async (data: {
      worker_id: string;
      period: string;
      gross?: number;
      net?: number;
      deductions?: number;
      status: 'taslak' | 'ödendi';
      receipt_path?: string;
    }) => {
      setError(null);
      try {
        const newPayroll = await callBackend<Payroll>('create_payroll', data);
        if (data.worker_id === selectedWorkerId) {
          setPayrolls((prev) => [...prev, newPayroll]);
        }
        return newPayroll;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Maaş oluşturulamadı';
        setError(message);
        throw err;
      }
    },
    [selectedWorkerId]
  );

  // Maaş güncelle
  const updatePayroll = useCallback(
    async (
      id: string,
      data: {
        period?: string;
        gross?: number;
        net?: number;
        deductions?: number;
        status?: 'taslak' | 'ödendi';
        receipt_path?: string;
      }
    ) => {
      setError(null);
      try {
        await callBackend('update_payroll', { id, ...data });
        setPayrolls((prev) =>
          prev.map((p) => (p.id === id ? { ...p, ...data } : p))
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Maaş güncellenemedi';
        setError(message);
        throw err;
      }
    },
    []
  );

  // Maaş sil
  const deletePayroll = useCallback(
    async (id: string) => {
      setError(null);
      try {
        await callBackend('delete_payroll', { id });
        setPayrolls((prev) => prev.filter((p) => p.id !== id));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Maaş silinemedi';
        setError(message);
        throw err;
      }
    },
    []
  );

  // İlk yükleme
  useEffect(() => {
    loadWorkers();
  }, [loadWorkers]);

  // İşçi avansı oluştur
  const createAdvance = useCallback(
    async (worker_id: string, data: { amount: number; date: string; description?: string }) => {
      setError(null);
      try {
        await callBackend<WorkerAdvance>('add_worker_advance', {
          workerId: worker_id,
          amount: data.amount,
          date: data.date,
          description: data.description,
        });
        await loadAdvances(worker_id);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Avans eklenemedi';
        setError(message);
        throw err;
      }
    },
    [loadAdvances]
  );

  // İşçi avansı sil
  const deleteAdvance = useCallback(
    async (id: string, worker_id: string) => {
      setError(null);
      try {
        await callBackend('delete_worker_advance', { id });
        await loadAdvances(worker_id);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Avans silinemedi';
        setError(message);
        throw err;
      }
    },
    [loadAdvances]
  );

  return {
    workers,
    selectedWorkerId,
    leaves,
    overtimes,
    payrolls,
    advances,
    loading,
    error,
    selectWorker,
    createWorker,
    updateWorker,
    deleteWorker,
    calculateSeverance,
    createLeave,
    deleteLeave,
    createOvertime,
    deleteOvertime,
    createPayroll,
    updatePayroll,
    deletePayroll,
    createAdvance,
    deleteAdvance,
    loadWorkers,
  };
}
