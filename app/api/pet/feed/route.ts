import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseJsonBody, withSession, errorResponse } from "@/lib/api-utils";
import { petFeedPostSchema } from "@/lib/validations/api-schemas";
import { PET_FOODS, MAX_HAPPINESS, EXP_PER_FEED, getLevelFromExp } from "@/lib/pet-shop";

/** POST: 餌をあげる（所持アイテムを1消費して幸福度アップ） */
export async function POST(req: Request) {
  return withSession(async (session) => {
    const parsed = await parseJsonBody(req, petFeedPostSchema);
    if (!parsed.ok) return parsed.error;
    const { itemId } = parsed.data;

    const food = PET_FOODS.find((f) => f.id === itemId);
    if (!food) {
      return errorResponse("Bad Request: invalid food itemId", 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      const inv = await tx.userPetInventory.findUnique({
        where: {
          userId_itemId: { userId: session.userId, itemId },
        },
      });
      const owned = inv?.quantity ?? 0;
      if (owned < 1) {
        return { error: "餌を所持していません。ショップで購入してください。" } as const;
      }

      const pet = await tx.userPet.findUnique({
        where: { userId: session.userId },
      });
      if (!pet) {
        return { error: "ペットがいません。まずペットを作成してください。" } as const;
      }

      const newHappiness = Math.min(MAX_HAPPINESS, pet.happiness + food.happinessGain);
      const newExp = pet.expPoints + EXP_PER_FEED;
      const newFeedCount = pet.feedCount + 1;

      await tx.userPetInventory.update({
        where: { userId_itemId: { userId: session.userId, itemId } },
        data: { quantity: owned - 1 },
      });
      await tx.userPet.update({
        where: { userId: session.userId },
        data: {
          happiness: newHappiness,
          lastFedAt: new Date(),
          expPoints: newExp,
          feedCount: newFeedCount,
        },
      });

      return { newHappiness, newExp, newFeedCount, foodName: food.name } as const;
    });

    if ('error' in result) {
      return errorResponse(result.error!, 400);
    }

    return NextResponse.json({
      ok: true,
      happiness: result.newHappiness,
      used: result.foodName,
      level: getLevelFromExp(result.newExp),
      exp_points: result.newExp,
      feed_count: result.newFeedCount,
    });
  });
}
