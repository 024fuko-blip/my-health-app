"use client";

import { useState, useEffect } from "react";
import { ensureSession, apiFetch, handleUnauthorized } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import {
  hasGoodNutritionFor3Days,
  getUnlockedContainers,
  unlockRandomContainerIfEligible,
  type DayLogForNutrition,
  type ContainerId,
} from "@/lib/liquid-cat";
import { LiquidCatInContainer } from "./LiquidCatInContainer";

interface PetLiquidTabProps {
  speciesEmoji?: string;
}

export function PetLiquidTab({ speciesEmoji = "🐱" }: PetLiquidTabProps) {
  const router = useRouter();
  const [logs, setLogs] = useState<DayLogForNutrition[]>([]);
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [newlyUnlocked, setNewlyUnlocked] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const session = await ensureSession(router);
      if (!session) return;

      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 3);
      const startStr = start.toISOString().split("T")[0];
      const endStr = end.toISOString().split("T")[0];

      const res = await apiFetch(
        `/api/health-logs?startDate=${startStr}&endDate=${endStr}`
      );
      if (res.status === 401) {
        handleUnauthorized(router);
        return;
      }
      const data = res.ok ? await res.json() : [];
      const nutritionLogs = (Array.isArray(data) ? data : []).map(
        (log: { date: string; meal_description?: string; calories?: number; protein?: number }) => ({
          date: log.date,
          meal_description: log.meal_description,
          calories: log.calories,
          protein: log.protein,
        })
      );
      setLogs(nutritionLogs);

      const good = hasGoodNutritionFor3Days(nutritionLogs);
      if (good) {
        const id = unlockRandomContainerIfEligible();
        if (id) setNewlyUnlocked(id);
      }

      setUnlocked(getUnlockedContainers());
    };
    load();
  }, [router]);

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-slate-800">💤 液体ねこコレクション</h3>
      <p className="text-sm text-slate-600">
        過去3日間、食事メモとカロリーorタンパク質を記録し続けると、容器がアンロックされるよ。スマホを傾けると液体が揺れる！
      </p>

      {unlocked.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
          <p className="text-sm text-amber-800">
            まだ容器がないよ。3日連続で食事と栄養を記録しよう！
          </p>
        </div>
      ) : (
        <>
          {newlyUnlocked && (
            <div className="bg-green-50 border border-green-200 p-2 rounded-lg text-sm text-green-800">
              🎉 新しい容器をゲットした！
            </div>
          )}
          <div className="flex flex-wrap gap-6 justify-center py-4">
            {unlocked.map((id) => (
              <LiquidCatInContainer
                key={id}
                containerId={id as ContainerId}
                speciesEmoji={speciesEmoji}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
