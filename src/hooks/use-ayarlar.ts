'use client';

import { useState, useCallback } from 'react';
import { callBackend } from '@/lib/tauri';

export interface Settings {
  company_name?: string;
  tax_no?: string;
  phone?: string;
  email?: string;
  contact_person?: string;
  abacus_api_key?: string;
  ai_provider?: string;
  google_api_key?: string;
  openai_api_key?: string;
  huggingface_api_key?: string;
  industry_type?: string;
  setup_complete?: string;
  salary_payment_day?: string;
  profile_image?: string;
  network_mode?: string;
  server_ip?: string;
}

export function useAyarlar() {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ayarı getir
  const getSetting = useCallback(async (key: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await callBackend<string | null>('get_setting', { key });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ayar alınamadı';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Ayarı kaydet
  const setSetting = useCallback(async (key: string, value: string) => {
    setLoading(true);
    setError(null);
    try {
      await callBackend('set_setting', { key, value });
      setSettings((prev) => ({ ...prev, [key]: value }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ayar kaydedilemedi';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Tüm ayarları yükle
  const loadAllSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const keys = ['company_name', 'tax_no', 'phone', 'email', 'contact_person', 'abacus_api_key', 'ai_provider', 'google_api_key', 'openai_api_key', 'huggingface_api_key', 'industry_type', 'setup_complete', 'network_mode', 'server_ip'];
      const result: Settings = {};

      await Promise.all(
        keys.map(async (key) => {
          try {
            const value = await callBackend<string | null>('get_setting', { key });
            if (value) {
              result[key as keyof Settings] = value;
            }
          } catch {
            // Ignore individual setting errors
          }
        })
      );

      setSettings(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ayarlar yüklenemedi';
      setError(message);
      return {};
    } finally {
      setLoading(false);
    }
  }, []);

  // Yedek oluştur
  const exportBackup = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await callBackend<string>('export_backup');
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Yedek oluşturulamadı';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Yedekten geri yükle
  const importBackup = useCallback(async (jsonData: string) => {
    setLoading(true);
    setError(null);
    try {
      await callBackend('import_backup', { json: jsonData });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Yedek geri yüklenemedi';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // AI sağlayıcı API anahtarını test et
  const testApiKey = useCallback(async (provider: string, apiKey: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await callBackend<boolean>('test_ai_provider', {
        provider,
        api_key: apiKey,
      });
      return result === true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Veri konumunu getir
  const getDataLocation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await callBackend<{ current_dir: string; is_default: boolean }>(
        'get_data_location'
      );
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Veri konumu alınamadı';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Veri konumunu değiştir (uygulama yeniden başlar)
  const setDataLocation = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      await callBackend('set_data_location', { path });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Veri konumu değiştirilemedi';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Veri konumunu varsayılana sıfırla (uygulama yeniden başlar)
  const resetDataLocation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await callBackend('reset_data_location');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Veri konumu sıfırlanamadı';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    settings,
    loading,
    error,
    getSetting,
    setSetting,
    loadAllSettings,
    exportBackup,
    importBackup,
    testApiKey,
    getDataLocation,
    setDataLocation,
    resetDataLocation,
  };
}
