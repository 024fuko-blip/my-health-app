"use client";

import type { PetTabData } from "./pet-tab-types";

interface PetOutfitTabProps {
  data: PetTabData;
  onEquip: (outfitId: string | null) => void;
  onBuy: (itemId: string, cost: number) => void;
}

export function PetOutfitTab({ data, onEquip, onBuy }: PetOutfitTabProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-bold text-slate-800">着せ替え</h3>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onEquip("outfit_none")}
          className={`px-3 py-2 rounded-xl border-2 ${
            !data.pet?.current_outfit_id
              ? "border-amber-500 bg-amber-50"
              : "border-gray-200"
          }`}
        >
          なし
        </button>
        {data.outfits
          .filter((o) => o.owned)
          .map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => onEquip(o.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 ${
                o.equipped ? "border-amber-500 bg-amber-50" : "border-gray-200"
              }`}
            >
              {o.emoji && <span>{o.emoji}</span>}
              <span className="text-slate-900 font-medium">{o.name}</span>
            </button>
          ))}
      </div>
      <h3 className="font-bold text-slate-800 pt-2">ショップ（着せ替え）</h3>
      <div className="grid gap-2">
        {data.outfits.map((o) => (
          <div
            key={o.id}
            className="flex items-center justify-between p-3 bg-white border rounded-xl"
          >
            <span className="text-2xl">{o.emoji ?? "—"}</span>
            <div className="flex-1 mx-2 text-left">
              <p className="font-bold text-slate-900">{o.name}</p>
              <p className="text-sm text-slate-800">{o.cost} pt</p>
            </div>
            <button
              type="button"
              onClick={() => onBuy(o.id, o.cost)}
              disabled={data.points < o.cost || o.owned}
              className="px-3 py-1 bg-violet-500 text-white rounded-lg text-sm font-bold disabled:opacity-50"
            >
              {o.owned ? "所持済み" : "購入"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
