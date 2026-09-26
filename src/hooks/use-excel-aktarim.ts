'use client';

import { useState, useCallback } from 'react';
import { callBackend } from '@/lib/tauri';

export interface ImportResult {
  imported: number;
  entity_type: string;
}


export function useExcelAktarim() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dosya hash'ini kontrol et (duplicate check)
  const checkImportHash = useCallback(async (hash: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await callBackend<{ exists: boolean }>('check_import_hash', { hash });
      return result?.exists || false;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Hash kontrol edilemedi';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Dosya hash'ini kaydet
  const recordImportHash = useCallback(async (hash: string, fileName: string) => {
    setLoading(true);
    setError(null);
    try {
      await callBackend('record_import_hash', { hash, file_name: fileName });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Hash kaydedilemedi';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Excel dosyasını parse et
  const parseExcelFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const arrayBuffer = await file.arrayBuffer();
      // Client-side parsing would require a library like xlsx
      // For now, we'll send to backend
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const result = await callBackend<Array<Record<string, string>>>('parse_excel_file', {
        file_data: base64,
        file_name: file.name,
      });
      return result || [];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Dosya parse edilemedi';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Verileri içe aktar
  const importData = useCallback(
    async (
      rows: Array<Record<string, string>>,
      entityType: 'company' | 'product' | 'vehicle' | 'worker' | 'ledger_entry'
    ) => {
      setLoading(true);
      setError(null);
      try {
        const result = await callBackend<ImportResult>('import_analyzed_data', {
          items: rows,
          entity_type: entityType,
        });
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'İçe aktarma başarısız';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    loading,
    error,
    checkImportHash,
    recordImportHash,
    parseExcelFile,
    importData,
  };
}
