/**
 * 漫符（まんぷ）の定義とコンテキスト別マッピング
 * 猫の頭上に「小さな画像（エフェクト）」として表示
 */

export const MANGA_SYMBOLS = {
  sparkle: "✨", // キラキラ: 大喜び・成功・目標達成 (Lv.2, Lv.7)
  bulb: "💡",   // ひらめき: 驚き・発見・アドバイス (Lv.3, Lv.5)
  sleep: "💤",  // 居眠り: 液体化・リラックス (Lv.4)
  anger: "💢",  // 怒り: 寂しい・叱咤 (記録忘れ・歩数少) (Lv.5)
  sweat: "💧",  // 汗: 失敗・寂しい・記録途切れ (共通)
  heart: "💞",  // ハート: 癒やし・応援 (Lv.8)
} as const;

export type MangaSymbolKey = keyof typeof MANGA_SYMBOLS;

/** PetCard用：幸福度・状態から漫符を決定 */
export interface PetMangaContext {
  stage?: string;
  happiness?: number;
  sleepy?: boolean;
  worried?: boolean;
  low_mood?: boolean;
}

/** 幸福度・状態に応じた漫符キーを返す（nullは非表示） */
export function getMangaSymbolForPet(ctx: PetMangaContext): MangaSymbolKey | null {
  if (!ctx) return null;
  if (ctx.sleepy) return "sleep";
  if (ctx.worried) return "anger";   // 叱咤・心配
  if (ctx.low_mood) return "sweat";  // 寂しい・元気ない
  const h = ctx.happiness ?? 50;
  if (h >= 81) return "heart";  // 癒やし・応援
  if (h >= 61) return "sparkle"; // 大喜び
  if (h >= 21) return null;      // 中立時は非表示
  return "sweat";                // 低い時は汗
}
