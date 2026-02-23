"use client";

import { useState, useEffect, useRef } from "react";

const DURATION = 60;

interface PetGameProps {
  petEmoji: string;
  onFinish: (count: number) => void;
  onClose: () => void;
}

export function PetGame({ petEmoji, onFinish, onClose }: PetGameProps) {
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const [hearts, setHearts] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!started) return;
    const t = setInterval(() => setTimeLeft((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(t);
  }, [started]);

  useEffect(() => {
    if (started && timeLeft <= 0) {
      onFinish(count);
    }
  }, [started, timeLeft, count, onFinish]);

  useEffect(() => {
    if (hearts.length === 0) return;
    const id = hearts[hearts.length - 1].id;
    const t = setTimeout(
      () => setHearts((prev) => prev.filter((x) => x.id !== id)),
      800
    );
    return () => clearTimeout(t);
  }, [hearts]);

  const handleTap = (e: React.MouseEvent | React.TouchEvent) => {
    if (!started || timeLeft <= 0) return;
    e.preventDefault();
    const touch = "touches" in e ? (e as React.TouchEvent).touches[0] ?? (e as React.TouchEvent).changedTouches?.[0] : null;
    const clientX = touch ? touch.clientX : (e as React.MouseEvent).clientX;
    const clientY = touch ? touch.clientY : (e as React.MouseEvent).clientY;
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect && clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
      setCount((c) => c + 1);
      setHearts((prev) => [
        ...prev.slice(-5),
        {
          id: Date.now() + Math.random(),
          x: (clientX - rect.left) / rect.width,
          y: (clientY - rect.top) / rect.height,
        },
      ]);
    }
  };

  if (!started) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white p-6 max-w-sm w-full">
          <h3 className="font-bold text-lg mb-2">なでなでタイム</h3>
          <p className="text-sm text-gray-600 mb-4">
            ペットをタップしてなでなで！60秒間で何回なでられるかな？1日1回まで。
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
    <div className="fixed inset-0 bg-amber-50 flex flex-col z-50">
      <div className="flex justify-between items-center p-4 border-b bg-white">
        <span className="font-bold">⏱ {timeLeft}秒</span>
        <span className="font-bold">💕 {count}回</span>
      </div>
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center relative touch-manipulation"
        style={{ minHeight: "50vh" }}
        onMouseDown={handleTap}
        onTouchStart={handleTap}
        role="button"
        tabIndex={0}
        aria-label="ペットをなでる"
      >
        <span className="text-8xl pet-anim-baby">{petEmoji}</span>
        {hearts.map((h) => (
          <span
            key={h.id}
            className="absolute text-2xl animate-ping"
            style={{
              left: `${h.x * 100}%`,
              top: `${h.y * 100}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            ❤️
          </span>
        ))}
      </div>
      <div className="p-4 bg-white border-t">
        <p className="text-sm text-center text-gray-600">
          ペットをタップしてなでなで！
        </p>
      </div>
    </div>
  );
}
