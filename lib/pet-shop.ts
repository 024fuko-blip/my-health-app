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

/** 部屋背景：id, 名前, ポイント, 絵文字 */
export const PET_ROOMS = [
  { id: "room_default", name: "デフォルト", cost: 0, emoji: "🏠" },
  { id: "room_forest", name: "森", cost: 200, emoji: "🌲" },
  { id: "room_ocean", name: "海", cost: 300, emoji: "🌊" },
  { id: "room_night", name: "夜空", cost: 500, emoji: "🌙" },
] as const;

/** 家具：id, 名前, ポイント, 絵文字 */
export const PET_FURNITURE = [
  { id: "furniture_plant", name: "観葉植物", cost: 50, emoji: "🪴" },
  { id: "furniture_lamp", name: "ランプ", cost: 80, emoji: "💡" },
  { id: "furniture_rug", name: "ラグ", cost: 100, emoji: "🟫" },
  { id: "furniture_bookshelf", name: "本棚", cost: 150, emoji: "📚" },
  { id: "furniture_sofa", name: "ソファ", cost: 200, emoji: "🛋️" },
  { id: "furniture_aquarium", name: "水槽", cost: 250, emoji: "🐠" },
  { id: "furniture_plushie", name: "ぬいぐるみ", cost: 120, emoji: "🧸" },
  { id: "furniture_clock", name: "時計", cost: 100, emoji: "🕐" },
  { id: "furniture_cushion", name: "クッション", cost: 60, emoji: "🟤" },
  { id: "furniture_picture", name: "絵画", cost: 80, emoji: "🖼️" },
] as const;

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

/** 進化ステージ: Baby(Lv1-4), Junior(Lv5-7), Adult(Lv8-10) */
export type EvolutionStage = "baby" | "junior" | "adult";

/** ねこ専用8段階進化（stage_1〜stage_8） */
export type CatStage = "stage_1" | "stage_2" | "stage_3" | "stage_4" | "stage_5" | "stage_6" | "stage_7" | "stage_8";

/** ねこ8段階の擬音・演出（ビジュアル・ロードマップ準拠） */
export const CAT_STAGE_ONOMATOPOEIA: Record<CatStage, string> = {
  stage_1: "ぷるぷる",
  stage_2: "ごろん",
  stage_3: "シャー!",
  stage_4: "とろ〜ん",
  stage_5: "ぺしぺし",
  stage_6: "シュバババ!",
  stage_7: "キラキラ",
  stage_8: "ふんわり",
};

/** ねこ8段階の累計EXP閾値（stage_Nに到達する最小EXP） */
export const CAT_EXP_THRESHOLDS: number[] = [0, 0, 100, 250, 450, 700, 1000, 1400, 1900];

/** 累計EXPからねこのステージを算出（ねこ専用） */
export function getCatStage(exp: number): CatStage {
  for (let i = CAT_EXP_THRESHOLDS.length - 1; i >= 1; i--) {
    if (exp >= (CAT_EXP_THRESHOLDS[i] ?? 0)) return `stage_${i}` as CatStage;
  }
  return "stage_1";
}

/** ねこ：次のステージまでに必要なEXP（stage_8では needed=0） */
export function getCatExpToNextStage(exp: number): { current: number; needed: number } {
  const stage = getCatStage(exp);
  const stageNum = parseInt(stage.replace("stage_", ""), 10);
  if (stageNum >= 8) {
    return { current: 0, needed: 0 };
  }
  const currentThreshold = CAT_EXP_THRESHOLDS[stageNum] ?? 0;
  const nextThreshold = CAT_EXP_THRESHOLDS[stageNum + 1] ?? currentThreshold;
  return {
    current: exp - currentThreshold,
    needed: nextThreshold - currentThreshold,
  };
}

export function getEvolutionStage(level: number): EvolutionStage {
  if (level <= 4) return "baby";
  if (level <= 7) return "junior";
  return "adult";
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
