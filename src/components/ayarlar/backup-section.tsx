'use client';

import { useState, useRef } from 'react';
import { useAyarlar } from '@/hooks/use-ayarlar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { Loader2, Download, Upload } from 'lucide-react';

export function BackupSection() {
  const { loading, exportBackup, importBackup } = useAyarlar();
  const { addToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingBackupData, setPendingBackupData] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const backupData = await exportBackup();
      if (backupData) {
        const element = document.createElement('a');
        const file = new Blob([backupData], { type: 'application/json' });
        element.href = URL.createObjectURL(file);
        element.download = `mizannet-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        addToast({ title: 'Yedek başarıyla indirildi', variant: 'success' });
      }
    } catch (err) {
      addToast({ title: 'Yedek oluşturulamadı', description: err instanceof Error ? err.message : 'Bilinmeyen hata', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setPendingBackupData(text);
      setShowConfirm(true);
    } catch (err) {
      addToast({ title: 'Dosya okunamadı', variant: 'destructive' });
    }
  };

  const handleConfirmImport = async () => {
    if (!pendingBackupData) return;

    setIsImporting(true);
    try {
      await importBackup(pendingBackupData);
      addToast({ title: 'Yedek başarıyla geri yüklendi', variant: 'success' });
      setShowConfirm(false);
      setPendingBackupData(null);
    } catch (err) {
      addToast({ title: 'Yedek geri yüklenemedi', description: err instanceof Error ? err.message : 'Bilinmeyen hata', variant: 'destructive' });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Yedekleme</CardTitle>
          <CardDescription>
            Yedekler tüm verileri içerir. Geri yükleme mevcut verileri değiştirir.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={handleExport}
              disabled={isExporting || loading}
              variant="outline"
            >
              {isExporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Download className="mr-2 h-4 w-4" />
              Yedek Oluştur
            </Button>

            <Button
              onClick={handleImportClick}
              disabled={isImporting || loading}
              variant="outline"
            >
              {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Upload className="mr-2 h-4 w-4" />
              Yedekten Geri Yükle
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
            <p>
              <strong>Not:</strong> Yedekler JSON formatında kaydedilir ve tüm uygulama verilerini
              içerir. Geri yükleme işlemi mevcut verileri tamamen değiştirecektir.
            </p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yedekten Geri Yükle</DialogTitle>
            <DialogDescription>
              Bu işlem mevcut tüm verileri değiştirecektir. Devam etmek istediğinizden emin misiniz?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end">
            <Button onClick={() => setShowConfirm(false)} variant="outline">
              İptal
            </Button>
            <Button onClick={handleConfirmImport} disabled={isImporting}>
              {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Geri Yükle
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
