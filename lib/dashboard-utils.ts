/**
 * ダッシュボードのスコア計算・チャートデータ変換ロジック。
 * SRP: UI コンポーネントから純粋な計算ロジックを分離。
 */

import type { HealthLogApiResponse } from '@/app/(main)/record/hooks/record-form-types';

type HealthLogRow = HealthLogApiResponse;

export function computeMindScore(logs: HealthLogRow[]): string | null {
  const withStress = logs
    .filter((r) => r.stress_level != null)
    .map((r) => (10 - (r.stress_level ?? 0)) / 5);
  const withSleep = logs
    .filter((r) => r.sleep_quality)
    .map((r) => {
      const s = r.sleep_quality ?? '';
      if (s.includes('良')) return 5;
      if (s.includes('普')) return 3;
      return 1;
    });
  const vals = [...withStress, ...withSleep];
  if (vals.length === 0) return null;
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
}

export function computeBodyScore(logs: HealthLogRow[]): string | null {
  const withMood = logs
    .filter((r) => r.general_mood != null)
    .map((r) => r.general_mood ?? 0);
  const withPain = logs
    .filter((r) => r.pain_level != null)
    .map((r) => 6 - (r.pain_level ?? 0));
  const vals = [...withMood, ...withPain];
  if (vals.length === 0) return null;
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
}

export interface ChartDataPoint {
  date: string;
  fullDate: string;
  体調: number | null;
  腹痛: number | null;
  気分: number | null;
  体重: number | null;
  トイレ: number | null;
  アルコール: number | null;
}

export function buildChartData(logs: HealthLogRow[]): ChartDataPoint[] {
  return logs.map((row) => {
    const toiletMatch = (row.stool_type || '').match(/トイレ(\d+)回/);
    const toiletCount = toiletMatch ? parseInt(toiletMatch[1]) : null;

    return {
      date: row.date.slice(5),
      fullDate: row.date,
      体調: row.general_mood ?? null,
      腹痛: row.pain_level ?? null,
      気分: row.stress_level ?? null,
      体重: row.weight ?? null,
      トイレ: toiletCount,
      アルコール: row.alcohol_amount ? Math.round(row.alcohol_amount / 100) : null,
    };
  });
}
