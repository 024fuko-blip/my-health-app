"use client";

import type { PetTabData } from "./pet-tab-types";

interface PetFeedTabProps {
  data: PetTabData;
  onFeed: (itemId: string) => void;
  onBuy: (itemId: string, cost: number, quantity?: number) => void;
}

export function PetFeedTab({ data, onFeed, onBuy }: PetFeedTabProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-bold text-gray-800">所持している餌</h3>
      {data.foods.filter((f) => f.owned > 0).length === 0 ? (
        <p className="text-sm text-gray-700">
          餌を持っていません。下のショップで購入しよう。
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {data.foods
            .filter((f) => f.owned > 0)
            .map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onFeed(f.id)}
                className="flex items-center gap-2 px-4 py-2 bg-amber-100 border-2 border-amber-300 rounded-xl hover:bg-amber-200"
              >
                <span className="text-xl">{f.emoji}</span>
                <span className="font-bold">{f.name}</span>
                <span className="text-xs">x{f.owned}</span>
              </button>
            ))}
        </div>
      )}
      <h3 className="font-bold text-gray-800 pt-2">ショップ（餌）</h3>
      <div className="grid gap-2">
        {data.foods.map((f) => (
          <div
            key={f.id}
            className="flex items-center justify-between p-3 bg-white border rounded-xl"
          >
            <span className="text-2xl">{f.emoji}</span>
            <div className="flex-1 mx-2 text-left">
              <p className="font-bold">{f.name}</p>
              <p className="text-xs text-gray-700">
                +{f.happiness_gain} 幸福度 / {f.cost} pt
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onBuy(f.id, f.cost, 1)}
                disabled={data.points < f.cost}
                className="px-3 py-1 bg-amber-500 text-white rounded-lg text-sm font-bold disabled:opacity-50"
              >
                1個
              </button>
              <button
                type="button"
                onClick={() => onBuy(f.id, f.cost * 5, 5)}
                disabled={data.points < f.cost * 5}
                className="px-3 py-1 bg-amber-600 text-white rounded-lg text-sm font-bold disabled:opacity-50"
              >
                5個
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
