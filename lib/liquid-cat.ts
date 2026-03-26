/**
 * Lv.4 のびのび学生：液体ねこコレクション
 * 栄養バランスの良い食事が3日続くと容器がアンロックされる
 */

/** 容器の種類 */
export const LIQUID_CONTAINERS = [
  { id: "mug", name: "マグカップ", emoji: "☕", imagePath: "/pets/containers/mug.png" },
  { id: "box", name: "段ボール箱", emoji: "📦", imagePath: "/pets/containers/box.png" },
  { id: "bowl", name: "どんぶり", emoji: "🍜", imagePath: "/pets/containers/bowl.png" },
  { id: "vase", name: "花瓶", emoji: "🏺", imagePath: "/pets/containers/vase.png" },
  { id: "pot", name: "植木鉢", emoji: "🪴", imagePath: "/pets/containers/pot.png" },
] as const;

export type ContainerId = (typeof LIQUID_CONTAINERS)[number]["id"];

export interface DayLogForNutrition {
  date: string;
  meal_description?: string | null;
  calories?: number | null;
  protein?: number | null;
}

/** 1日分の栄養スコア（0 or 1）。食事記録＋カロリーorタンパク質があれば良好 */
export function getDayNutritionScore(log: DayLogForNutrition): number {
  const hasMeal = (log.meal_description ?? "").trim().length > 0;
  const hasCalories = (log.calories ?? 0) > 0;
  const hasProtein = (log.protein ?? 0) > 0;
  if (hasMeal && (hasCalories || hasProtein)) return 1;
  return 0;
}

/** 過去3日間のログが栄養良好か（3日ともスコア1） */
export function hasGoodNutritionFor3Days(logs: DayLogForNutrition[]): boolean {
  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date));
  const last3 = sorted.slice(0, 3);
  if (last3.length < 3) return false;
  return last3.every((log) => getDayNutritionScore(log) === 1);
}

const STORAGE_KEY = "liquidCatUnlockedContainers";

/** アンロック済み容器ID一覧を取得 */
export function getUnlockedContainers(): ContainerId[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown[];
    return arr.filter((id): id is ContainerId =>
      LIQUID_CONTAINERS.some((c) => c.id === id)
    );
  } catch {
    return [];
  }
}

const LAST_UNLOCK_DATE_KEY = "liquidCatLastUnlockDate";

/** 新規容器を1つランダムアンロックして保存。同日の重複アンロックを防ぐ */
export function unlockRandomContainerIfEligible(): ContainerId | null {
  if (typeof window === "undefined") return null;
  const today = new Date().toISOString().split("T")[0];
  try {
    if (localStorage.getItem(LAST_UNLOCK_DATE_KEY) === today) return null;
  } catch {
    return null;
  }
  const unlocked = getUnlockedContainers();
  const locked = LIQUID_CONTAINERS.filter((c) => !unlocked.includes(c.id));
  if (locked.length === 0) return null;
  const pick = locked[Math.floor(Math.random() * locked.length)];
  const next = [...unlocked, pick.id];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    localStorage.setItem(LAST_UNLOCK_DATE_KEY, today);
  } catch {
    return null;
  }
  return pick.id;
}
