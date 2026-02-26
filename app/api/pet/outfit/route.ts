import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseJsonBody, withSession, errorResponse } from "@/lib/api-utils";
import { petOutfitPostSchema } from "@/lib/validations/api-schemas";
import { PET_OUTFITS } from "@/lib/pet-shop";

/** POST: 着せ替え（所持している衣装を装着 / なしにする） */
export async function POST(req: Request) {
  return withSession(async (session) => {
    const parsed = await parseJsonBody(req, petOutfitPostSchema);
    if (!parsed.ok) return parsed.error;
    const outfitId = parsed.data.outfitId ?? null;

    if (!outfitId || outfitId === "outfit_none" || outfitId === "") {
      await prisma.userPet.upsert({
        where: { userId: session.userId },
        create: { userId: session.userId, currentOutfitId: null },
        update: { currentOutfitId: null },
      });
      return NextResponse.json({ ok: true, current_outfit_id: null });
    }

    const outfit = PET_OUTFITS.find((o) => o.id === outfitId);
    if (!outfit) {
      return errorResponse("Bad Request: invalid outfitId", 400);
    }

    const inv = await prisma.userPetInventory.findUnique({
      where: {
        userId_itemId: { userId: session.userId, itemId: outfitId },
      },
    });
    if (!inv || inv.quantity < 1) {
      return errorResponse("この衣装を所持していません。ショップで購入してください。", 400);
    }

    await prisma.userPet.upsert({
      where: { userId: session.userId },
      create: { userId: session.userId, currentOutfitId: outfitId },
      update: { currentOutfitId: outfitId },
    });

    return NextResponse.json({ ok: true, current_outfit_id: outfitId });
  });
}
