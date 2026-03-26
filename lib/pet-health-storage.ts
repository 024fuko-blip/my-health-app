/** 健康スコアの localStorage 永続化 & 復元 */

import type { HealthScoreResult, PetHealthSnapshot } from "./pet-health-types";
import {
  clamp,
  DECAY_GRACE_HOURS,
  DECAY_PER_HOUR,
  DECAY_MAX,
  scoreToHealthLevel,
  detectSpecialFlags,
} from "./pet-health-score";

const STORAGE_KEY = "pet-health-snapshot";

export function saveHealthSnapshot(result: HealthScoreResult): void {
  if (typeof window === "undefined") return;
  const snapshot: PetHealthSnapshot = {
    score: result.score,
    healthLevel: result.healthLevel,
    flags: result.flags,
    calculatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch { /* quota exceeded — 無視 */ }
}

export function loadHealthSnapshot(): PetHealthSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PetHealthSnapshot;
    if (typeof parsed.score !== "number" || typeof parsed.healthLevel !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * 保存済みスナップショットを復元し、経過時間分の追加減衰を適用して返す。
 * アプリ起動時に呼ぶことで「閉じてる間にお腹が空いた」を再現する。
 */
export function rehydrateHealthScore(): HealthScoreResult | null {
  const snap = loadHealthSnapshot();
  if (!snap) return null;

  const elapsedMs = Date.now() - new Date(snap.calculatedAt).getTime();
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  const additionalDecay = elapsedHours > DECAY_GRACE_HOURS
    ? clamp((elapsedHours - DECAY_GRACE_HOURS) * DECAY_PER_HOUR, 0, DECAY_MAX)
    : 0;

  const adjustedScore = clamp(Math.round(snap.score - additionalDecay), 0, 100);
  const flags = detectSpecialFlags();

  return {
    score: adjustedScore,
    healthLevel: scoreToHealthLevel(adjustedScore),
    breakdown: {
      stepsScore: 0,
      caloriesScore: 0,
      sleepScore: 0,
      loginBonus: 0,
      decayPenalty: additionalDecay,
    },
    flags,
  };
}
