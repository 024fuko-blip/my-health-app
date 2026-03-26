/**
 * ペット健康度システム — バレル re-export
 *
 * 内部は4モジュールに分割済み:
 *   pet-health-types.ts   — 共通型定義
 *   pet-health-score.ts   — スコアリングエンジン
 *   pet-health-visual.ts  — ビジュアルステート & 画像定数
 *   pet-health-storage.ts — localStorage 永続化
 *
 * 既存の `import { ... } from "@/lib/pet-health"` を壊さないために維持。
 */

export type {
  PetVisualMode,
  PetVisualState,
  HealthInput,
  ScoreBreakdown,
  HealthScoreResult,
  PetSpecialFlags,
  PetHealthSnapshot,
} from "./pet-health-types";

export {
  clamp,
  DECAY_PER_HOUR,
  DECAY_MAX,
  DECAY_GRACE_HOURS,
  calcDecay,
  detectSpecialFlags,
  scoreToHealthLevel,
  happinessToHealthLevel,
  computeHealthScore,
} from "./pet-health-score";

export {
  getVisualState,
  getActiveImageIndex,
  PLACEHOLDER_PET_IMAGE,
  RABBIT_IMAGES,
  RABBIT_BLINK_IMAGES,
  DEFAULT_PET_IMAGES,
} from "./pet-health-visual";

export {
  saveHealthSnapshot,
  loadHealthSnapshot,
  rehydrateHealthScore,
} from "./pet-health-storage";
