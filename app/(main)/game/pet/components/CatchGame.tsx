"use client";

import { useState, useEffect, useCallback } from "react";

const FOODS = ["🍖", "🐟", "🍱", "🎂"];
const DURATION = 30;

interface CatchGameProps {
  onFinish: (score: number) => void;
  onClose: () => void;
}

export function CatchGame({ onFinish, onClose }: CatchGameProps) {
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [score, setScore] = useState(0);
  const [items, setItems] = useState<Array<{ id: number; emoji: string; left: number; top: number }>>([]);
  const [started, setStarted] = useState(false);

  const spawn = useCallback(() => {
    setItems((prev) => [
      ...prev.slice(-15),
      {
        id: Date.now() + Math.random(),
        emoji: FOODS[Math.floor(Math.random() * FOODS.length)],
        left: Math.random() * 70 + 10,
        top: 0,
      },
    ]);
  }, []);

  useEffect(() => {
    if (!started) return;
    const t = setInterval(() => setTimeLeft((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(t);
  }, [started]);

  useEffect(() => {
    if (!started || timeLeft <= 0) return;
    const i = setInterval(spawn, 800);
    return () => clearInterval(i);
  }, [started, timeLeft, spawn]);

  useEffect(() => {
    if (started && timeLeft <= 0) {
      onFinish(score);
    }
  }, [started, timeLeft, score, onFinish]);

  const handleCatch = (id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setScore((s) => s + 1);
  };

  if (!started) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white p-6 max-w-sm w-full">
          <h3 className="font-bold text-lg mb-2">おやつキャッチ</h3>
          <p className="text-sm text-slate-700 mb-4">
            落ちてくるおやつをタップしてキャッチ！30秒で何個取れるかな？1日3回まで。
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStarted(true)}
              className="flex-1 py-3 bg-amber-500 text-white font-bold"
            >
              スタート
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 border border-gray-300"
            >
              やめる
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-sky-100 flex flex-col z-50">
      <div className="flex justify-between items-center p-4 border-b bg-white">
        <span className="font-bold">⏱ {timeLeft}秒</span>
        <span className="font-bold">🍖 {score}個</span>
      </div>
      <div
        className="flex-1 relative overflow-hidden"
        style={{ minHeight: "60vh" }}
      >
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleCatch(item.id)}
            className="absolute text-4xl touch-manipulation animate-fall"
            style={{
              left: `${item.left}%`,
              top: "0%",
            }}
          >
            {item.emoji}
          </button>
        ))}
      </div>
      <div className="p-4 bg-white border-t">
        <p className="text-sm text-center text-slate-700">
          おやつをタップしてキャッチ！
        </p>
      </div>
    </div>
  );
}
