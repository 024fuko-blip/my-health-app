import { useState, useEffect, useRef } from 'react';
import type { RouterLike } from '@/lib/api-client';
import { ensureSession, apiFetch } from '@/lib/api-client';
import { DEFAULT_PERIOD_CYCLE, DEFAULT_PERIOD_DURATION, PATH } from '@/lib/constants';
import type { HealthLogRow, UserSettingsMode } from './record-form-types';

export interface PeriodSettings {
  lastPeriodDate: string;
  periodCycle: number;
  periodDuration: number;
  /** カレンダー・記録画面に生理周期を表示するか（デフォルト true） */
  showPeriodOnCalendar: boolean;
}

export interface Medication {
  id: number;
  name: string;
  timings: string[];
}

export interface InitData {
  modes: UserSettingsMode;
  aiPersonality: string;
  gender: string;
  periodSettings: PeriodSettings;
  medications: Medication[];
  todayLog: HealthLogRow | null;
  defaultTemperature: string;
  defaultWeight: string;
}

/**
 * 記録画面の初期データ（ユーザー設定＋当日ログ）を非同期で取得するフック。
 * 取得結果は initData にまとめて返し、呼び出し元でフォーム state へ反映する。
 */
export function useRecordInit(router: RouterLike) {
  const [loading, setLoading] = useState(true);
  const [initData, setInitData] = useState<InitData | null>(null);
  const initDoneRef = useRef(false);

  useEffect(() => {
    if (initDoneRef.current) return;
    initDoneRef.current = true;

    const init = async () => {
      try {
        if (!(await ensureSession(router))) return;

        const settingsRes = await apiFetch('/api/user-settings');
        if (settingsRes.status === 401) {
          router.replace(PATH.LOGIN);
          return;
        }
        const settings = settingsRes.ok ? await settingsRes.json() : null;

        let modes: UserSettingsMode = {};
        let aiPersonality = 'tsundere';
        let gender = 'unspecified';
        let meds: Medication[] = [];
        let defaultTemperature = '';
        let defaultWeight = '';
        let periodSettings: PeriodSettings = {
          lastPeriodDate: '',
          periodCycle: DEFAULT_PERIOD_CYCLE,
          periodDuration: DEFAULT_PERIOD_DURATION,
          showPeriodOnCalendar: true,
        };

        if (settings) {
          modes = {
            mode_ibd: Boolean(settings.mode_ibd),
            mode_diet: Boolean(settings.mode_diet),
            mode_alcohol: Boolean(settings.mode_alcohol),
            mode_mental: Boolean(settings.mode_mental),
          };
          aiPersonality = (settings.ai_personality as string) || 'tsundere';
          gender = (settings.gender as string) || 'unspecified';

          try {
            const medData = JSON.parse(settings.current_medications || '{}');
            if (medData.medications && Array.isArray(medData.medications)) {
              meds = medData.medications;
            } else if (medData.name || medData.timings) {
              if (medData.name || (medData.timings && medData.timings.length > 0)) {
                meds = [
                  { id: Date.now(), name: medData.name || '薬', timings: medData.timings || [] },
                ];
              }
            }
          } catch {
            /* no medications */
          }

          try {
            const medHistory = JSON.parse(settings.medical_history || '{}');
            periodSettings = {
              lastPeriodDate: medHistory.lastPeriodDate || '',
              periodCycle: medHistory.periodCycle ?? DEFAULT_PERIOD_CYCLE,
              periodDuration: medHistory.periodDuration ?? DEFAULT_PERIOD_DURATION,
              showPeriodOnCalendar: medHistory.showPeriodOnCalendar !== false,
            };
          } catch {
            /* keep defaults */
          }

          if (settings.normal_temperature != null)
            defaultTemperature = String(settings.normal_temperature);
          if (settings.weight != null) defaultWeight = String(settings.weight);
        }

        const today = new Date().toISOString().split('T')[0];
        const logRes = await apiFetch(`/api/health-logs?date=${today}`);
        if (logRes.status === 401) {
          router.replace(PATH.LOGIN);
          return;
        }
        const log = logRes.ok ? await logRes.json() : null;

        setInitData({
          modes,
          aiPersonality,
          gender,
          periodSettings,
          medications: meds,
          todayLog: (log as HealthLogRow) ?? null,
          defaultTemperature,
          defaultWeight,
        });
      } catch (err) {
        console.error('Record init error:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  return { loading, initData };
}
