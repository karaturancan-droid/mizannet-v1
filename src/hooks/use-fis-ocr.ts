'use client';

import { useState, useCallback, useEffect } from 'react';
import { callBackend } from '@/lib/tauri';
import { useBranch } from '@/contexts/BranchContext';

export interface Expense {
  id: string;
  date: string;
  vendor?: string;
  category?: string;
  amount: number;
  vat_amount?: number;
  payment_method?: string;
  description?: string;
  file_path?: string;
  source: 'ocr' | 'manuel';
  created_at: string;
}

export interface ReceiptAnalysis {
  vendor?: string;
  date?: string;
  amount?: number;
  vat_amount?: number;
  payment_method?: string;
  category?: string;
  description?: string;
}

export function useFisOcr() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const { activeBranchId } = useBranch();

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await callBackend<Expense[]>('list_expenses', { branch_id: activeBranchId });
      setExpenses(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Giderler yüklenemedi';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [activeBranchId]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  // Fiş fotoğrafını AI ile analiz et (kaydetmez)
  const analyzeReceipt = useCallback(async (file: File): Promise<ReceiptAnalysis> => {
    setLoading(true);
    setError(null);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      return await callBackend<ReceiptAnalysis>('analyze_receipt', {
        file_data: base64,
        file_name: file.name,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fiş okunamadı';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Analiz sonucunu (veya manuel veriyi) gider olarak kaydet
  const saveExpense = useCallback(
    async (data: {
      date: string;
      vendor?: string;
      category?: string;
      amount: number;
      vat_amount?: number;
      payment_method?: string;
      description?: string;
      file_path?: string;
      source?: 'ocr' | 'manuel';
    }) => {
      setError(null);
      try {
        const saved = await callBackend<Expense>('save_expense', {
          ...data,
          branch_id: activeBranchId,
        });
        setExpenses((prev) => [saved, ...prev]);
        return saved;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Gider kaydedilemedi';
        setError(message);
        throw err;
      }
    },
    [activeBranchId]
  );

  const deleteExpense = useCallback(async (id: string) => {
    setError(null);
    try {
      await callBackend('delete_expense', { id });
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gider silinemedi';
      setError(message);
      throw err;
    }
  }, []);

  const getExpenseSummary = useCallback(async () => {
    try {
      return await callBackend<{ category: string; total: number }[]>('get_expense_summary', {
        branch_id: activeBranchId,
      });
    } catch {
      return [];
    }
  }, [activeBranchId]);

  return {
    loading,
    error,
    expenses,
    loadExpenses,
    analyzeReceipt,
    saveExpense,
    deleteExpense,
    getExpenseSummary,
  };
}
