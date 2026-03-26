"use client";

import { MANGA_SYMBOLS, type MangaSymbolKey } from "@/lib/manga-symbols";

/**
 * 漫符（まんぷ）：猫の頭上に表示する小さな画像エフェクト
 * アニメーションに合わせて表示
 */
interface MangaSymbolProps {
  /** 表示する漫符（キーまたは直接絵文字） */
  symbol: MangaSymbolKey | string;
  /** アニメーション種類 */
  variant?: "float" | "pulse" | "sparkle" | "shake";
  /** 複数並べる場合の数（例: ✨✨✨） */
  count?: number;
  /** 頭上オーバーレイ用に絶対配置するか（デフォルト: false） */
  overlay?: boolean;
  /** 追加クラス */
  className?: string;
}

/** 漫符キーから推奨アニメーションを取得 */
function getDefaultVariant(symbol: string): "float" | "pulse" | "sparkle" | "shake" {
  if (symbol === MANGA_SYMBOLS.sparkle) return "sparkle";
  if (symbol === MANGA_SYMBOLS.bulb) return "pulse";
  if (symbol === MANGA_SYMBOLS.sleep) return "float";
  if (symbol === MANGA_SYMBOLS.anger) return "shake";
  if (symbol === MANGA_SYMBOLS.sweat) return "shake";
  if (symbol === MANGA_SYMBOLS.heart) return "float";
  return "float";
}

export function MangaSymbol({
  symbol,
  variant,
  count = 1,
  overlay = false,
  className = "",
}: MangaSymbolProps) {
  const emoji =
    symbol in MANGA_SYMBOLS
      ? MANGA_SYMBOLS[symbol as MangaSymbolKey]
      : symbol;
  const anim = variant ?? getDefaultVariant(emoji);
  const animClass =
    anim === "float"
      ? "manga-float"
      : anim === "pulse"
        ? "manga-pulse"
        : anim === "sparkle"
          ? "manga-sparkle"
          : "manga-shake";

  return (
    <div
      className={`manga-symbol inline-flex items-center justify-center ${animClass} ${overlay ? "manga-symbol-overlay" : ""} ${className}`}
      aria-hidden
    >
      <span className="manga-symbol-emoji">{emoji.repeat(count)}</span>
    </div>
  );
}
