'use client';

import { useState, useCallback } from 'react';
import { callBackend } from '@/lib/tauri';
import { useBranch } from '@/contexts/BranchContext';

export interface Invoice {
  id: string;
  company_id?: string;
  invoice_no?: string;
  date?: string;
  subtotal?: number;
  vat_amount?: number;
  total?: number;
  iban?: string;
  raw_data?: string;
  status: 'taslak' | 'onaylandı' | 'reddedildi';
  file_path?: string;
  created_at: string;
}

export function useFaturaAktarim() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { activeBranchId } = useBranch();

  // Faturayı yükle ve OCR/AI ile işle
  const uploadAndExtractInvoice = useCallback(
    async (file: File) => {
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
        const result = await callBackend<Invoice>('upload_and_extract_invoice', {
          file_data: base64,
          file_name: file.name,
          file_type: file.type,
        });
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Fatura yüklenemedi';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Faturayı onayla
  const approveInvoice = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await callBackend('approve_invoice', { id });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fatura onaylanamadı';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Faturayı reddet
  const rejectInvoice = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await callBackend('reject_invoice', { id });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fatura reddedilemedi';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Faturayı güncelle (manuel düzenleme için)
  const updateInvoice = useCallback(async (id: string, data: Partial<Invoice>) => {
    setLoading(true);
    setError(null);
    try {
      const payload = { id, ...data, branch_id: activeBranchId };
      const result = await callBackend<Invoice>('update_invoice', payload);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fatura güncellenemedi';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    uploadAndExtractInvoice,
    approveInvoice,
    rejectInvoice,
    updateInvoice,
  };
}
