import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseJsonBody, withSession, errorResponse } from "@/lib/api-utils";
import { petBuyPostSchema } from "@/lib/validations/api-schemas";
import { PET_FOODS, PET_OUTFITS, PET_ROOMS, PET_FURNITURE } from "@/lib/pet-shop";

/** POST: ポイントで餌 / 着せ替え / 部屋 / 家具を購入 */
export async function POST(req: Request) {
  return withSession(async (session) => {
    const parsed = await parseJsonBody(req, petBuyPostSchema);
    if (!parsed.ok) return parsed.error;
    const { itemId, quantity } = parsed.data;

    const food = PET_FOODS.find((f) => f.id === itemId);
    const outfit = PET_OUTFITS.find(
      (o) => o.id === itemId && o.id !== "outfit_none"
    );
    const room = PET_ROOMS.find((r) => r.id === itemId && r.cost > 0);
    const furniture = PET_FURNITURE.find((f) => f.id === itemId);

    if (!food && !outfit && !room && !furniture) {
      return errorResponse("Bad Request: invalid itemId", 400);
    }

    const cost = food
      ? food.cost * quantity
      : outfit
        ? outfit.cost
        : room
          ? room.cost
          : furniture
            ? furniture.cost * quantity
            : 0;
    if (cost <= 0 && (room || furniture)) {
      return errorResponse("Bad Request: cannot buy this item", 400);
    }

    const addQty = outfit || room ? 1 : quantity;

    const result = await prisma.$transaction(async (tx) => {
      const gameStats = await tx.userGameStats.findUnique({
        where: { userId: session.userId },
      });
      const points = gameStats?.totalPoints ?? 0;
      if (points < cost) {
        return { error: "ポイントが足りません。" } as const;
      }

      const newPoints = points - cost;

      await tx.userGameStats.upsert({
        where: { userId: session.userId },
        create: { userId: session.userId, totalPoints: newPoints },
        update: { totalPoints: newPoints },
      });
      await tx.userPetInventory.upsert({
        where: { userId_itemId: { userId: session.userId, itemId } },
        create: { userId: session.userId, itemId, quantity: addQty },
        update: { quantity: { increment: addQty } },
      });

      return { newPoints } as const;
    });

    if ('error' in result) {
      return errorResponse(result.error!, 400);
    }

    return NextResponse.json({
      ok: true,
      points: result.newPoints,
      item_id: itemId,
      quantity: addQty,
    });
  });
}
