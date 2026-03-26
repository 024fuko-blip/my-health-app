"use client";

import { useState, useEffect } from "react";
import { LIQUID_CONTAINERS, type ContainerId } from "@/lib/liquid-cat";
import { MangaSymbol } from "@/app/components/MangaSymbol";
import { MANGA_SYMBOLS } from "@/lib/manga-symbols";

/** Lv.4 液体ねこ画像 */
const LV4_LIQUID_IMAGE_PATH = "/pets/cat/stage_4_liquid.png";

interface LiquidCatInContainerProps {
  containerId: ContainerId;
  speciesEmoji?: string;
}

export function LiquidCatInContainer({
  containerId,
  speciesEmoji = "🐱",
}: LiquidCatInContainerProps) {
  const [useEmoji, setUseEmoji] = useState(false);
  const [containerUseEmoji, setContainerUseEmoji] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const container = LIQUID_CONTAINERS.find((c) => c.id === containerId);

  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      const gamma = e.gamma ?? 0;
      const beta = e.beta ?? 0;
      const x = Math.max(-8, Math.min(8, gamma * 0.3));
      const y = Math.max(-8, Math.min(8, beta * 0.2));
      setTilt({ x, y });
    };
    if (typeof window !== "undefined" && "DeviceOrientationEvent" in window) {
      window.addEventListener("deviceorientation", handleOrientation, true);
      return () =>
        window.removeEventListener("deviceorientation", handleOrientation, true);
    }
  }, []);

  if (!container) return null;

  return (
    <div className="relative inline-block">
      {/* 漫符：液体化・リラックス（Lv.4） */}
      <div className="absolute -top-6 left-1/2 -translate-x-1/2">
        <MangaSymbol symbol={MANGA_SYMBOLS.sleep} variant="float" className="text-xl" />
      </div>

      {/* 容器＋液体ねこ */}
      <div className="relative w-32 h-36 flex flex-col items-center justify-end">
        <div className="relative w-24 h-28 flex items-end justify-center bg-amber-50/50">
          {/* 容器 */}
          {!containerUseEmoji ? (
            <img
              src={container.imagePath}
              alt={container.name}
              className="w-full h-full object-contain object-bottom"
              onError={() => setContainerUseEmoji(true)}
            />
          ) : (
            <span
              className="text-6xl absolute bottom-0"
              aria-hidden
            >
              {container.emoji}
            </span>
          )}

          {/* 液体ねこ（とろ〜ん・ジャイロで揺れる） */}
          <div
            className="absolute bottom-2 left-1/2 -translate-x-1/2 will-change-transform"
            style={{
              transform: `translate(calc(-50% + ${tilt.x}px), ${tilt.y}px)`,
              transition: "transform 0.1s ease-out",
            }}
          >
            {!useEmoji ? (
              <img
                src={LV4_LIQUID_IMAGE_PATH}
                alt="液体ねこ"
                className="w-14 h-12 object-contain object-bottom opacity-90"
                onError={() => setUseEmoji(true)}
              />
            ) : (
              <span className="text-4xl block text-center" aria-hidden>
                {speciesEmoji}
              </span>
            )}
          </div>
        </div>
        <p className="text-xs text-slate-600 mt-1">{container.name}</p>
      </div>
    </div>
  );
}
