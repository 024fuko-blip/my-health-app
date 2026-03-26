"use client";

import { useState } from "react";
import { MangaSymbol } from "@/app/components/MangaSymbol";
import { MANGA_SYMBOLS } from "@/lib/manga-symbols";

/** Lv.3 わんぱくチャイルド用の画像パス（存在しない場合は絵文字） */
const LV3_IMAGE_PATH = "/pets/cat/stage_3.png";
/** 猫じゃらし（目標達成アイコン）の画像パス */
const CAT_TEASER_IMAGE_PATH = "/pets/cat-teaser.png";

interface StepGoalReactionOverlayProps {
  todaySteps: number;
  stepGoal: number;
  speciesEmoji?: string;
  onComplete: () => void;
}

export function StepGoalReactionOverlay({
  todaySteps,
  stepGoal,
  speciesEmoji = "🐱",
  onComplete,
}: StepGoalReactionOverlayProps) {
  const [useEmoji, setUseEmoji] = useState(false);
  const [teaserUseEmoji, setTeaserUseEmoji] = useState(false);

  return (
    <div
      className="fixed inset-0 z-[55] bg-black/20 flex items-end justify-center animate-fade-in"
      role="dialog"
      aria-label="歩数目標達成"
    >
      <div className="relative w-full max-w-md h-[70vh] pointer-events-none">
        {/* 漫符：驚き・発見（Lv.3） */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10">
          <MangaSymbol symbol={MANGA_SYMBOLS.bulb} variant="pulse" className="text-2xl" />
        </div>

        {/* 猫じゃらし（右下に表示） */}
        <div className="absolute bottom-32 right-8 step-goal-teaser">
          {!teaserUseEmoji ? (
            <img
              src={CAT_TEASER_IMAGE_PATH}
              alt="猫じゃらし"
              className="w-14 h-14 object-contain"
              onError={() => setTeaserUseEmoji(true)}
            />
          ) : (
            <span className="text-5xl" aria-hidden>
              🪶
            </span>
          )}
        </div>

        {/* 猫：シャー！と飛びつく（左から猫じゃらしへ） */}
        <div className="absolute bottom-28 left-6 step-goal-cat">
          {!useEmoji ? (
            <img
              src={LV3_IMAGE_PATH}
              alt="わんぱくチャイルド"
              className="w-20 h-20 object-contain"
              onError={() => setUseEmoji(true)}
            />
          ) : (
            <span className="text-7xl">{speciesEmoji}</span>
          )}
        </div>
      </div>

      {/* 達成メッセージ・閉じる（クリック可能） */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center w-full max-w-md px-4 pointer-events-auto">
        <p className="font-bold text-lg text-slate-800 bg-white/95 px-4 py-3 rounded-lg shadow-lg">
          {todaySteps.toLocaleString()}歩 目標達成！
        </p>
        <button
          type="button"
          onClick={onComplete}
          className="mt-4 px-6 py-2.5 bg-[var(--color-sage)] text-white rounded-lg font-medium hover:opacity-90 transition"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
