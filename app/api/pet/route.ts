import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { parseJsonBody, withSession } from '@/lib/api-utils';
import { petPostSchema } from '@/lib/validations/api-schemas';
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
} from '@/lib/pet-shop';
import { fetchWeather } from '@/lib/weather';
import { getCoordsFromPrefecture } from '@/lib/prefectures';

/** 花粉シーズンか（2〜5月） */
function isPollenSeason(): boolean {
  const month = new Date().getMonth() + 1;
  return month >= 2 && month <= 5;
}

/** ショップカタログの静的部分（正常時・エラー時で共有） */
function buildShopCatalog(inventory: Record<string, number>, equippedOutfitId: string | null, equippedRoomId: string | null) {
  return {
    foods: PET_FOODS.map((f) => ({
      id: f.id, name: f.name, cost: f.cost, emoji: f.emoji,
      happiness_gain: f.happinessGain, owned: inventory[f.id] ?? 0,
    })),
    outfits: PET_OUTFITS.filter((o) => o.id !== 'outfit_none').map((o) => ({
      id: o.id, name: o.name, cost: o.cost, emoji: o.emoji,
      owned: (inventory[o.id] ?? 0) > 0, equipped: equippedOutfitId === o.id,
    })),
    rooms: PET_ROOMS.map((r) => ({
      id: r.id, name: r.name, cost: r.cost, emoji: r.emoji,
      owned: r.cost === 0 || (inventory[r.id] ?? 0) > 0,
      equipped: (equippedRoomId ?? 'room_default') === r.id,
    })),
    furniture: PET_FURNITURE.map((f) => ({
      id: f.id, name: f.name, cost: f.cost, emoji: f.emoji, owned: inventory[f.id] ?? 0,
    })),
  };
}

const EMPTY_CONTEXT = { sleepy: false, wearing_mask: false, worried: false, low_mood: false, weather: null };

/** GET: ペット状態・所持アイテム・ポイント・ショップ一覧＋心身相関フラグ */
export async function GET() {
  return withSession(async (session) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [pet, inventoryRows, gameStats, todayLog, userSettings] =
        await Promise.all([
          prisma.userPet.findUnique({ where: { userId: session.userId } }),
          prisma.userPetInventory.findMany({ where: { userId: session.userId } }),
          prisma.userGameStats.findUnique({ where: { userId: session.userId } }),
          prisma.healthLog.findUnique({
            where: { userId_date: { userId: session.userId, date: today } },
          }),
          prisma.userSettings.findUnique({ where: { userId: session.userId } }),
        ]);

      // 天気・花粉
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

      const contextFlags = {
        sleepy: (todayLog?.sleepQuality ?? '').includes('悪'),
        wearing_mask: pollenSeason,
        worried: (todayLog?.stressLevel ?? 0) >= 7,
        low_mood: todayLog?.generalMood != null && todayLog.generalMood <= 2,
        weather: weather ? { temp: weather.temp, desc: weather.desc } : null,
      };

      const points = gameStats?.totalPoints ?? 0;
      const inventory = Object.fromEntries(inventoryRows.map((r) => [r.itemId, r.quantity]));

      const speciesInfo = PET_SPECIES.find((s) => s.id === (pet?.petSpecies ?? 'cat')) ?? PET_SPECIES[0];
      const currentOutfit = pet?.currentOutfitId
        ? PET_OUTFITS.find((o) => o.id === pet.currentOutfitId)
        : null;

      const happiness = pet ? Math.min(MAX_HAPPINESS, pet.happiness ?? 50) : 0;
      const expPoints = pet ? (pet as { expPoints?: number }).expPoints ?? 0 : 0;
      const mood = getMoodFromHappiness(happiness);
      const expToNext = getExpToNextLevel(expPoints);
      const level = getLevelFromExp(expPoints);
      const stage = getEvolutionStage(level);

      const currentRoomId = (pet as { currentRoomId?: string | null } | null)?.currentRoomId ?? null;
      const catalog = buildShopCatalog(inventory, pet?.currentOutfitId ?? null, currentRoomId);

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
        ...catalog,
        current_room_id: currentRoomId,
        placed_furniture: ((pet as { placedFurniture?: unknown } | null)?.placedFurniture ?? []) as Array<{ itemId: string; position: string }>,
      });
    } catch (error) {
      console.error('pet GET error:', error);
      const emptyCatalog = buildShopCatalog({}, null, null);
      return NextResponse.json({
        pet: null,
        context: EMPTY_CONTEXT,
        points: 0,
        inventory: {},
        ...emptyCatalog,
        current_room_id: null,
        placed_furniture: [],
      });
    }
  });
}

/** POST: ペット作成 or 名前・種類の更新 */
export async function POST(req: Request) {
  return withSession(async (session) => {
    const parsed = await parseJsonBody(req, petPostSchema);
    if (!parsed.ok) return parsed.error;
    const { pet_name, pet_species } = parsed.data;

    const data: { petName?: string; petSpecies?: string } = {};
    if (pet_name != null && String(pet_name).trim())
      data.petName = String(pet_name).trim();
    if (pet_species != null && PET_SPECIES.some((s) => s.id === pet_species))
      data.petSpecies = pet_species;

    const pet = await prisma.userPet.upsert({
      where: { userId: session.userId },
      create: {
        userId: session.userId,
        petName: data.petName ?? 'ぽっち',
        petSpecies: data.petSpecies ?? 'cat',
      },
      update: Object.keys(data).length ? data : {},
    });

    try {
      await prisma.$executeRaw`
        UPDATE user_pets SET adopted_at = COALESCE(adopted_at, NOW())
        WHERE user_id = ${session.userId} AND adopted_at IS NULL
      `;
    } catch { /* adopted_at がカラム未追加の場合は無視 */ }

    return NextResponse.json({
      pet_name: pet.petName,
      pet_species: pet.petSpecies,
      happiness: pet.happiness,
      current_outfit_id: pet.currentOutfitId,
    });
  });
}
