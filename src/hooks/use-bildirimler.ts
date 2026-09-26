'use client';

import { useState, useCallback } from 'react';
import { callBackend } from '@/lib/tauri';

export interface Notification {
  id: string;
  title: string;
  module: string;
  related_id?: string;
  due_date?: string;
  days_left?: number;
  status: 'aktif' | 'okundu' | 'ertelendi';
  source_type?: string;
  created_at: string;
}

export function useBildirimler() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bildirimleri listele
  const loadNotifications = useCallback(async (filters?: { module?: string; status?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await callBackend<Notification[]>('list_notifications', filters || {});
      setNotifications(result || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Bildirimler yüklenemedi';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Bildirimleri yenile
  const refreshNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await callBackend('refresh_notifications');
      await loadNotifications();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Bildirimler yenilenemedi';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [loadNotifications]);

  // Bildirim durumunu güncelle
  const updateNotificationStatus = useCallback(
    async (id: string, status: 'aktif' | 'okundu' | 'ertelendi') => {
      setLoading(true);
      setError(null);
      try {
        await callBackend('update_notification_status', { id, status });
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, status } : n))
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Durum güncellenemedi';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Bildirim tarihini güncelle (Sürükle bırak için)
  const updateNotificationDate = useCallback(
    async (id: string, newDate: string) => {
      setLoading(true);
      setError(null);
      try {
        await callBackend('update_notification_date', { id, newDate });
        // Refresh to get the updated days_left etc.
        await loadNotifications();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Tarih güncellenemedi';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [loadNotifications]
  );

  // Bildirim sil
  const deleteNotification = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await callBackend('delete_notification', { id });
      setNotifications((prev) => prev.filter((notif) => notif.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Bildirim silinemedi';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    notifications,
    loading,
    error,
    loadNotifications,
    refreshNotifications,
    updateNotificationStatus,
    updateNotificationDate,
    deleteNotification,
  };
}
