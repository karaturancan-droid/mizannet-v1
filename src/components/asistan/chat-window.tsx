'use client';

import { useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MessageList } from './message-list';
import { InputArea } from './input-area';
import { AgentSteps } from './agent-steps';
import { Message, FileAnalysis } from '@/hooks/use-asistan';
import { callBackend } from '@/lib/tauri';
import { Info, Paperclip, Loader2, FileText, Check, X } from 'lucide-react';

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
  agentSteps: import('@/hooks/use-asistan').AgentStep[];
  onSendMessage: (message: string, imageBase64?: string) => void;
  onAnalyzeFile: (fileData: string, fileName: string) => Promise<FileAnalysis>;
  onImportData: (entityType: string, items: Record<string, unknown>[]) => Promise<{ imported: number }>;
  error?: string | null;
}

const ENTITY_LABELS: Record<string, string> = {
  company: 'Firma',
  product: 'Ürün',
  invoice: 'Fatura',
  vehicle: 'Araç',
  worker: 'Çalışan',
  tax_item: 'Vergi',
  document: 'Belge',
};

export function ChatWindow({
  messages,
  isLoading,
  agentSteps,
  onSendMessage,
  onAnalyzeFile,
  onImportData,
  error,
}: ChatWindowProps) {
  const [selectedAction, setSelectedAction] = useState<Message['suggested_action'] | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<FileAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ imported: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleApproveAction = async () => {
    if (selectedAction?.type === 'import_data') {
      setIsApproving(true);
      try {
        const entityType = String(selectedAction.payload.entity_type);
        const items = Array.isArray(selectedAction.payload.items) ? selectedAction.payload.items : [];
        const result = await onImportData(entityType, items);
        setImportResult(result);
        setSelectedAction(null);
      } catch (err) {
        setAnalysisError(err instanceof Error ? err.message : 'Veri aktarılamadı');
      } finally {
        setIsApproving(false);
      }
    } else if (selectedAction?.type === 'generate_file') {
      setIsApproving(true);
      try {
        const fileName = (selectedAction.payload.file_name as string) || 'dosya.txt';
        const content = (selectedAction.payload.content as string) || '';
        const mimeType = (selectedAction.payload.mime_type as string) || 'text/plain';

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setSelectedAction(null);
      } catch (err) {
        setAnalysisError('Dosya oluşturulamadı');
      } finally {
        setIsApproving(false);
      }
    }
  };

  const handleRejectAction = () => {
    setSelectedAction(null);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const allowed = ['.png', '.jpg', '.jpeg', '.webp', '.pdf', '.docx', '.xlsx'];
    const lower = file.name.toLowerCase();
    if (!allowed.some((ext) => lower.endsWith(ext))) {
      setAnalysisError('Desteklenen dosya türleri: PNG, JPG, WEBP, PDF, DOCX, XLSX');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysis(null);
    setImportResult(null);

    try {
      const reader = new FileReader();
      const data = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1] || '';
          resolve(base64);
        };
        reader.onerror = () => reject(new Error('Dosya okunamadı'));
        reader.readAsDataURL(file);
      });

      // Arka planda belgeyi kütüphaneye (documents tablosuna) kaydet
      try {
        const filePath = await callBackend<string>('save_document_file', {
          fileName: file.name,
          fileData: data,
        });

        await callBackend('create_document', {
          title: file.name,
          category: 'Asistan Yüklemesi',
          fileType: file.type || file.name.split('.').pop() || 'Bilinmiyor',
          filePath: filePath,
        });
      } catch (saveErr) {
        console.error('Dosya kütüphaneye kaydedilemedi:', saveErr);
      }

      const result = await onAnalyzeFile(data, file.name);
      setAnalysis(result);
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Dosya çözümlenemedi');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApproveImport = async () => {
    if (!analysis) return;
    setIsApproving(true);
    try {
      const result = await onImportData(analysis.entity_type, analysis.items);
      setImportResult(result);
      setAnalysis(null);
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Veri aktarılamadı');
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <>
      <div className="h-full flex flex-col bg-white relative">
        <div className="flex-1 flex flex-col min-h-0">
          {error && (
            <div className="bg-red-50 border-b border-red-200 p-4 text-sm text-red-700">
              {error}
            </div>
          )}
          {analysisError && (
            <div className="bg-red-50 border-b border-red-200 p-4 text-sm text-red-700">
              {analysisError}
            </div>
          )}
          {importResult && (
            <div className="bg-green-50 border-b border-green-200 p-4 text-sm text-green-800">
              <Check className="mr-1.5 inline h-4 w-4" />
              {importResult.imported} kayıt başarıyla aktarıldı.
            </div>
          )}
          
          <MessageList messages={messages} isLoading={isLoading} onActionClick={setSelectedAction} />
        </div>

        {/* Canlı ajan adımları (terminal, dosya, excel, word, görsel, veritabanı) */}
        {agentSteps.length > 0 && (
          <div className="shrink-0 px-4">
            <AgentSteps steps={agentSteps} visible />
          </div>
        )}

        <div className="w-full max-w-3xl mx-auto px-4 pb-4 shrink-0">
          <InputArea 
            onSendMessage={onSendMessage} 
            isLoading={isLoading} 
            onFileSelect={handleFileSelect}
            isAnalyzing={isAnalyzing}
          />
        </div>
      </div>

      {/* Dosya analizi onay dialogu */}
      <Dialog open={!!analysis} onOpenChange={(open) => !open && setAnalysis(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dosya Analizi Sonucu</DialogTitle>
            <DialogDescription>
              AI dosyayı inceledi. Aşağıdaki verileri uygulamaya aktarmak istiyor:
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-3">
              <FileText className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">
                Tür: {ENTITY_LABELS[analysis?.entity_type || ''] || analysis?.entity_type}
              </span>
              <span className="text-sm text-gray-500">
                ({analysis?.items.length || 0} kayıt)
              </span>
            </div>
            <p className="text-sm text-gray-700">{analysis?.summary}</p>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-border p-3">
              <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                {JSON.stringify(analysis?.items, null, 2)}
              </pre>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAnalysis(null)}
              disabled={isApproving}
            >
              <X className="mr-1.5 h-4 w-4" />
              İptal
            </Button>
            <Button onClick={handleApproveImport} disabled={isApproving}>
              {isApproving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              <Check className="mr-1.5 h-4 w-4" />
              Onayla ve Aktar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Önerilen işlem onay dialogu */}
      <Dialog open={!!selectedAction} onOpenChange={(open) => !open && setSelectedAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>İşlem Onayı</DialogTitle>
            <DialogDescription>
              Asistan şu işlemi yapmak istiyor:
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-700">
              {selectedAction?.description}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleRejectAction}
              disabled={isApproving}
            >
              İptal
            </Button>
            <Button
              onClick={handleApproveAction}
              disabled={isApproving}
            >
              Onayla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
