'use client';

import { useState } from 'react';
import { useExcelAktarim, ImportResult } from '@/hooks/use-excel-aktarim';
import { ImportForm } from '@/components/excel-aktarim/import-form';
import { ImportPreview } from '@/components/excel-aktarim/import-preview';
import { ImportResults } from '@/components/excel-aktarim/import-results';
import { useToast } from '@/components/ui/toast';

type Step = 'upload' | 'preview' | 'results';

export function ExcelAktarimPage() {
  const { checkImportHash, recordImportHash, parseExcelFile, importData, loading } =
    useExcelAktarim();
  const { addToast } = useToast();
  const [step, setStep] = useState<Step>('upload');
  const [parsedData, setParsedData] = useState<Array<Record<string, string>>>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);

  const calculateFileHash = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  };

  const handleFileSelect = async (file: File) => {
    try {
      const hash = await calculateFileHash(file);
      const isDuplicate = await checkImportHash(hash);

      if (isDuplicate) {
        addToast({
          title: 'Tekrar yükleme engellendi',
          description: 'Bu dosya daha önce yüklenmiş.',
          variant: 'destructive',
        });
        return;
      }

      const data = await parseExcelFile(file);
      if (data.length === 0) {
        addToast({ title: 'Dosyada veri bulunamadı', variant: 'destructive' });
        return;
      }

      setParsedData(data);
      setCurrentFile(file);
      setStep('preview');
      addToast({ title: `${data.length} satır yüklendi`, variant: 'success' });
    } catch (err) {
      addToast({
        title: 'Dosya yüklenemedi',
        description: err instanceof Error ? err.message : 'Bilinmeyen hata',
        variant: 'destructive',
      });
    }
  };

  const handleConfirmImport = async (entityType: string, mappedData: Array<Record<string, string>>) => {
    if (!currentFile) return;

    try {
      const result = await importData(mappedData, entityType as any);
      setImportResult(result);

      const hash = await calculateFileHash(currentFile);
      await recordImportHash(hash, currentFile.name);

      setStep('results');
      addToast({ title: 'Veriler başarıyla içe aktarıldı', variant: 'success' });
    } catch (err) {
      addToast({
        title: 'İçe aktarma başarısız',
        description: err instanceof Error ? err.message : 'Bilinmeyen hata',
        variant: 'destructive',
      });
    }
  };

  const handleReset = () => {
    setStep('upload');
    setParsedData([]);
    setImportResult(null);
    setCurrentFile(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Excel Aktarımı</h1>
        <p className="text-muted-foreground">Excel, CSV dosyalarından veri aktarın</p>
      </div>

      {step === 'upload' && <ImportForm onFileSelect={handleFileSelect} isLoading={loading} />}

      {step === 'preview' && (
        <ImportPreview
          data={parsedData}
          onConfirm={handleConfirmImport}
          onBack={() => setStep('upload')}
          isLoading={loading}
        />
      )}

      {step === 'results' && importResult && (
        <ImportResults result={importResult} onReset={handleReset} />
      )}
    </div>
  );
}
