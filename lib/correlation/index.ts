/**
 * 心身相関のローカル統計計算（OpenAI 不要・コスト 0）
 */

import { pearsonCorrelation } from './pearson';
import { detectAllTriggers, type HealthLogForTrigger, type TriggerResult } from './triggers';
import { sleepToNum, periodToNum, nextDateStr } from './utils';

export type { TriggerResult, HealthLogForTrigger };

export interface CorrelationPair {
  key: string;
  label: string;
  x: (log: HealthLogForTrigger) => number | null;
  y: (log: HealthLogForTrigger) => number | null;
}

const CORRELATION_PAIRS: CorrelationPair[] = [
  {
    key: 'sleep_mood',
    label: '睡眠↔体調',
    x: (l) => sleepToNum(l.sleepQuality),
    y: (l) => (l.generalMood != null ? l.generalMood : null),
  },
  {
    key: 'stress_mood',
    label: 'ストレス↔体調',
    x: (l) => (l.stressLevel != null ? l.stressLevel : null),
    y: (l) => (l.generalMood != null ? l.generalMood : null),
  },
  {
    key: 'period_mood',
    label: '生理↔体調',
    x: (l) => periodToNum(l.periodStatus),
    y: (l) => (l.generalMood != null ? l.generalMood : null),
  },
];

export interface LogWithNext extends HealthLogForTrigger {
  nextDay?: HealthLogForTrigger;
}

/** 翌日相関用ペア（X の翌日の Y） */
const LAG_PAIRS: { key: string; label: string; x: (l: HealthLogForTrigger) => number | null; yNext: (l: HealthLogForTrigger) => number | null }[] = [
  {
    key: 'alcohol_pain_next',
    label: '飲酒→翌日腹痛',
    x: (l) => ((l.alcoholAmount ?? 0) > 0 ? 1 : 0),
    yNext: (l) => (l.painLevel != null ? l.painLevel : null),
  },
  {
    key: 'stress_mood_next',
    label: 'ストレス→翌日体調',
    x: (l) => (l.stressLevel != null ? l.stressLevel : null),
    yNext: (l) => (l.generalMood != null ? l.generalMood : null),
  },
];

export interface CorrelationResult {
  correlations: Record<string, number>;
  triggers: TriggerResult[];
}

/**
 * 直近 N 日分のログから相関・トリガーを計算
 */
export function computeCorrelations(
  logs: HealthLogForTrigger[],
  days = 30
): CorrelationResult {
  const recent = logs
    .slice(-days)
    .filter((l) => l.date);

  const correlations: Record<string, number> = {};
  for (const pair of CORRELATION_PAIRS) {
    const xArr: number[] = [];
    const yArr: number[] = [];
    for (const log of recent) {
      const x = pair.x(log);
      const y = pair.y(log);
      if (x != null && y != null) {
        xArr.push(x);
        yArr.push(y);
      }
    }
    const r = pearsonCorrelation(xArr, yArr);
    if (r != null && Math.abs(r) >= 0.3) {
      correlations[pair.key] = Math.round(r * 100) / 100;
    }
  }

  const byDate = new Map<string, HealthLogForTrigger>();
  recent.forEach((l) => byDate.set(l.date, l));

  for (const pair of LAG_PAIRS) {
    const xArr: number[] = [];
    const yArr: number[] = [];
    for (const log of recent) {
      const x = pair.x(log);
      if (x == null) continue;
      const nextLog = byDate.get(nextDateStr(log.date));
      if (!nextLog) continue;
      const y = pair.yNext(nextLog);
      if (y == null) continue;
      xArr.push(x);
      yArr.push(y);
    }
    const r = pearsonCorrelation(xArr, yArr);
    if (r != null && Math.abs(r) >= 0.3) {
      correlations[pair.key] = Math.round(r * 100) / 100;
    }
  }

  const triggers = detectAllTriggers(recent);

  return { correlations, triggers };
}
