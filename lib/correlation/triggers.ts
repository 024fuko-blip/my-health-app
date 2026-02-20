/**
 * 「条件 X のとき Y が悪化する」トリガー検出
 * 純粋な四則演算で API コスト 0
 */

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

/** 睡眠品質を数値化（悪い=1, 普通=2, 良い=3） */
function sleepToNum(s: string | null | undefined): number | null {
  if (!s) return null;
  if (s.includes('悪') || s === '悪い') return 1;
  if (s.includes('普') || s === '普通') return 2;
  if (s.includes('良') || s === '良い') return 3;
  return null;
}

/** 日付を YYYY-MM-DD の翌日に */
function nextDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

/**
 * 飲酒した日の翌日の腹痛 vs 非飲酒日の腹痛
 */
export function detectAlcoholPainTrigger(
  logs: HealthLogForTrigger[]
): TriggerResult | null {
  const byDate = new Map<string, HealthLogForTrigger>();
  logs.forEach((l) => byDate.set(l.date, l));

  const drinkDays: number[] = [];
  const noDrinkDays: number[] = [];

  for (const log of logs) {
    const pain = log.painLevel;
    if (pain == null || pain < 1) continue;

    if ((log.alcoholAmount ?? 0) > 0) {
      const next = byDate.get(nextDate(log.date));
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
  logs: HealthLogForTrigger[]
): TriggerResult | null {
  const byDate = new Map<string, HealthLogForTrigger>();
  logs.forEach((l) => byDate.set(l.date, l));

  const drinkNextSleep: number[] = [];
  const noDrinkSleep: number[] = [];

  for (const log of logs) {
    const next = byDate.get(nextDate(log.date));
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
  logs: HealthLogForTrigger[]
): TriggerResult | null {
  const byDate = new Map<string, HealthLogForTrigger>();
  logs.forEach((l) => byDate.set(l.date, l));

  const highStressNextMood: number[] = [];
  const lowStressNextMood: number[] = [];

  const stressThreshold = 6;

  for (const log of logs) {
    const next = byDate.get(nextDate(log.date));
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

export function detectAllTriggers(logs: HealthLogForTrigger[]): TriggerResult[] {
  const results: TriggerResult[] = [];
  const t1 = detectAlcoholPainTrigger(logs);
  if (t1) results.push(t1);
  const t2 = detectAlcoholSleepTrigger(logs);
  if (t2) results.push(t2);
  const t3 = detectStressMoodTrigger(logs);
  if (t3) results.push(t3);
  return results;
}
