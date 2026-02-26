"use client";

interface PetPlayTabProps {
  onMinigame: (game: "sudoku" | "memory" | "pet" | "quiz") => void;
}

export function PetPlayTab({ onMinigame }: PetPlayTabProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-bold text-gray-800">ミニゲーム</h3>
      <p className="text-sm text-gray-700">
        遊んでポイントと幸福度をゲット！
      </p>
      <div className="grid gap-3">
        <button
          type="button"
          onClick={() => onMinigame("sudoku")}
          className="flex items-center gap-3 p-4 bg-amber-100 border-2 border-amber-300 text-left"
        >
          <span className="text-3xl">🔢</span>
          <div>
            <p className="font-bold">6×6 数独</p>
            <p className="text-xs text-gray-600">
              1〜6を埋めてクリア！1日1回
            </p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => onMinigame("memory")}
          className="flex items-center gap-3 p-4 bg-violet-100 border-2 border-violet-300 text-left"
        >
          <span className="text-3xl">🃏</span>
          <div>
            <p className="font-bold">神経衰弱</p>
            <p className="text-xs text-gray-600">
              健康用語のペアを探せ！1日1回
            </p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => onMinigame("pet")}
          className="flex items-center gap-3 p-4 bg-pink-100 border-2 border-pink-300 text-left"
        >
          <span className="text-3xl">💕</span>
          <div>
            <p className="font-bold">なでなでタイム</p>
            <p className="text-xs text-gray-600">
              ペットをタップしてなでなで！60秒・1日1回
            </p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => onMinigame("quiz")}
          className="flex items-center gap-3 p-4 bg-teal-100 border-2 border-teal-300 text-left"
        >
          <span className="text-3xl">📝</span>
          <div>
            <p className="font-bold">健康クイズ</p>
            <p className="text-xs text-gray-600">
              あなたの記録に基づいたクイズ！1日1回
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
