/**
 * 健康スコアリングエンジン
 *
 * 健康データ(steps, calories, sleepQuality) + 時間経過 → healthScore(0-100)
 */

import type { HealthInput, HealthScoreResult, PetSpecialFlags } from "./pet-health-types";

/* ─── チューニング定数 ─── */

const STEPS_TARGET = 8000;
const CALORIES_TARGET = 2000;

const WEIGHT_STEPS    = 30;
const WEIGHT_CALORIES = 20;
const WEIGHT_SLEEP    = 30;
const WEIGHT_LOGIN    = 20;

const SLEEP_QUALITY_MAP: Record<string, number> = {
  "良い": 1.0,
  "普通": 0.6,
  "悪い": 0.2,
};

/** 放置 1 時間あたりの減衰ポイント（上限 40pt まで削る） */
export const DECAY_PER_HOUR = 1.2;
export const DECAY_MAX = 40;
/** 減衰が始まるまでの猶予（時間） */
export const DECAY_GRACE_HOURS = 6;

/* ─── ユーティリティ ─── */

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/* ─── 個別スコア算出 ─── */

function calcStepsScore(steps: number | null | undefined): number {
  if (!steps || steps <= 0) return 0;
  return clamp(steps / STEPS_TARGET, 0, 1) * WEIGHT_STEPS;
}

function calcCaloriesScore(cal: number | null | undefined): number {
  if (!cal || cal <= 0) return 0;
  const ratio = cal / CALORIES_TARGET;
  if (ratio <= 1) return ratio * WEIGHT_CALORIES;
  const over = ratio - 1;
  return Math.max(0, WEIGHT_CALORIES - over * WEIGHT_CALORIES);
}

function calcSleepScore(quality: string | null | undefined): number {
  if (!quality) return WEIGHT_SLEEP * 0.5;
  const factor = SLEEP_QUALITY_MAP[quality] ?? 0.5;
  return factor * WEIGHT_SLEEP;
}

function calcLoginBonus(lastLogin: string | Date | null | undefined): number {
  if (!lastLogin) return 0;
  const last = typeof lastLogin === "string" ? new Date(lastLogin) : lastLogin;
  if (isNaN(last.getTime())) return 0;
  const hoursAgo = (Date.now() - last.getTime()) / (1000 * 60 * 60);
  if (hoursAgo < 24) return WEIGHT_LOGIN;
  if (hoursAgo < 48) return WEIGHT_LOGIN * 0.5;
  return 0;
}

export function calcDecay(lastLogin: string | Date | null | undefined): number {
  if (!lastLogin) return DECAY_MAX;
  const last = typeof lastLogin === "string" ? new Date(lastLogin) : lastLogin;
  if (isNaN(last.getTime())) return DECAY_MAX;
  const hoursAgo = (Date.now() - last.getTime()) / (1000 * 60 * 60);
  if (hoursAgo <= DECAY_GRACE_HOURS) return 0;
  return clamp((hoursAgo - DECAY_GRACE_HOURS) * DECAY_PER_HOUR, 0, DECAY_MAX);
}

/* ─── 特殊フラグ判定 ─── */

export function detectSpecialFlags(): PetSpecialFlags {
  const hour = new Date().getHours();
  return {
    sleepy: hour >= 1 && hour < 5,
    nightOwl: hour >= 0 && hour < 4,
    earlyBird: hour >= 5 && hour < 7,
  };
}

/* ─── レベル決定 ─── */

/**
 * 80-100 → super  (healthLevel 8-10)
 * 40-79  → normal (healthLevel 4-7)
 * 0-39   → baby   (healthLevel 1-3)
 */
export function scoreToHealthLevel(score: number): number {
  const s = clamp(score, 0, 100);
  if (s >= 80) return 8 + Math.round(((s - 80) / 20) * 2);
  if (s >= 40) return 4 + Math.round(((s - 40) / 40) * 3);
  return 1 + Math.round((s / 40) * 2);
}

/** 後方互換: happiness(0-100) → healthLevel(1-10) */
export function happinessToHealthLevel(happiness: number): number {
  return scoreToHealthLevel(clamp(happiness, 0, 100));
}

/* ─── メインスコア算出 ─── */

export function computeHealthScore(input: HealthInput): HealthScoreResult {
  const stepsScore    = calcStepsScore(input.steps);
  const caloriesScore = calcCaloriesScore(input.calories);
  const sleepScore    = calcSleepScore(input.sleepQuality);
  const loginBonus    = calcLoginBonus(input.lastLogin);
  const decayPenalty  = calcDecay(input.lastLogin);

  const raw = stepsScore + caloriesScore + sleepScore + loginBonus - decayPenalty;
  const score = clamp(Math.round(raw), 0, 100);
  const healthLevel = scoreToHealthLevel(score);
  const flags = detectSpecialFlags();

  return {
    score,
    healthLevel,
    breakdown: { stepsScore, caloriesScore, sleepScore, loginBonus, decayPenalty },
    flags,
  };
}
