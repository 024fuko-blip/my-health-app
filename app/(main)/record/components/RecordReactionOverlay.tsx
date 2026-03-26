"use client";

import { useState } from "react";
import { MangaSymbol } from "@/app/components/MangaSymbol";
import { MANGA_SYMBOLS } from "@/lib/manga-symbols";

/** Lv.2 よちよちベビー用の画像パス（存在しない場合は絵文字で表示） */
const LV2_IMAGE_PATH = "/pets/cat/stage_2.png";

interface RecordReactionOverlayProps {
  /** ペットの絵文字（画像がない場合のフォールバック） */
  speciesEmoji?: string;
  /** 連続記録日数（漫符の数・アニメーション速度に影響） */
  streak: number;
  /** 獲得EXP */
  expGained: number;
  /** 進化したか */
  leveledUp?: boolean;
  onComplete: () => void;
}

/** 連続記録日数に応じた漫符の数 */
function getSparkleCount(streak: number): number {
  if (streak >= 3) return 3;
  if (streak >= 2) return 2;
  return 1;
}

/** 連続記録日数に応じたアニメーション時間（短いほど速い） */
function getAnimationDuration(streak: number): number {
  if (streak >= 3) return 0.8;
  if (streak >= 2) return 1;
  return 1.2;
}

export function RecordReactionOverlay({
  speciesEmoji = "🐱",
  streak,
  expGained,
  leveledUp,
  onComplete,
}: RecordReactionOverlayProps) {
  const [useEmoji, setUseEmoji] = useState(false);
  const sparkleCount = getSparkleCount(streak);
  const duration = getAnimationDuration(streak);

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-[60] animate-fade-in"
      role="dialog"
      aria-label="ぽっちの記録リアクション"
    >
      <div className="flex flex-col items-center gap-4">
        {/* 漫符：大喜び・成功（Lv.2） */}
        <MangaSymbol
          symbol={MANGA_SYMBOLS.sparkle}
          variant="sparkle"
          count={sparkleCount}
          className="text-2xl"
        />

        {/* ごろんアニメーション：横に1回転して元に戻す */}
        <div className="relative w-24 h-24 flex items-center justify-center" style={{ perspective: "200px" }}>
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              animation: `record-goron ${duration}s ease-in-out 1 forwards`,
            }}
          >
            {!useEmoji ? (
            <img
              src={LV2_IMAGE_PATH}
              alt="よちよちベビー"
              className="w-20 h-20 object-contain"
              onError={() => setUseEmoji(true)}
            />
          ) : (
            <span className="text-7xl">{speciesEmoji}</span>
          )}
          </div>
        </div>

        {/* EXP・進化メッセージ */}
        <div className="text-center">
          <p className="font-bold text-lg text-white drop-shadow-md">
            ぽっちのEXP +{expGained}！
          </p>
          {leveledUp && (
            <p className="text-amber-200 font-bold mt-1 drop-shadow-md">
              進化した！
            </p>
          )}
        </div>

        {/* タップで閉じる */
        <button
          type="button"
          onClick={onComplete}
          className="mt-2 px-6 py-2 bg-white/90 text-slate-700 rounded-lg font-medium text-sm hover:bg-white transition"
        >
          見る
        </button>
      </div>
    </div>
  );
}
