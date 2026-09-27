'use client';

import { useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import {
  Upload, Loader2, CheckCircle2, XCircle, FileText,
  Check, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BatchFileResult {
  file_name: string;
  success: boolean;
  error: string | null;
  analysis: {
    entity_type: string;
    items: Record<string, unknown>[];
    summary: string;
  } | null;
}

interface BatchAnalysisResult {
  results: BatchFileResult[];
  success_count: number;
  total: number;
}

const ENTITY_LABELS: Record<string, string> = {
  company: 'Firma', product: 'Ürün', invoice: 'Fatura',
  vehicle: 'Araç', worker: 'Çalışan', tax_item: 'Vergi',
  document: 'Belge', ledger_entry: 'Cari Hareket',
};

export function BatchReceiptUpload() {
  const { addToast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<BatchFileResult[]>([]);
  const [importedCount, setImportedCount] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (files.length > 20) {
      addToast({ title: 'Limit Aşıldı', description: 'Aynı anda en fazla 20 dosya yükleyebilirsiniz.', variant: 'destructive' });
      return;
    }

    setIsAnalyzing(true);
    setResults([]);
    setImportedCount(0);
    setSelected(new Set());

    try {
      const payloads = await Promise.all(
        Array.from(files).map(async (file) => {
          const buffer = await file.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
          );
          return { file_data: base64, file_name: file.name };
        })
      );

      const result = await invoke<BatchAnalysisResult>('analyze_files_batch', { files: payloads });
      setResults(result.results);
      // Başarılı olanları varsayılan olarak seç
      setSelected(new Set(result.results.map((r, i) => r.success ? i : -1).filter(i => i >= 0)));

      addToast({
        title: 'Analiz Tamamlandı',
        description: `${result.success_count}/${result.total} dosya başarıyla analiz edildi.`,
        variant: result.success_count === result.total ? 'success' : 'destructive',
      });
    } catch (err) {
      addToast({ title: 'Hata', description: String(err), variant: 'destructive' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleImport = async () => {
    const selectedResults = Array.from(selected).map(i => results[i]).filter(r => r?.analysis);
    if (selectedResults.length === 0) return;

    let imported = 0;
    for (const r of selectedResults) {
      if (!r.analysis) continue;
      try {
        const res = await invoke<{ imported: number }>('import_analyzed_data', {
          entityType: r.analysis.entity_type,
          items: r.analysis.items,
        });
        imported += res.imported;
      } catch (err) {
        console.error('İçe aktarma hatası:', r.file_name, err);
      }
    }

    setImportedCount(imported);
    addToast({
      title: 'Aktarım Tamamlandı',
      description: `${imported} kayıt başarıyla sisteme işlendi.`,
      variant: 'success',
    });
  };

  const toggleSelect = (idx: number) => {
    const next = new Set(selected);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelected(next);
  };

  const successCount = results.filter(r => r.success).length;

  return (
    <div className="space-y-4">
      {/* Yükleme alanı */}
      <div
        className="border-2 border-dashed border-blue-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
        onClick={() => fileInputRef.current?.click()}
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        onDragOver={(e) => e.preventDefault()}
      >
        <Upload className="h-8 w-8 text-blue-400 mx-auto mb-3" />
        <p className="text-sm font-semibold text-gray-700">Toplu Fiş / Fatura Yükle</p>
        <p className="text-xs text-gray-400 mt-1">
          Aynı anda en fazla <strong>20 dosya</strong> — PDF, JPG, PNG, DOCX, XLSX — sürükle bırak
        </p>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Analiz durumu */}
      {isAnalyzing && (
        <div className="flex items-center justify-center gap-2 py-6 bg-blue-50 rounded-xl border border-blue-100">
          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
          <span className="text-sm text-blue-700 font-medium">AI dosyaları analiz ediyor...</span>
        </div>
      )}

      {/* Sonuç listesi */}
      {results.length > 0 && !isAnalyzing && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1.5 text-green-700 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                {successCount} başarılı
              </span>
              {results.length - successCount > 0 && (
                <span className="flex items-center gap-1.5 text-red-600 font-medium">
                  <XCircle className="h-4 w-4" />
                  {results.length - successCount} başarısız
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setResults([])}
                className="h-8 text-xs gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Listeyi Temizle
              </Button>
              <Button
                size="sm"
                onClick={handleImport}
                disabled={selected.size === 0}
                className="h-8 text-xs gap-1.5"
              >
                <Check className="h-3.5 w-3.5" />
                Seçilenleri Aktar ({selected.size})
              </Button>
            </div>
          </div>

          {importedCount > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {importedCount} kayıt başarıyla aktarıldı.
            </div>
          )}

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {results.map((r, idx) => (
              <div
                key={r.file_name + idx}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-xl border transition-all',
                  r.success
                    ? selected.has(idx)
                      ? 'border-green-300 bg-green-50/50'
                      : 'border-border bg-background hover:border-primary/30'
                    : 'border-red-200 bg-red-50/50'
                )}
              >
                {r.success && (
                  <button
                    onClick={() => toggleSelect(idx)}
                    className={cn(
                      'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors',
                      selected.has(idx)
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 bg-white hover:border-green-400'
                    )}
                    aria-label="Seç"
                  >
                    {selected.has(idx) && <Check className="h-3.5 w-3.5" />}
                  </button>
                )}
                <FileText className={cn('h-4 w-4 shrink-0 mt-0.5', r.success ? 'text-blue-500' : 'text-red-400')} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{r.file_name}</p>
                  {r.success && r.analysis ? (
                    <div className="mt-0.5 space-y-0.5">
                      <p className="text-xs text-gray-500">
                        Tür: <strong>{ENTITY_LABELS[r.analysis.entity_type] || r.analysis.entity_type}</strong>
                        {' • '}{r.analysis.items.length} kayıt
                      </p>
                      <p className="text-xs text-gray-600">{r.analysis.summary}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-red-600 mt-0.5">{r.error || 'Analiz başarısız'}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
