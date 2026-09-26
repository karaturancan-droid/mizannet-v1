'use client';

import { useState, useCallback } from 'react';
import { callBackend } from '@/lib/tauri';

export interface Document {
  id: string;
  title: string;
  category?: string;
  file_type?: string;
  file_path?: string;
  related_type?: string;
  related_id?: string;
  expiry_date?: string;
  tags?: string;
  notes?: string;
  created_at: string;
}

export function useBelgeler() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [expiringDocuments, setExpiringDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Belgeleri listele
  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await callBackend<Document[]>('list_documents');
      setDocuments(result || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Belgeler yüklenemedi';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Süresi dolan belgeleri listele
  const loadExpiringDocuments = useCallback(async (days: number = 30) => {
    setLoading(true);
    setError(null);
    try {
      const result = await callBackend<Document[]>('list_expiring_documents', { days });
      setExpiringDocuments(result || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Süresi dolan belgeler yüklenemedi';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Belge oluştur
  const createDocument = useCallback(async (data: Omit<Document, 'id' | 'created_at'>) => {
    setLoading(true);
    setError(null);
    try {
      const result = await callBackend<Document>('create_document', data);
      setDocuments((prev) => [...prev, result]);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Belge oluşturulamadı';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Belge güncelle
  const updateDocument = useCallback(async (id: string, data: Partial<Document>) => {
    setLoading(true);
    setError(null);
    try {
      const result = await callBackend<Document>('update_document', { id, ...data });
      setDocuments((prev) => prev.map((doc) => (doc.id === id ? result : doc)));
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Belge güncellenemedi';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Seçilen dosyayı diske kaydet ve tam dosya yolunu al
  const uploadDocumentFile = useCallback(async (file: File) => {
    const fileData = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    const filePath = await callBackend<string>('save_document_file', {
      file_name: file.name,
      file_data: fileData,
    });
    return filePath;
  }, []);

  // Kayıtlı bir belgeyi varsayılan uygulamada aç
  const openDocumentFile = useCallback(async (filePath: string) => {
    await callBackend('open_document_file', { file_path: filePath });
  }, []);

  // Belge sil
  const deleteDocument = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await callBackend('delete_document', { id });
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Belge silinemedi';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    documents,
    expiringDocuments,
    loading,
    error,
    loadDocuments,
    loadExpiringDocuments,
    createDocument,
    updateDocument,
    deleteDocument,
    uploadDocumentFile,
    openDocumentFile,
  };
}
