import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseJsonBody, withSession } from "@/lib/api-utils";
import { PET_ROOMS, PET_FURNITURE } from "@/lib/pet-shop";

/** PUT: 部屋・家具配置を更新 */
export async function PUT(req: Request) {
  return withSession(async (session) => {
    try {
      const parsed = await parseJsonBody<{
        current_room_id?: string | null;
        placed_furniture?: Array<{ itemId: string; position: string }>;
      }>(req);
      if (!parsed.ok) return parsed.error;
      const { current_room_id, placed_furniture } = parsed.data;

      const pet = await prisma.userPet.findUnique({
        where: { userId: session.userId },
      });
      if (!pet) {
        return NextResponse.json(
          { error: "ペットがいません" },
          { status: 400 }
        );
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
        const candidates = Array.isArray(placed_furniture)
          ? placed_furniture.filter(
              (p) =>
                typeof p?.itemId === "string" &&
                typeof p?.position === "string" &&
                PET_FURNITURE.some((f) => f.id === p.itemId)
            )
          : [];
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
    } catch (error) {
      console.error("pet room PUT error:", error);
      return NextResponse.json(
        { error: "更新に失敗しました" },
        { status: 500 }
      );
    }
  });
}
