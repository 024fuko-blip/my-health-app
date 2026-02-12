/** 餌：id, 名前, ポイント, 絵文字, あげたときの幸福度アップ */
export const PET_FOODS = [
  { id: "food_basic", name: "餌", cost: 10, emoji: "🍖", happinessGain: 5 },
  { id: "food_fish", name: "お魚", cost: 20, emoji: "🐟", happinessGain: 10 },
  { id: "food_premium", name: "ごちそう", cost: 50, emoji: "🍱", happinessGain: 20 },
  { id: "food_cake", name: "ケーキ", cost: 80, emoji: "🎂", happinessGain: 30 },
] as const;

/** 着せ替え：id, 名前, ポイント, 絵文字 */
export const PET_OUTFITS = [
  { id: "outfit_none", name: "なし", cost: 0, emoji: null },
  { id: "outfit_ribbon", name: "リボン", cost: 100, emoji: "🎀" },
  { id: "outfit_hat", name: "帽子", cost: 150, emoji: "🎩" },
  { id: "outfit_glasses", name: "メガネ", cost: 120, emoji: "👓" },
  { id: "outfit_scarf", name: "マフラー", cost: 200, emoji: "🧣" },
  { id: "outfit_crown", name: "王冠", cost: 300, emoji: "👑" },
] as const;

export type PetFoodId = (typeof PET_FOODS)[number]["id"];
export type PetOutfitId = (typeof PET_OUTFITS)[number]["id"];

export const PET_SPECIES = [
  { id: "cat", name: "ねこ", emoji: "🐱" },
  { id: "dog", name: "いぬ", emoji: "🐶" },
  { id: "rabbit", name: "うさぎ", emoji: "🐰" },
  { id: "capybara", name: "カピバラ", emoji: "🦫" },
  { id: "hamster", name: "ハムスター", emoji: "🐹" },
  { id: "duck", name: "アヒル", emoji: "🐤" },
] as const;

export const MAX_HAPPINESS = 100;

/** レベルごとに必要な累計EXP（レベル2なら50、レベル3なら120...） */
export const EXP_PER_LEVEL = [0, 0, 50, 120, 210, 320, 450, 600, 770, 960, 1200];
export const MAX_LEVEL = 10;

/** 餌1回で獲得するEXP */
export const EXP_PER_FEED = 15;

/** 累計EXPからレベルを算出 */
export function getLevelFromExp(exp: number): number {
  for (let l = MAX_LEVEL; l >= 1; l--) {
    if (exp >= (EXP_PER_LEVEL[l] ?? 0)) return l;
  }
  return 1;
}

/** 現在のレベルの次のレベルまでに必要なEXP（レベルアップに必要な残り） */
export function getExpToNextLevel(exp: number): { current: number; needed: number } {
  const level = getLevelFromExp(exp);
  const currentLevelExp = EXP_PER_LEVEL[level] ?? 0;
  const nextLevelExp = level >= MAX_LEVEL ? currentLevelExp : (EXP_PER_LEVEL[level + 1] ?? currentLevelExp);
  return {
    current: exp - currentLevelExp,
    needed: nextLevelExp - currentLevelExp,
  };
}

/** 幸福度に応じた表情・コメント */
export const PET_MOODS = [
  { minHappiness: 0, maxHappiness: 20, face: "😢", label: "悲しい", comments: ["お腹すいた...", "寂しいよ...", "誰か..."] },
  { minHappiness: 21, maxHappiness: 40, face: "😟", label: "元気ない", comments: ["少し眠い...", "だるい...", "餌ちょうだい"] },
  { minHappiness: 41, maxHappiness: 60, face: "😐", label: "ふつう", comments: ["今日は何する？", "んー", "まったりしてる"] },
  { minHappiness: 61, maxHappiness: 80, face: "🙂", label: "ごきげん", comments: ["嬉しい！", "ありがとう", "いい感じ"] },
  { minHappiness: 81, maxHappiness: 100, face: "😄", label: "絶好調", comments: ["最高！", "たのしい！", "もっと遊ぼう！"] },
] as const;

/** 幸福度から表情・コメントを取得（日付ベースでコメントをローテーション） */
export function getMoodFromHappiness(happiness: number): { face: string; label: string; comment: string } {
  const h = Math.max(0, Math.min(100, happiness));
  const mood = PET_MOODS.find((m) => h >= m.minHappiness && h <= m.maxHappiness) ?? PET_MOODS[2];
  const idx = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % mood.comments.length;
  return {
    face: mood.face,
    label: mood.label,
    comment: mood.comments[idx],
  };
}
