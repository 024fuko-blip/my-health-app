import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { PET_FOODS, MAX_HAPPINESS, EXP_PER_FEED, getLevelFromExp } from "@/lib/pet-shop";

/** POST: 餌をあげる（所持アイテムを1消費して幸福度アップ） */
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();
    const itemId = body.itemId as string | undefined;
    if (!itemId) {
      return new NextResponse("Bad Request: itemId required", { status: 400 });
    }

    const food = PET_FOODS.find((f) => f.id === itemId);
    if (!food) {
      return new NextResponse("Bad Request: invalid food itemId", {
        status: 400,
      });
    }

    const inv = await prisma.userPetInventory.findUnique({
      where: {
        userId_itemId: { userId: session.userId, itemId },
      },
    });
    const owned = inv?.quantity ?? 0;
    if (owned < 1) {
      return NextResponse.json(
        { error: "餌を所持していません。ショップで購入してください。" },
        { status: 400 }
      );
    }

    const pet = await prisma.userPet.findUnique({
      where: { userId: session.userId },
    });
    if (!pet) {
      return NextResponse.json(
        { error: "ペットがいません。まずペットを作成してください。" },
        { status: 400 }
      );
    }

    const newHappiness = Math.min(
      MAX_HAPPINESS,
      pet.happiness + food.happinessGain
    );
    const newExp = pet.expPoints + EXP_PER_FEED;
    const newLevel = getLevelFromExp(newExp);
    const newFeedCount = pet.feedCount + 1;

    await prisma.$transaction([
      prisma.userPetInventory.update({
        where: { userId_itemId: { userId: session.userId, itemId } },
        data: { quantity: owned - 1 },
      }),
      prisma.userPet.update({
        where: { userId: session.userId },
        data: {
          happiness: newHappiness,
          lastFedAt: new Date(),
          expPoints: newExp,
          feedCount: newFeedCount,
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      happiness: newHappiness,
      used: food.name,
      level: newLevel,
      exp_points: newExp,
      feed_count: newFeedCount,
    });
  } catch (error) {
    console.error("pet feed error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
