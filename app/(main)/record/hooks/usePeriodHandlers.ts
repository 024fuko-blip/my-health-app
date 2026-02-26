import { useCallback } from 'react';
import { apiPatch, apiPut } from '@/lib/api-client';
import type { PeriodSettings } from './useRecordInit';

interface UsePeriodHandlersDeps {
  setPeriodSettings: React.Dispatch<React.SetStateAction<PeriodSettings>>;
  lastUserEditRef: React.MutableRefObject<{ date: string; time: number }>;
}

export function usePeriodHandlers({ setPeriodSettings, lastUserEditRef }: UsePeriodHandlersDeps) {
  const handlePeriodStart = useCallback(
    async (dateStr: string) => {
      try {
        const res = await apiPatch<unknown>('/api/user-settings/period', { last_period_date: dateStr });
        if (res.ok) {
          setPeriodSettings((prev) => ({ ...prev, lastPeriodDate: dateStr }));
        }
      } catch (e) {
        console.error('Period start update error:', e);
      }
    },
    [setPeriodSettings]
  );

  const handlePeriodEnd = useCallback(
    async (_startDate: string, duration: number) => {
      try {
        const res = await apiPatch<unknown>('/api/user-settings/period', { period_duration: duration });
        if (res.ok) {
          setPeriodSettings((prev) => ({ ...prev, periodDuration: duration }));
        }
      } catch (e) {
        console.error('Period end update error:', e);
      }
    },
    [setPeriodSettings]
  );

  const savePeriodStatusToLog = useCallback(
    async (dateStr: string, status: string) => {
      lastUserEditRef.current = { date: dateStr, time: Date.now() };
      try {
        await apiPut('/api/health-logs/period-status', { date: dateStr, period_status: status });
      } catch (e) {
        console.error('Period status save error:', e);
      }
    },
    [lastUserEditRef]
  );

  return { handlePeriodStart, handlePeriodEnd, savePeriodStatusToLog };
}
