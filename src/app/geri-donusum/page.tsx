'use client';

import * as React from 'react';
import { Card, CardHeader, CardDescription, CardContent } from '@/components/ui/card';
import { useRecycleBin } from '@/hooks/use-recycle-bin';
import { RecycleBinTable } from '@/components/geri-donusum/recycle-bin-table';
import { StatCard, StatCardRow } from '@/components/ui/stat-card';

export default function GeriDonusumPage() {
  const { items, loading, error, restoreItem, permanentlyDeleteItem } = useRecycleBin();
  const yakindaSilinecek = items.filter((i) => i.days_left !== undefined && i.days_left <= 7).length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Geri Dönüşüm Kutusu</h1>

      <StatCardRow>
        <StatCard label="Toplam Öğe" value={items.length} />
        <StatCard label="7 Gün İçinde Silinecek" value={yakindaSilinecek} variant={yakindaSilinecek > 0 ? 'danger' : 'default'} />
      </StatCardRow>

      <Card>
        <CardHeader>
          <CardDescription>
            Silinen kayıtları görüntüleyin, geri yükleyin veya kalıcı olarak silin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              {error}
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Yükleniyor...</div>
            </div>
          ) : (
            <RecycleBinTable
              items={items}
              onRestore={restoreItem}
              onDelete={permanentlyDeleteItem}
              isLoading={loading}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
