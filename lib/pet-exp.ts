import prisma from "@/lib/prisma";
import { getSpeciesStage } from "@/lib/pet-shop";

/** 健康記録POSTボディのうち、EXP計算に使うフィールド */
export interface HealthLogExpInput {
  meal_description?: string | null;
  sleep_quality?: string | null;
  pain_level?: number | null;
  stress_level?: number | null;
  general_mood?: number | null;
}

/** 健康記録から獲得EXPを算出 */
export function calcHealthLogExp(body: HealthLogExpInput, streak: number): number {
  let exp = 20; // 記録した（ベース）

  if (body.meal_description != null && String(body.meal_description).trim().length > 0) {
    exp += 10;
  }
  const sleep = body.sleep_quality != null ? String(body.sleep_quality) : "";
  if (sleep.length > 0 && !sleep.includes("悪")) {
    exp += 5;
  }
  const pain = body.pain_level != null ? Number(body.pain_level) : null;
  if (pain != null && pain <= 3) {
    exp += 5;
  }
  const stress = body.stress_level != null ? Number(body.stress_level) : null;
  if (stress != null && stress <= 3) {
    exp += 5;
  }
  const mood = body.general_mood != null ? Number(body.general_mood) : null;
  if (mood != null && mood >= 4) {
    exp += 5;
  }
  if (streak >= 3) {
    exp += 15;
  }

  return exp;
}

export interface GrantPetExpResult {
  newExp: number;
  leveledUp: boolean;
  newStage?: string;
}

/** ペットにEXPを付与。ペット未所持は何もしない */
export async function grantPetExp(
  userId: string,
  expGained: number
): Promise<GrantPetExpResult> {
  const pet = await prisma.userPet.findUnique({
    where: { userId },
  });
  if (!pet || expGained <= 0) {
    return { newExp: pet?.expPoints ?? 0, leveledUp: false };
  }

  const currentExp = pet.expPoints ?? 0;
  const newExp = currentExp + expGained;
  const species = pet.petSpecies ?? "cat";
  const oldStage = getSpeciesStage(species, currentExp);

  await prisma.userPet.update({
    where: { userId },
    data: { expPoints: newExp },
  });

  const newStage = getSpeciesStage(species, newExp);
  const leveledUp = newStage != null && newStage !== oldStage;

  return {
    newExp,
    leveledUp,
    newStage: leveledUp ? (newStage ?? undefined) : undefined,
  };
}
