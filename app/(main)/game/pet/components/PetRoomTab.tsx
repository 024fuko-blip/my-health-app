"use client";

import type { PetTabData } from "./pet-tab-types";

interface PetRoomTabProps {
  data: PetTabData;
  onRoomUpdate: (roomId: string) => void;
  onBuy: (itemId: string, cost: number) => void;
}

export function PetRoomTab({
  data,
  onRoomUpdate,
  onBuy,
}: PetRoomTabProps) {
  const rooms = data.rooms ?? [];
  const furniture = data.furniture ?? [];
  const currentRoomId =
    (data.current_room_id ?? null) || "room_default";

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-gray-800">部屋の背景</h3>
      <div className="flex flex-wrap gap-2">
        {rooms.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => (r.owned ? onRoomUpdate(r.id) : undefined)}
            disabled={!r.owned}
            className={`flex items-center gap-2 px-3 py-2 border-2 ${
              currentRoomId === r.id
                ? "border-amber-500 bg-amber-50"
                : "border-gray-200"
            } disabled:opacity-50`}
          >
            <span className="text-xl">{r.emoji}</span>
            <span>{r.name}</span>
            {!r.owned && r.cost > 0 && (
              <span className="text-xs text-gray-700">{r.cost}pt</span>
            )}
          </button>
        ))}
      </div>
      <h3 className="font-bold text-gray-800 pt-2">家具の配置</h3>
      <p className="text-xs text-gray-700">
        所持している家具を最大8個まで部屋に飾れます。
      </p>
      <div className="grid grid-cols-2 gap-2">
        {furniture.map((f) => (
          <div
            key={f.id}
            className="flex items-center justify-between p-3 bg-white border"
          >
            <span className="text-xl">{f.emoji}</span>
            <div className="flex-1 mx-2 text-left">
              <p className="font-bold text-sm">{f.name}</p>
              <p className="text-xs text-gray-700">所持: {f.owned}</p>
            </div>
            <button
              type="button"
              onClick={() => onBuy(f.id, f.cost)}
              disabled={(data.points ?? 0) < f.cost}
              className="px-2 py-1 bg-amber-500 text-white text-xs font-bold disabled:opacity-50"
            >
              購入
            </button>
          </div>
        ))}
      </div>
      <h3 className="font-bold text-gray-800 pt-2">部屋・家具ショップ</h3>
      <div className="space-y-2">
        {rooms
          .filter((r) => r.cost > 0 && !r.owned)
          .map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between p-3 bg-white border"
            >
              <span className="text-2xl">{r.emoji}</span>
              <div className="flex-1 mx-2 text-left">
                <p className="font-bold">{r.name}</p>
                <p className="text-xs text-gray-700">{r.cost} pt</p>
              </div>
              <button
                type="button"
                onClick={() => onBuy(r.id, r.cost)}
                disabled={(data.points ?? 0) < r.cost}
                className="px-3 py-1 bg-violet-500 text-white text-sm font-bold disabled:opacity-50"
              >
                購入
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}
