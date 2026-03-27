"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getVisualState,
  getActiveImageIndex,
  DEFAULT_PET_IMAGES,
  RABBIT_BLINK_IMAGES,
} from "@/lib/pet-health";
import {
  useBlinkEffect,
  useIntermittentShake,
  usePreloadBlinkImages,
  buildMotionProps,
} from "../hooks/usePetVisualEffects";

interface PetVisualProps {
  healthLevel: number;
  images?: [string, string, string];
  blinkImages?: Partial<Record<number, string>>;
  alt?: string;
  size?: number;
  className?: string;
}

/* ─── キラキラパーティクル ─── */

const SPARKLE_POSITIONS = [
  { top: "5%", left: "10%" },
  { top: "15%", right: "8%" },
  { bottom: "20%", left: "15%" },
  { bottom: "10%", right: "12%" },
  { top: "40%", left: "2%" },
] as const;

function SparkleParticles() {
  return (
    <>
      {SPARKLE_POSITIONS.map((pos, i) => (
        <motion.span
          key={i}
          className="absolute text-yellow-300 pointer-events-none select-none"
          style={{ ...pos, fontSize: 10 + (i % 3) * 4 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0.5, 1.2, 0.5],
            y: [0, -8, 0],
          }}
          transition={{
            repeat: Infinity,
            duration: 1.6 + i * 0.3,
            delay: i * 0.4,
            ease: "easeInOut",
          }}
        >
          ✦
        </motion.span>
      ))}
    </>
  );
}

/* ─── メインコンポーネント ─── */

export function PetVisual({
  healthLevel,
  images = DEFAULT_PET_IMAGES,
  blinkImages = RABBIT_BLINK_IMAGES,
  alt = "ペット",
  size = 180,
  className = "",
}: PetVisualProps) {
  const visual = useMemo(() => getVisualState(healthLevel), [healthLevel]);
  const activeIdx = useMemo(
    () => getActiveImageIndex(healthLevel),
    [healthLevel],
  );

  const isBlinking = useBlinkEffect(activeIdx);
  const isShaking = useIntermittentShake(visual.mode);

  usePreloadBlinkImages();

  const motionProps = useMemo(
    () => buildMotionProps(visual, isShaking),
    [visual, isShaking],
  );

  return (
    <div className={`inline-flex flex-col items-center gap-2 ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <AnimatePresence mode="sync">
          {images.map((baseSrc, i) => {
            const isActive = i === activeIdx;
            const displaySrc =
              isActive && isBlinking && blinkImages[i]
                ? blinkImages[i]!
                : baseSrc;

            return (
              <motion.img
                key={i}
                src={displaySrc}
                alt={isActive ? alt : ""}
                draggable={false}
                className="absolute inset-0 w-full h-full object-contain rounded-2xl"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: isActive ? 1 : 0,
                  ...(isActive ? motionProps.animate : {}),
                }}
                transition={{
                  opacity: { duration: 0.8, ease: "easeInOut" },
                  ...(isActive ? motionProps.transition : {}),
                }}
              />
            );
          })}
        </AnimatePresence>

        {visual.mode === "sparkle" && <SparkleParticles />}
      </div>

      <div
        className="flex items-center gap-2 w-full"
        style={{ maxWidth: size + 20 }}
      >
        <span className="text-xs text-slate-500 font-medium">HP</span>
        <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${visual.barColor}`}
            animate={{ width: `${healthLevel * 10}%` }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
        </div>
        <span className="text-xs font-bold text-slate-700 min-w-[2ch] text-right">
          {healthLevel}
        </span>
      </div>

      <motion.span
        className="text-xs text-slate-500"
        key={visual.label}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {visual.label}
      </motion.span>
    </div>
  );
}
