import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { PET_OUTFITS } from "@/lib/pet-shop";

/** POST: 着せ替え（所持している衣装を装着 / なしにする） */
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();
    const outfitId = body.outfitId as string | undefined;

    if (outfitId === "outfit_none" || outfitId === null || outfitId === "") {
      await prisma.userPet.upsert({
        where: { userId: session.userId },
        create: {
          userId: session.userId,
          currentOutfitId: null,
        },
        update: { currentOutfitId: null },
      });
      return NextResponse.json({
        ok: true,
        current_outfit_id: null,
      });
    }

    const outfit = PET_OUTFITS.find((o) => o.id === outfitId);
    if (!outfit) {
      return new NextResponse("Bad Request: invalid outfitId", { status: 400 });
    }

    const inv = await prisma.userPetInventory.findUnique({
      where: {
        userId_itemId: { userId: session.userId, itemId: outfitId },
      },
    });
    if (!inv || inv.quantity < 1) {
      return NextResponse.json(
        { error: "この衣装を所持していません。ショップで購入してください。" },
        { status: 400 }
      );
    }

    await prisma.userPet.upsert({
      where: { userId: session.userId },
      create: {
        userId: session.userId,
        currentOutfitId: outfitId,
      },
      update: { currentOutfitId: outfitId },
    });

    return NextResponse.json({
      ok: true,
      current_outfit_id: outfitId,
    });
  } catch (error) {
    console.error("pet outfit error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
