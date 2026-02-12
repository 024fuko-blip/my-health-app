import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { PET_FOODS, PET_OUTFITS } from "@/lib/pet-shop";

/** POST: ポイントで餌 or 着せ替えを購入 */
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();
    const itemId = body.itemId as string | undefined;
    const quantity = Math.max(1, Math.min(10, Number(body.quantity) || 1));

    if (!itemId) {
      return new NextResponse("Bad Request: itemId required", { status: 400 });
    }

    const food = PET_FOODS.find((f) => f.id === itemId);
    const outfit = PET_OUTFITS.find(
      (o) => o.id === itemId && o.id !== "outfit_none"
    );

    if (!food && !outfit) {
      return new NextResponse("Bad Request: invalid itemId", { status: 400 });
    }

    const cost = food ? food.cost * quantity : (outfit?.cost ?? 0);
    if (cost <= 0) {
      return new NextResponse("Bad Request: cannot buy this item", {
        status: 400,
      });
    }

    const gameStats = await prisma.userGameStats.findUnique({
      where: { userId: session.userId },
    });
    const points = gameStats?.totalPoints ?? 0;
    if (points < cost) {
      return NextResponse.json(
        { error: "ポイントが足りません。" },
        { status: 400 }
      );
    }

    const newPoints = points - cost;
    const addQty = outfit ? 1 : quantity;

    await prisma.$transaction([
      prisma.userGameStats.upsert({
        where: { userId: session.userId },
        create: { userId: session.userId, totalPoints: newPoints },
        update: { totalPoints: newPoints },
      }),
      prisma.userPetInventory.upsert({
        where: { userId_itemId: { userId: session.userId, itemId } },
        create: { userId: session.userId, itemId, quantity: addQty },
        update: { quantity: { increment: addQty } },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      points: newPoints,
      item_id: itemId,
      quantity: addQty,
    });
  } catch (error) {
    console.error("pet buy error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
