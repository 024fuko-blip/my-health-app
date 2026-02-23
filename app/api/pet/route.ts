import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseJsonBody, withSession } from "@/lib/api-utils";
import {
  PET_FOODS,
  PET_OUTFITS,
  PET_ROOMS,
  PET_FURNITURE,
  PET_SPECIES,
  MAX_HAPPINESS,
  getMoodFromHappiness,
  getLevelFromExp,
  getExpToNextLevel,
  getEvolutionStage,
} from "@/lib/pet-shop";
import { fetchWeather } from "@/lib/weather";
import { getCoordsFromPrefecture } from "@/lib/prefectures";

/** 花粉シーズンか（2〜5月） */
function isPollenSeason(): boolean {
  const month = new Date().getMonth() + 1;
  return month >= 2 && month <= 5;
}

/** GET: ペット状態・所持アイテム・ポイント・ショップ一覧＋心身相関フラグ */
export async function GET() {
  return withSession(async (session) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const [pet, inventoryRows, gameStats, todayLog, userSettings] =
        await Promise.all([
          prisma.userPet.findUnique({ where: { userId: session.userId } }),
          prisma.userPetInventory.findMany({
            where: { userId: session.userId },
          }),
          prisma.userGameStats.findUnique({
            where: { userId: session.userId },
          }),
          prisma.healthLog.findUnique({
            where: {
              userId_date: { userId: session.userId, date: today },
            },
          }),
          prisma.userSettings.findUnique({
            where: { userId: session.userId },
          }),
        ]);

      // 天気・花粉（心身相関表示用）
      let weather: { temp: number; desc: string } | null = null;
      const pollenSeason = isPollenSeason();
      const lat = userSettings?.latitude ?? null;
      const lon = userSettings?.longitude ?? null;
      const prefecture = userSettings?.prefecture ?? null;
      if (lat != null && lon != null) {
        weather = await fetchWeather(lat, lon);
      } else if (prefecture) {
        const coords = getCoordsFromPrefecture(prefecture);
        if (coords) weather = await fetchWeather(coords[0], coords[1]);
      }
      if (!weather) {
        weather = await fetchWeather();
      }

      // 心身相関フラグ
      const sleepQuality = todayLog?.sleepQuality ?? "";
      const stressLevel = todayLog?.stressLevel ?? 0;
      const bodyMood = todayLog?.generalMood ?? null;
      const contextFlags = {
        sleepy: sleepQuality.includes("悪"),
        wearing_mask: pollenSeason,
        worried: stressLevel >= 7,
        low_mood: bodyMood != null && bodyMood <= 2,
        weather: weather
          ? { temp: weather.temp, desc: weather.desc }
          : null,
      };

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
    const stage = getEvolutionStage(level);

    return NextResponse.json({
      pet: pet
        ? {
            pet_name: pet.petName,
            pet_species: pet.petSpecies,
            species_emoji: speciesInfo.emoji,
            stage,
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
            ...contextFlags,
          }
        : null,
      context: contextFlags,
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
      rooms: PET_ROOMS.map((r) => ({
        id: r.id,
        name: r.name,
        cost: r.cost,
        emoji: r.emoji,
        owned: r.cost === 0 || (inventory[r.id] ?? 0) > 0,
        equipped:
          ((pet as { currentRoomId?: string | null })?.currentRoomId ?? "room_default") === r.id,
      })),
      furniture: PET_FURNITURE.map((f) => ({
        id: f.id,
        name: f.name,
        cost: f.cost,
        emoji: f.emoji,
        owned: inventory[f.id] ?? 0,
      })),
      current_room_id: (pet as { currentRoomId?: string | null })?.currentRoomId ?? null,
      placed_furniture: ((pet as { placedFurniture?: unknown })?.placedFurniture ?? []) as Array<{ itemId: string; position: string }>,
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
      rooms: PET_ROOMS.map((r) => ({
        id: r.id,
        name: r.name,
        cost: r.cost,
        emoji: r.emoji,
        owned: r.cost === 0,
        equipped: false,
      })),
      furniture: PET_FURNITURE.map((f) => ({
        id: f.id,
        name: f.name,
        cost: f.cost,
        emoji: f.emoji,
        owned: 0,
      })),
      current_room_id: null,
      placed_furniture: [],
    });
    }
  });
}

/** POST: ペット作成 or 名前・種類の更新 */
export async function POST(req: Request) {
  return withSession(async (session) => {
    try {
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
  });
}
