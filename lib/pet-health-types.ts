/** ペット健康度システム共通型定義 */

export type PetVisualMode = "damaged" | "normal" | "sparkle";

export interface PetVisualState {
  mode: PetVisualMode;
  barColor: string;
  label: string;
  filterSaturate: number;
  filterBrightness: number;
}

export interface HealthInput {
  steps?: number | null;
  calories?: number | null;
  /** "良い" | "普通" | "悪い" またはサーバーが返す文字列 */
  sleepQuality?: string | null;
  /** ISO 8601 文字列 or Date */
  lastLogin?: string | Date | null;
}

export interface ScoreBreakdown {
  stepsScore: number;
  caloriesScore: number;
  sleepScore: number;
  loginBonus: number;
  decayPenalty: number;
}

export interface HealthScoreResult {
  score: number;
  healthLevel: number;
  breakdown: ScoreBreakdown;
  flags: PetSpecialFlags;
}

export interface PetSpecialFlags {
  sleepy: boolean;
  nightOwl: boolean;
  earlyBird: boolean;
}

export interface PetHealthSnapshot {
  score: number;
  healthLevel: number;
  flags: PetSpecialFlags;
  calculatedAt: string;
}
