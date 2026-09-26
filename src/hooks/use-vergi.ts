'use client';

import { useState, useCallback, useEffect } from 'react';
import { callBackend } from '@/lib/tauri';
import { useBranch } from '@/contexts/BranchContext';

export interface TaxItem {
  id: string;
  type: string;
  period?: string;
  amount: number;
  due_date: string;
  status: 'bekliyor' | 'ödendi' | 'gecikti';
  receipt_path?: string;
  notes?: string;
  created_at: string;
}

export function useVergi() {
  const [taxItems, setTaxItems] = useState<TaxItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<'tümü' | 'bekliyor' | 'ödendi' | 'gecikti'>('tümü');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { activeBranchId } = useBranch();

  // Vergi kaydı listesini yükle
  const loadTaxItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await callBackend<TaxItem[]>('list_tax_items', { branch_id: activeBranchId });
      setTaxItems(result);
      // Overdue öğeleri işaretle
      await callBackend('refresh_overdue_tax_items');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Vergi kayıtları yüklenemedi';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Vergi kaydı oluştur
  const createTaxItem = useCallback(
    async (data: {
      type: string;
      period?: string;
      amount: number;
      due_date: string;
      notes?: string;
      receipt_path?: string;
    }) => {
      setError(null);
      try {
        const payload = { ...data, branch_id: activeBranchId };
        const newItem = await callBackend<TaxItem>('create_tax_item', payload);
        setTaxItems((prev) => [...prev, newItem]);
        return newItem;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Vergi kaydı oluşturulamadı';
        setError(message);
        throw err;
      }
    },
    []
  );

  // Vergi kaydı güncelle
  const updateTaxItem = useCallback(
    async (
      id: string,
      data: {
        type?: string;
        period?: string;
        amount?: number;
        due_date?: string;
        status?: 'bekliyor' | 'ödendi' | 'gecikti';
        notes?: string;
        receipt_path?: string;
      }
    ) => {
      setError(null);
      try {
        const payload = { id, ...data, branch_id: activeBranchId };
        await callBackend('update_tax_item', payload);
        setTaxItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, ...data } : item))
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Vergi kaydı güncellenemedi';
        setError(message);
        throw err;
      }
    },
    []
  );

  // Vergi kaydı sil
  const deleteTaxItem = useCallback(
    async (id: string) => {
      setError(null);
      try {
        await callBackend('delete_tax_item', { id });
        setTaxItems((prev) => prev.filter((item) => item.id !== id));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Vergi kaydı silinemedi';
        setError(message);
        throw err;
      }
    },
    []
  );

  // Vergi kaydını ödendi olarak işaretle
  const markAsPaid = useCallback(
    async (id: string) => {
      setError(null);
      try {
        await callBackend('update_tax_item', { id, status: 'ödendi' });
        setTaxItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: 'ödendi' } : item))
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Durum güncellenemedi';
        setError(message);
        throw err;
      }
    },
    []
  );

  // Filtrelenmiş öğeleri döndür
  const filteredTaxItems = useCallback(() => {
    if (statusFilter === 'tümü') {
      return taxItems;
    }
    return taxItems.filter((item) => item.status === statusFilter);
  }, [taxItems, statusFilter]);

  // İlk yükleme
  useEffect(() => {
    loadTaxItems();
  }, [loadTaxItems]);

  return {
    taxItems: filteredTaxItems(),
    allTaxItems: taxItems,
    statusFilter,
    setStatusFilter,
    loading,
    error,
    createTaxItem,
    updateTaxItem,
    deleteTaxItem,
    markAsPaid,
    loadTaxItems,
  };
}
