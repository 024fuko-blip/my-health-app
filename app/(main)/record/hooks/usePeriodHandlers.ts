import { useCallback } from 'react';
import type { PeriodSettings } from './useRecordInit';

interface UsePeriodHandlersDeps {
  setPeriodSettings: React.Dispatch<React.SetStateAction<PeriodSettings>>;
  lastUserEditRef: React.MutableRefObject<{ date: string; time: number }>;
}

export function usePeriodHandlers({ setPeriodSettings, lastUserEditRef }: UsePeriodHandlersDeps) {
  const handlePeriodStart = useCallback(
    async (dateStr: string) => {
      try {
        const res = await fetch('/api/user-settings/period', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ last_period_date: dateStr }),
          credentials: 'include',
        });
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
        const res = await fetch('/api/user-settings/period', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ period_duration: duration }),
          credentials: 'include',
        });
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
        await fetch('/api/health-logs/period-status', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: dateStr, period_status: status }),
          credentials: 'include',
        });
      } catch (e) {
        console.error('Period status save error:', e);
      }
    },
    [lastUserEditRef]
  );

  return { handlePeriodStart, handlePeriodEnd, savePeriodStatusToLog };
}
