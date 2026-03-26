/**
 * user_settings の JSON カラム（current_medications / medical_history）を
 * 安全にパースする共通ユーティリティ。
 *
 * DRY 違反で 3 箇所以上にコピペされていたロジックを統合。
 */

import { DEFAULT_PERIOD_CYCLE, DEFAULT_PERIOD_DURATION } from '@/lib/constants';

/* ────────────────── Medication ────────────────── */

export interface ParsedMedication {
  id: number;
  name: string;
  timings: string[];
  ndb?: Record<string, unknown>;
}

/**
 * `current_medications` JSON 文字列を Medication[] へ変換。
 * レガシー形式（単一 name/timings オブジェクト、生文字列）にも対応。
 */
export function parseMedications(raw: string | null | undefined): ParsedMedication[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    if (Array.isArray(data.medications)) {
      return (data.medications as Array<Record<string, unknown>>).map((m) => ({
        id: (m.id as number) ?? Date.now(),
        name: String(m.name ?? ''),
        timings: Array.isArray(m.timings) ? (m.timings as string[]) : [],
        ndb: m.ndb as Record<string, unknown> | undefined,
      }));
    }
    if (data.name || (Array.isArray(data.timings) && (data.timings as string[]).length > 0)) {
      return [{
        id: Date.now(),
        name: String(data.name || '薬'),
        timings: Array.isArray(data.timings) ? (data.timings as string[]) : [],
      }];
    }
    return [];
  } catch {
    if (typeof raw === 'string' && raw.trim()) {
      return [{ id: Date.now(), name: raw, timings: [] }];
    }
    return [];
  }
}

/* ────────────────── Period Settings ────────────────── */

export interface ParsedPeriodSettings {
  lastPeriodDate: string;
  periodCycle: number;
  periodDuration: number;
  showPeriodOnCalendar: boolean;
}

/**
 * `medical_history` JSON 文字列から生理関連設定を抽出。
 */
export function parsePeriodSettings(raw: string | null | undefined): ParsedPeriodSettings {
  const defaults: ParsedPeriodSettings = {
    lastPeriodDate: '',
    periodCycle: DEFAULT_PERIOD_CYCLE,
    periodDuration: DEFAULT_PERIOD_DURATION,
    showPeriodOnCalendar: true,
  };
  if (!raw) return defaults;
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    return {
      lastPeriodDate: String(data.lastPeriodDate ?? ''),
      periodCycle: (data.periodCycle as number) ?? DEFAULT_PERIOD_CYCLE,
      periodDuration: (data.periodDuration as number) ?? DEFAULT_PERIOD_DURATION,
      showPeriodOnCalendar: data.showPeriodOnCalendar !== false,
    };
  } catch {
    return defaults;
  }
}
