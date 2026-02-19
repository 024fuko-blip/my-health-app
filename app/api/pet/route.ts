import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { parseJsonBody } from "@/lib/api-utils";
import {
  PET_FOODS,
  PET_OUTFITS,
  PET_SPECIES,
  MAX_HAPPINESS,
  getMoodFromHappiness,
  getLevelFromExp,
  getExpToNextLevel,
} from "@/lib/pet-shop";

/** GET: ペット状態・所持アイテム・ポイント・ショップ一覧 */
export async function GET() {
  try {
    const session = await requireSession();
    if (session instanceof NextResponse) return session;

    const [pet, inventoryRows, gameStats] = await Promise.all([
      prisma.userPet.findUnique({ where: { userId: session.userId } }),
      prisma.userPetInventory.findMany({
        where: { userId: session.userId },
      }),
      prisma.userGameStats.findUnique({
        where: { userId: session.userId },
      }),
    ]);

    const points = gameStats?.totalPoints ?? 0;
    const inventory = Object.fromEntries(
      inventoryRows.map((r) => [r.itemId, r.quantity])
    );

    const speciesInfo =
      PET_SPECIES.find((s) => s.id === (pet?.petSpecies ?? "cat")) ??
      PET_SPECIES[0];
    const currentOutfit = pet?.currentOutfitId
      ? PET_OUTFITS.find((o) => o.id === pet.currentOutfitId)
      : null;

    const happiness = pet ? Math.min(MAX_HAPPINESS, pet.happiness ?? 50) : 0;
    const expPoints = pet ? (pet as { expPoints?: number }).expPoints ?? 0 : 0;
    const mood = getMoodFromHappiness(happiness);
    const expToNext = getExpToNextLevel(expPoints);
    const level = getLevelFromExp(expPoints);

    return NextResponse.json({
      pet: pet
        ? {
            pet_name: pet.petName,
            pet_species: pet.petSpecies,
            species_emoji: speciesInfo.emoji,
            happiness,
            last_fed_at: pet.lastFedAt?.toISOString() ?? null,
            current_outfit_id: pet.currentOutfitId,
            current_outfit_emoji: currentOutfit?.emoji ?? null,
            level,
            exp_points: pet.expPoints,
            exp_to_next: expToNext,
            adopted_at: (pet as { adoptedAt?: Date }).adoptedAt?.toISOString() ?? null,
            feed_count: (pet as { feedCount?: number }).feedCount ?? 0,
            mood_face: mood.face,
            mood_label: mood.label,
            mood_comment: mood.comment,
          }
        : null,
      points,
      inventory,
      foods: PET_FOODS.map((f) => ({
        id: f.id,
        name: f.name,
        cost: f.cost,
        emoji: f.emoji,
        happiness_gain: f.happinessGain,
        owned: inventory[f.id] ?? 0,
      })),
      outfits: PET_OUTFITS.filter((o) => o.id !== "outfit_none").map(
        (o) => ({
          id: o.id,
          name: o.name,
          cost: o.cost,
          emoji: o.emoji,
          owned: (inventory[o.id] ?? 0) > 0,
          equipped: pet?.currentOutfitId === o.id,
        })
      ),
    });
  } catch (error) {
    console.error("pet GET error:", error);
    return NextResponse.json({
      pet: null,
      points: 0,
      inventory: {} as Record<string, number>,
      foods: PET_FOODS.map((f) => ({
        id: f.id,
        name: f.name,
        cost: f.cost,
        emoji: f.emoji,
        happiness_gain: f.happinessGain,
        owned: 0,
      })),
      outfits: PET_OUTFITS.filter((o) => o.id !== "outfit_none").map((o) => ({
        id: o.id,
        name: o.name,
        cost: o.cost,
        emoji: o.emoji,
        owned: false,
        equipped: false,
      })),
    });
  }
}

/** POST: ペット作成 or 名前・種類の更新 */
export async function POST(req: Request) {
  try {
    const session = await requireSession();
    if (session instanceof NextResponse) return session;

    const parsed = await parseJsonBody<{ pet_name?: string; pet_species?: string }>(req);
    if (!parsed.ok) return parsed.error;
    const { pet_name, pet_species } = parsed.data;

    const data: { petName?: string; petSpecies?: string } = {};
    if (pet_name != null && String(pet_name).trim())
      data.petName = String(pet_name).trim();
    if (
      pet_species != null &&
      PET_SPECIES.some((s) => s.id === pet_species)
    )
      data.petSpecies = pet_species;

    const pet = await prisma.userPet.upsert({
      where: { userId: session.userId },
      create: {
        userId: session.userId,
        petName: data.petName ?? "ぽっち",
        petSpecies: data.petSpecies ?? "cat",
      },
      update: Object.keys(data).length ? data : {},
    });

    try {
      await prisma.$executeRaw`
        UPDATE user_pets SET adopted_at = COALESCE(adopted_at, NOW())
        WHERE user_id = ${session.userId} AND adopted_at IS NULL
      `;
    } catch {
    }

    return NextResponse.json({
      pet_name: pet.petName,
      pet_species: pet.petSpecies,
      happiness: pet.happiness,
      current_outfit_id: pet.currentOutfitId,
    });
  } catch (error) {
    console.error("pet POST error:", error);
    const err = error as Error & { code?: string };
    return NextResponse.json(
      { error: err.message ?? "ペットの作成に失敗しました" },
      { status: 500 }
    );
  }
}
