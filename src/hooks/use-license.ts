'use client';

import { useState, useCallback, useEffect } from 'react';
import { callBackend, isTauriEnvironment } from '@/lib/tauri';

export type LicenseState =
  | 'trial'
  | 'trial_expired'
  | 'licensed'
  | 'license_expired';

export interface LicenseStatus {
  state: LicenseState;
  trial_started_at: string | null;
  trial_days_left: number;
  trial_total_days: number;
  license_plan: string | null;
  license_holder: string | null;
  license_issued_at: string | null;
  license_expires_at: string | null;
  can_write: boolean;
}

export function useLicense() {
  const [status, setStatus] = useState<LicenseStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notInTauri, setNotInTauri] = useState(false);

  const refresh = useCallback(async () => {
    if (!isTauriEnvironment()) {
      setNotInTauri(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await callBackend<LicenseStatus>('get_license_status');
      setStatus(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lisans durumu alınamadı';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!isTauriEnvironment()) {
        setNotInTauri(true);
        setLoading(false);
        return;
      }
      try {
        const result = await callBackend<LicenseStatus>('get_license_status');
        if (!cancelled) setStatus(result);
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Lisans durumu alınamadı';
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const activate = useCallback(
    async (code: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await callBackend<LicenseStatus>('activate_license', { code });
        setStatus(result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Lisans kodu etkinleştirilemedi';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { status, loading, error, notInTauri, activate, refresh };
}
