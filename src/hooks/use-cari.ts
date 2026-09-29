'use client';

import { useState, useCallback, useEffect } from 'react';
import { callBackend } from '@/lib/tauri';
import { useBranch } from '@/contexts/BranchContext';

export interface Company {
  id: string;
  name: string;
  tax_no?: string;
  phone?: string;
  email?: string;
  contact_person?: string;
  balance: number;
  created_at: string;
}

export interface LedgerEntry {
  id: string;
  company_id: string;
  date: string;
  document_no?: string;
  description?: string;
  debit: number;
  credit: number;
  running_balance: number;
  entry_type?: string;
  created_at: string;
}

export interface LedgerSummary {
  total_debit: number;
  total_credit: number;
  net: number;
}

export function useCari() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [ledgerSummary, setLedgerSummary] = useState<LedgerSummary | null>(null);
  const [yearFilter, setYearFilter] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { activeBranchId } = useBranch();

  // Firmaları listele
  const loadCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await callBackend<Company[]>('list_companies');
      setCompanies(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Firmalar yüklenemedi';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Seçili firma için hareket ve özet yükle
  const loadLedgerData = useCallback(async (companyId: string, year: number | null) => {
    setLoading(true);
    setError(null);
    try {
      const [entries, summary] = await Promise.all([
        callBackend<LedgerEntry[]>('list_ledger_entries', {
          company_id: companyId,
          year_filter: year,
          branch_id: activeBranchId,
        }),
        callBackend<LedgerSummary>('get_ledger_summary', {
          company_id: companyId,
          year_filter: year,
          branch_id: activeBranchId,
        }),
      ]);
      setLedgerEntries(entries);
      setLedgerSummary(summary);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Hareket verileri yüklenemedi';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Firma seç ve verilerini yükle
  const selectCompany = useCallback(
    async (companyId: string) => {
      setSelectedCompanyId(companyId);
      setYearFilter(null);
      await loadLedgerData(companyId, null);
    },
    [loadLedgerData]
  );

  // Yıl filtresini değiştir
  const changeYearFilter = useCallback(
    async (year: number | null) => {
      setYearFilter(year);
      if (selectedCompanyId) {
        await loadLedgerData(selectedCompanyId, year);
      }
    },
    [selectedCompanyId, loadLedgerData]
  );

  // Firma oluştur
  const createCompany = useCallback(
    async (data: {
      name: string;
      tax_no?: string;
      phone?: string;
      email?: string;
      contact_person?: string;
    }) => {
      setError(null);
      try {
        const newCompany = await callBackend<Company>('create_company', data);
        setCompanies((prev) => [...prev, newCompany].sort((a, b) => a.name.localeCompare(b.name)));
        return newCompany;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Firma oluşturulamadı';
        setError(message);
        throw err;
      }
    },
    []
  );

  // Firma güncelle
  const updateCompany = useCallback(
    async (
      id: string,
      data: {
        name: string;
        tax_no?: string;
        phone?: string;
        email?: string;
        contact_person?: string;
      }
    ) => {
      setError(null);
      try {
        await callBackend('update_company', { id, ...data });
        setCompanies((prev) =>
          prev
            .map((c) => (c.id === id ? { ...c, ...data } : c))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Firma güncellenemedi';
        setError(message);
        throw err;
      }
    },
    []
  );

  // Firma sil
  const deleteCompany = useCallback(
    async (id: string) => {
      setError(null);
      try {
        await callBackend('delete_company', { id });
        setCompanies((prev) => prev.filter((c) => c.id !== id));
        if (selectedCompanyId === id) {
          setSelectedCompanyId(null);
          setLedgerEntries([]);
          setLedgerSummary(null);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Firma silinemedi';
        setError(message);
        throw err;
      }
    },
    [selectedCompanyId]
  );

  // Hareket oluştur
  const createLedgerEntry = useCallback(
    async (data: {
      company_id: string;
      date: string;
      document_no?: string;
      description?: string;
      debit: number;
      credit: number;
      entry_type?: string;
    }) => {
      setError(null);
      try {
        const payload = { ...data, branch_id: activeBranchId };
        const newEntry = await callBackend<LedgerEntry>('create_ledger_entry', payload);
        await loadLedgerData(data.company_id, yearFilter);
        return newEntry;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Hareket oluşturulamadı';
        setError(message);
        throw err;
      }
    },
    [yearFilter, loadLedgerData]
  );

  // Hareket güncelle
  const updateLedgerEntry = useCallback(
    async (
      id: string,
      data: {
        date: string;
        document_no?: string;
        description?: string;
        debit: number;
        credit: number;
        entry_type?: string;
      }
    ) => {
      setError(null);
      try {
        await callBackend('update_ledger_entry', { id, ...data });
        if (selectedCompanyId) {
          await loadLedgerData(selectedCompanyId, yearFilter);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Hareket güncellenemedi';
        setError(message);
        throw err;
      }
    },
    [selectedCompanyId, yearFilter, loadLedgerData]
  );

  // Hareket sil
  const deleteLedgerEntry = useCallback(
    async (id: string) => {
      setError(null);
      try {
        await callBackend('delete_ledger_entry', { id });
        if (selectedCompanyId) {
          await loadLedgerData(selectedCompanyId, yearFilter);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Hareket silinemedi';
        setError(message);
        throw err;
      }
    },
    [selectedCompanyId, yearFilter, loadLedgerData]
  );

  // İlk yükleme
  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  // Borç Öde
  const payCompanyDebt = useCallback(
    async (
      company_id: string,
      account_id: string,
      date: string,
      amount: number,
      description?: string
    ) => {
      setError(null);
      try {
        await callBackend('pay_company_debt', {
          company_id,
          account_id,
          date,
          amount,
          description,
        });
        if (selectedCompanyId === company_id) {
          await loadLedgerData(company_id, yearFilter);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Ödeme yapılamadı';
        setError(message);
        throw err;
      }
    },
    [selectedCompanyId, yearFilter, loadLedgerData]
  );

  return {
    companies,
    selectedCompanyId,
    ledgerEntries,
    ledgerSummary,
    yearFilter,
    loading,
    error,
    selectCompany,
    changeYearFilter,
    createCompany,
    updateCompany,
    deleteCompany,
    createLedgerEntry,
    updateLedgerEntry,
    deleteLedgerEntry,
    payCompanyDebt,
    loadCompanies,
  };
}
