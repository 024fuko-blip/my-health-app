import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { parseJsonBody } from "@/lib/api-utils";
import { PET_OUTFITS } from "@/lib/pet-shop";

/** POST: 着せ替え（所持している衣装を装着 / なしにする） */
export async function POST(req: Request) {
  try {
    const session = await requireSession();
    if (session instanceof NextResponse) return session;

    const parsed = await parseJsonBody<{ outfitId?: string | null }>(req);
    if (!parsed.ok) return parsed.error;
    const outfitId = typeof parsed.data.outfitId === 'string' ? parsed.data.outfitId : parsed.data.outfitId === null ? null : undefined;

    if (!outfitId || outfitId === "outfit_none" || outfitId === "") {
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
        userId_itemId: { userId: session.userId, itemId: outfitId as string },
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
