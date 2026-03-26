"use client";

/**
 * PetVisual 用カスタムフック & アニメーション生成
 *
 * 責務: DOM/状態に依存するエフェクト制御をUIコンポーネントから分離
 */

import { useState, useEffect, useRef } from "react";
import { RABBIT_BLINK_IMAGES, type PetVisualState } from "@/lib/pet-health";

/* ═══════════════════════════════════════════════════════════════════════
 *  カスタムフック
 * ═══════════════════════════════════════════════════════════════════════ */

/** 数秒おきに一瞬だけ true を返す瞬きタイマー */
export function useBlinkEffect(activeIdx: number): boolean {
  const [blinking, setBlinking] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!(activeIdx in RABBIT_BLINK_IMAGES)) {
      setBlinking(false);
      return;
    }

    let cancelled = false;

    const schedule = () => {
      if (cancelled) return;
      const delay = 4000 + Math.random() * 4000;
      timerRef.current = setTimeout(() => {
        if (cancelled) return;
        setBlinking(true);
        timerRef.current = setTimeout(() => {
          if (cancelled) return;
          setBlinking(false);
          schedule();
        }, 150);
      }, delay);
    };

    schedule();
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeIdx]);

  return blinking;
}

/** damaged モード時に不定期で震えを発火するタイマー */
export function useIntermittentShake(mode: string): boolean {
  const [shaking, setShaking] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (mode !== "damaged") {
      setShaking(false);
      return;
    }

    let cancelled = false;

    const schedule = () => {
      if (cancelled) return;
      const delay = 2500 + Math.random() * 3000;
      timerRef.current = setTimeout(() => {
        if (cancelled) return;
        setShaking(true);
        timerRef.current = setTimeout(() => {
          if (cancelled) return;
          setShaking(false);
          schedule();
        }, 600);
      }, delay);
    };

    schedule();
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [mode]);

  return shaking;
}

/** 瞬き用のバリアント画像を初回マウント時にプリロード */
export function usePreloadBlinkImages() {
  useEffect(() => {
    Object.values(RABBIT_BLINK_IMAGES).forEach((src) => {
      if (!src) return;
      const img = new Image();
      img.src = src;
    });
  }, []);
}

/* ═══════════════════════════════════════════════════════════════════════
 *  アニメーション生成
 * ═══════════════════════════════════════════════════════════════════════ */

export function buildMotionProps(
  state: PetVisualState,
  isShaking: boolean,
) {
  const filterStr = `saturate(${state.filterSaturate}) brightness(${state.filterBrightness})`;

  switch (state.mode) {
    case "damaged":
      if (isShaking) {
        return {
          animate: {
            filter: filterStr,
            x: [0, -3, 3, -2, 2, -1, 0],
            scale: 0.97,
          },
          transition: {
            x: { duration: 0.5, ease: "easeInOut" as const },
            scale: { duration: 0.3 },
            filter: { duration: 0.4 },
          },
        };
      }
      return {
        animate: {
          filter: filterStr,
          x: 0,
          scale: 0.97,
        },
        transition: {
          x: { duration: 0.3, ease: "easeOut" as const },
          scale: { duration: 0.5 },
          filter: { duration: 0.4 },
        },
      };

    case "sparkle":
      return {
        animate: {
          filter: filterStr,
          scale: [1, 1.05, 1],
          y: [0, -5, 0],
          rotate: [0, 1.5, -1.5, 0],
        },
        transition: {
          scale: { repeat: Infinity, duration: 3, ease: "easeInOut" as const },
          y: { repeat: Infinity, duration: 3.5, ease: "easeInOut" as const },
          rotate: { repeat: Infinity, duration: 5, ease: "easeInOut" as const },
          filter: { duration: 0.4 },
        },
      };

    default:
      return {
        animate: {
          filter: filterStr,
          scale: [1, 1.05, 1],
          y: [0, -2, 0],
        },
        transition: {
          scale: { repeat: Infinity, duration: 3.5, ease: "easeInOut" as const },
          y: { repeat: Infinity, duration: 3.5, ease: "easeInOut" as const },
          filter: { duration: 0.4 },
        },
      };
  }
}
