'use client';

import { useState, useCallback, useEffect } from 'react';
import { callBackend } from '@/lib/tauri';
import { useBranch } from '@/contexts/BranchContext';

export interface AgendaItem {
  id: string;
  kind: 'tahsilat' | 'odeme';
  source: string;
  date: string;
  company_name: string;
  description: string;
  amount: number;
  status: string;
  days_left: number;
}

export interface WeeklyProjection {
  week_start: string;
  inflow: number;
  outflow: number;
  net: number;
}

export interface CashAgenda {
  items: AgendaItem[];
  weeks: WeeklyProjection[];
  total_receivable: number;
  total_payable: number;
  overdue_receivable: number;
  overdue_payable: number;
  opening_balance: number;
}

export function useCashAgenda() {
  const [agenda, setAgenda] = useState<CashAgenda | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { activeBranchId } = useBranch();

  const loadAgenda = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await callBackend<CashAgenda>('get_cash_agenda', { branch_id: activeBranchId });
      setAgenda(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nakit akış ajandası yüklenemedi';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [activeBranchId]);

  useEffect(() => {
    loadAgenda();
  }, [loadAgenda]);

  return { agenda, loading, error, loadAgenda };
}
