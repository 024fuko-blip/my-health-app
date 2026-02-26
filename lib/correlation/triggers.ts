/**
 * 「条件 X のとき Y が悪化する」トリガー検出
 * 純粋な四則演算で API コスト 0
 */

import { sleepToNum, nextDateStr } from './utils';

export interface HealthLogForTrigger {
  date: string;
  alcoholAmount?: number | null;
  painLevel?: number | null;
  generalMood?: number | null;
  sleepQuality?: string | null;
  stressLevel?: number | null;
  periodStatus?: string | null;
}

export interface TriggerResult {
  label: string;
  ratio: number;
  description: string;
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * 飲酒した日の翌日の腹痛 vs 非飲酒日の腹痛
 * byDate は detectAllTriggers から受け取り、Map 作成を 1 回に集約（D-03）
 */
export function detectAlcoholPainTrigger(
  logs: HealthLogForTrigger[],
  byDate: Map<string, HealthLogForTrigger>
): TriggerResult | null {
  const drinkDays: number[] = [];
  const noDrinkDays: number[] = [];

  for (const log of logs) {
    const pain = log.painLevel;
    if (pain == null || pain < 1) continue;

    if ((log.alcoholAmount ?? 0) > 0) {
      const next = byDate.get(nextDateStr(log.date));
      if (next?.painLevel != null) drinkDays.push(next.painLevel);
    } else {
      noDrinkDays.push(pain);
    }
  }

  if (drinkDays.length < 2 || noDrinkDays.length < 2) return null;
  const drinkAvg = avg(drinkDays);
  const noDrinkAvg = avg(noDrinkDays);
  if (noDrinkAvg === 0) return null;
  const ratio = drinkAvg / noDrinkAvg;
  if (ratio < 1.2) return null;
  return {
    label: '飲酒→翌日腹痛',
    ratio: Math.round(ratio * 10) / 10,
    description: `飲酒した翌日は腹痛が通常の約${ratio.toFixed(1)}倍`,
  };
}

/**
 * 飲酒した日の翌日の睡眠 vs 非飲酒日の睡眠
 */
export function detectAlcoholSleepTrigger(
  logs: HealthLogForTrigger[],
  byDate: Map<string, HealthLogForTrigger>
): TriggerResult | null {
  const drinkNextSleep: number[] = [];
  const noDrinkSleep: number[] = [];

  for (const log of logs) {
    const next = byDate.get(nextDateStr(log.date));
    const sleepNum = sleepToNum(next?.sleepQuality);
    if (sleepNum == null) continue;

    if ((log.alcoholAmount ?? 0) > 0) {
      drinkNextSleep.push(sleepNum);
    } else {
      noDrinkSleep.push(sleepNum);
    }
  }

  if (drinkNextSleep.length < 2 || noDrinkSleep.length < 2) return null;
  const drinkAvg = avg(drinkNextSleep);
  const noDrinkAvg = avg(noDrinkSleep);
  if (noDrinkAvg === 0) return null;
  const ratio = drinkAvg / noDrinkAvg;
  if (ratio > 0.9) return null;
  const pctDrop = Math.round((1 - ratio) * 100);
  return {
    label: '飲酒→翌日睡眠',
    ratio: Math.round(ratio * 10) / 10,
    description: `飲酒した翌日は睡眠の質が約${pctDrop}%低下`,
  };
}

/**
 * ストレスが高い日の翌日の体調
 */
export function detectStressMoodTrigger(
  logs: HealthLogForTrigger[],
  byDate: Map<string, HealthLogForTrigger>
): TriggerResult | null {
  const highStressNextMood: number[] = [];
  const lowStressNextMood: number[] = [];
  const stressThreshold = 6;

  for (const log of logs) {
    const next = byDate.get(nextDateStr(log.date));
    const mood = next?.generalMood;
    if (mood == null || mood < 1) continue;

    const stress = log.stressLevel ?? 0;
    if (stress >= stressThreshold) {
      highStressNextMood.push(mood);
    } else {
      lowStressNextMood.push(mood);
    }
  }

  if (highStressNextMood.length < 2 || lowStressNextMood.length < 2) return null;
  const highAvg = avg(highStressNextMood);
  const lowAvg = avg(lowStressNextMood);
  if (lowAvg === 0) return null;
  const ratio = highAvg / lowAvg;
  if (ratio > 0.9) return null;
  const pctDrop = Math.round((1 - ratio) * 100);
  return {
    label: 'ストレス→翌日体調',
    ratio: Math.round(ratio * 10) / 10,
    description: `ストレスが高い日の翌日は体調が約${pctDrop}%低下`,
  };
}

/** byDate Map を 1 回だけ作成して全 detect 関数に渡す（D-03: Map 3重作成を解消） */
export function detectAllTriggers(logs: HealthLogForTrigger[]): TriggerResult[] {
  const byDate = new Map(logs.map((l) => [l.date, l]));
  const results: TriggerResult[] = [];
  const t1 = detectAlcoholPainTrigger(logs, byDate);
  if (t1) results.push(t1);
  const t2 = detectAlcoholSleepTrigger(logs, byDate);
  if (t2) results.push(t2);
  const t3 = detectStressMoodTrigger(logs, byDate);
  if (t3) results.push(t3);
  return results;
}
