import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseJsonBody, withSession, errorResponse } from "@/lib/api-utils";
import { petRoomPutSchema } from "@/lib/validations/api-schemas";
import { PET_ROOMS, PET_FURNITURE } from "@/lib/pet-shop";

/** PUT: 部屋・家具配置を更新 */
export async function PUT(req: Request) {
  return withSession(async (session) => {
    const parsed = await parseJsonBody(req, petRoomPutSchema);
    if (!parsed.ok) return parsed.error;
    const { current_room_id, placed_furniture } = parsed.data;

    const pet = await prisma.userPet.findUnique({
      where: { userId: session.userId },
    });
    if (!pet) {
      return errorResponse("ペットがいません", 400);
    }

    const updates: {
      currentRoomId?: string | null;
      placedFurniture?: Array<{ itemId: string; position: string }>;
    } = {};

    if (current_room_id !== undefined) {
      if (current_room_id === null || current_room_id === "") {
        updates.currentRoomId = null;
      } else if (PET_ROOMS.some((r) => r.id === current_room_id)) {
        updates.currentRoomId = current_room_id;
      }
    }

    if (placed_furniture !== undefined) {
      const candidates = placed_furniture.filter(
        (p) => PET_FURNITURE.some((f) => f.id === p.itemId)
      );
      const inv = await prisma.userPetInventory.findMany({
        where: { userId: session.userId },
      });
      const invMap = Object.fromEntries(inv.map((i) => [i.itemId, i.quantity]));
      const used: Record<string, number> = {};
      const valid: Array<{ itemId: string; position: string }> = [];
      for (const p of candidates.slice(0, 8)) {
        const usedCount = (used[p.itemId] ?? 0) + 1;
        if (usedCount <= (invMap[p.itemId] ?? 0)) {
          used[p.itemId] = usedCount;
          valid.push({ itemId: p.itemId, position: p.position });
        }
      }
      updates.placedFurniture = valid;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({
        ok: true,
        current_room_id: pet.currentRoomId,
        placed_furniture: pet.placedFurniture,
      });
    }

    const updated = await prisma.userPet.update({
      where: { userId: session.userId },
      data: {
        ...(updates.currentRoomId !== undefined && { currentRoomId: updates.currentRoomId }),
        ...(updates.placedFurniture !== undefined && { placedFurniture: updates.placedFurniture as object }),
      },
    });

    return NextResponse.json({
      ok: true,
      current_room_id: updated.currentRoomId,
      placed_furniture: updated.placedFurniture,
    });
  });
}
