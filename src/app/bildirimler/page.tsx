'use client';

import { useState, useEffect } from 'react';
import { useBildirimler } from '@/hooks/use-bildirimler';
import { NotificationList } from '@/components/bildirimler/notification-list';
import { NotificationFilters } from '@/components/bildirimler/notification-filters';
import { Button } from '@/components/ui/button';
import { StatCard, StatCardRow } from '@/components/ui/stat-card';
import { RefreshCw } from 'lucide-react';

export default function BildirimlerPage() {
  const { notifications, refreshNotifications, loadNotifications } = useBildirimler();
  const aktifSayisi = notifications.filter((n) => n.status === 'aktif').length;
  const gecikmisSayisi = notifications.filter((n) => n.status === 'aktif' && (n.days_left ?? 1) < 0).length;
  const buHaftaSayisi = notifications.filter(
    (n) => n.status === 'aktif' && n.days_left !== undefined && n.days_left >= 0 && n.days_left <= 7
  ).length;
  const [moduleFilter, setModuleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshNotifications();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bildirimler</h1>
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          variant="outline"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Yenile
        </Button>
      </div>

      <StatCardRow>
        <StatCard label="Aktif" value={aktifSayisi} />
        <StatCard label="Gecikmiş" value={gecikmisSayisi} variant={gecikmisSayisi > 0 ? 'danger' : 'default'} />
        <StatCard label="Bu Hafta" value={buHaftaSayisi} variant={buHaftaSayisi > 0 ? 'warning' : 'default'} />
      </StatCardRow>

      <NotificationFilters
        moduleFilter={moduleFilter}
        statusFilter={statusFilter}
        onModuleChange={setModuleFilter}
        onStatusChange={setStatusFilter}
      />

      <NotificationList
        moduleFilter={moduleFilter}
        statusFilter={statusFilter}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
