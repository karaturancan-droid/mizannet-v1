'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAyarlar } from '@/hooks/use-ayarlar';
import { isTauriEnvironment } from '@/lib/tauri';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, FolderOpen, RotateCcw, Database } from 'lucide-react';

export function DataLocationSection() {
  const { loading, getDataLocation, setDataLocation, resetDataLocation } = useAyarlar();
  const [currentDir, setCurrentDir] = useState<string | null>(null);
  const [isDefault, setIsDefault] = useState(true);
  const [isChanging, setIsChanging] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLocation = useCallback(async () => {
    try {
      const result = await getDataLocation();
      setCurrentDir(result.current_dir);
      setIsDefault(result.is_default);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Veri konumu alınamadı');
    }
  }, [getDataLocation]);

  useEffect(() => {
    loadLocation();
  }, [loadLocation]);

  const handleChangeLocation = async () => {
    if (!isTauriEnvironment()) {
      setError('Bu özellik yalnızca masaüstü uygulamasında çalışır.');
      return;
    }
    setError(null);
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({ directory: true, title: 'Veri Klasörünü Seç' });
      if (typeof selected === 'string' && selected) {
        setIsChanging(true);
        await setDataLocation(selected);
        setRestarting(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Klasör seçilemedi');
      setIsChanging(false);
    }
  };

  const handleResetLocation = async () => {
    setError(null);
    setIsChanging(true);
    try {
      await resetDataLocation();
      setRestarting(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Veri konumu sıfırlanamadı');
      setIsChanging(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Veri Konumu</CardTitle>
          <CardDescription>
            Uygulama verilerinin (SQLite veritabanı) saklandığı klasörü seçin. Konum değiştirildiğinde
            mevcut tüm veriler yeni konuma taşınır ve uygulama yeniden başlatılır.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</div>
          )}

          {restarting ? (
            <div className="flex items-center gap-3 rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
              <Loader2 className="h-4 w-4 animate-spin" />
              Veriler taşınıyor, uygulama yeniden başlatılıyor...
            </div>
          ) : (
            <>
              <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-4">
                <Database className="mt-0.5 h-5 w-5 shrink-0 text-gray-500" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-700">
                    {isDefault ? 'Varsayılan Konum' : 'Özel Konum'}
                  </p>
                  <p className="mt-1 break-all font-mono text-xs text-gray-600">
                    {currentDir || (loading ? 'Yükleniyor...' : '—')}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  onClick={handleChangeLocation}
                  disabled={isChanging || loading}
                  variant="outline"
                >
                  {isChanging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Konum Değiştir
                </Button>

                {!isDefault && (
                  <Button
                    onClick={() => setShowResetConfirm(true)}
                    disabled={isChanging || loading}
                    variant="outline"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Varsayılana Sıfırla
                  </Button>
                )}
              </div>

              <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
                <p>
                  <strong>Not:</strong> Verileriniz yalnızca bu bilgisayarda, seçtiğiniz klasörde
                  saklanır. Konum değişikliği sırasında verileriniz otomatik olarak yeni klasöre
                  kopyalanır.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Varsayılana Sıfırla</DialogTitle>
            <DialogDescription>
              Veri konumu varsayılan klasöre taşınacak ve uygulama yeniden başlatılacak. Devam etmek
              istediğinizden emin misiniz?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end">
            <Button onClick={() => setShowResetConfirm(false)} variant="outline">
              İptal
            </Button>
            <Button onClick={handleResetLocation} disabled={isChanging}>
              {isChanging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sıfırla
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
