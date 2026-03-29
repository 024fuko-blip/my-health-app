/** ビジュアルステート決定 & 画像定数 */

import type { PetVisualState } from "./pet-health-types";

export function getVisualState(healthLevel: number): PetVisualState {
  if (healthLevel <= 3) {
    const t = (4 - healthLevel) / 3;
    return {
      mode: "damaged",
      filterSaturate: 0.4 + (1 - t) * 0.3,
      filterBrightness: 0.8 + (1 - t) * 0.1,
      barColor: "bg-red-500",
      label: healthLevel === 1 ? "ぐったり…" : healthLevel === 2 ? "つらそう…" : "ちょっと不調",
    };
  }

  if (healthLevel <= 7) {
    return {
      mode: "normal",
      filterSaturate: 1,
      filterBrightness: 1,
      barColor: healthLevel <= 5 ? "bg-yellow-500" : "bg-green-500",
      label: healthLevel <= 5 ? "まあまあ" : "元気！",
    };
  }

  const glow = (healthLevel - 7) / 3;
  return {
    mode: "sparkle",
    filterSaturate: 1.1 + glow * 0.2,
    filterBrightness: 1.05 + glow * 0.1,
    barColor: "bg-amber-400",
    label: healthLevel === 10 ? "絶好調✨" : healthLevel === 9 ? "キラキラ✨" : "好調！",
  };
}

/**
 * healthLevel → 表示画像インデックス (0/1/2)
 *   0 = low(1-3), 1 = normal(4-7), 2 = high(8-10)
 */
export function getActiveImageIndex(healthLevel: number): number {
  if (healthLevel <= 3) return 0;
  if (healthLevel <= 7) return 1;
  return 2;
}

/* ─── 画像定数 ─── */

import type { PetSpeciesId } from "./pet-shop";

type PetImageSet = [string, string, string];
type BlinkImageMap = Partial<Record<number, string>>;

export const PLACEHOLDER_PET_IMAGE = "https://via.placeholder.com/400";

export const RABBIT_IMAGES: PetImageSet = [
  "/pets/rabbit/baby.png",
  "/pets/rabbit/normal.png",
  "/pets/rabbit/super.png",
];

export const RABBIT_BLINK_IMAGES: BlinkImageMap = {
  1: "/pets/rabbit/normal_active.png",
  2: "/pets/rabbit/super_alt.png",
};

export const DOG_IMAGES: PetImageSet = [
  "/pets/dog/baby.png",
  "/pets/dog/normal.png",
  "/pets/dog/super.png",
];

export const DOG_BLINK_IMAGES: BlinkImageMap = {
  1: "/pets/dog/normal_active.png",
  2: "/pets/dog/super_alt.png",
};

export const DEFAULT_PET_IMAGES = RABBIT_IMAGES;

const SPECIES_IMAGES: Partial<Record<PetSpeciesId, PetImageSet>> = {
  rabbit: RABBIT_IMAGES,
  dog: DOG_IMAGES,
};

const SPECIES_BLINK_IMAGES: Partial<Record<PetSpeciesId, BlinkImageMap>> = {
  rabbit: RABBIT_BLINK_IMAGES,
  dog: DOG_BLINK_IMAGES,
};

export function getImagesForSpecies(species: string): PetImageSet {
  return SPECIES_IMAGES[species as PetSpeciesId] ?? RABBIT_IMAGES;
}

export function getBlinkImagesForSpecies(species: string): BlinkImageMap {
  return SPECIES_BLINK_IMAGES[species as PetSpeciesId] ?? RABBIT_BLINK_IMAGES;
}
