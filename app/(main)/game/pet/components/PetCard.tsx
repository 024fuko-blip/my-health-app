"use client";

import { PET_SPECIES } from "@/lib/pet-shop";
import { getMangaSymbolForPet } from "@/lib/manga-symbols";
import { MangaSymbol } from "@/app/components/MangaSymbol";
import { PetVisual } from "./PetVisual";
import type { PetData } from "../hooks/pet-game-types";
import type { PetSpecialFlags } from "@/lib/pet-health";
import { getImagesForSpecies, getBlinkImagesForSpecies } from "@/lib/pet-health";

/** ねこ8段階の表示名（ビジュアル・ロードマップ準拠） */
const CAT_STAGE_LABELS: Record<string, string> = {
  stage_1: "ユメたまご",
  stage_2: "よちよちベビー",
  stage_3: "わんぱくチャイルド",
  stage_4: "のびのび学生",
  stage_5: "気ままな青年",
  stage_6: "夢の板前さん",
  stage_7: "銀河の王様",
  stage_8: "夢守神(守護獣)",
};

/** いぬ5段階の表示名 */
const DOG_STAGE_LABELS: Record<string, string> = {
  stage_1: "おすわりパピー",
  stage_2: "ほねほねバディ",
  stage_3: "マッスルわんこ",
  stage_4: "わんわん大王",
  stage_5: "チャンピオン犬",
};

interface PetCardProps {
  data: PetData;
  healthLevel: number;
  healthScore?: number;
  specialFlags?: PetSpecialFlags;
  scoreBreakdown?: {
    stepsScore: number;
    caloriesScore: number;
    sleepScore: number;
    loginBonus: number;
    decayPenalty: number;
  } | null;
  petName: string;
  petSpecies: string;
  saving: boolean;
  onPetNameChange: (v: string) => void;
  onPetSpeciesChange: (v: string) => void;
  onUpdatePet: () => void;
}

export function PetCard({
  data,
  healthLevel,
  healthScore,
  specialFlags,
  scoreBreakdown,
  petName,
  petSpecies,
  saving,
  onPetNameChange,
  onPetSpeciesChange,
  onUpdatePet,
}: PetCardProps) {
  const pet = data.pet;
  if (!pet) return null;

  const roomId = data.current_room_id ?? "room_default";
  const roomBg =
    roomId === "room_forest"
      ? "bg-green-50"
      : roomId === "room_ocean"
        ? "bg-blue-50"
        : roomId === "room_night"
          ? "bg-slate-800 text-white"
          : "bg-amber-50";

  const speciesStageLabels = pet.pet_species === "dog" ? DOG_STAGE_LABELS : CAT_STAGE_LABELS;
  const stageLabel =
    pet.stage && speciesStageLabels[pet.stage]
      ? speciesStageLabels[pet.stage]
      : pet.stage === "baby"
        ? "ベビー"
        : pet.stage === "junior"
          ? "ジュニア"
          : pet.stage === "adult"
            ? "アダルト"
            : pet.stage;

  const mangaKey = getMangaSymbolForPet({
    stage: pet.stage,
    happiness: pet.happiness ?? undefined,
    sleepy: pet.sleepy,
    worried: pet.worried,
    low_mood: pet.low_mood,
  });

  return (
    <div className={`border-2 border-amber-200 p-6 text-center shadow-sm min-h-[200px] ${roomBg}`}>
      <div className="relative inline-block">
        {mangaKey && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10">
            <MangaSymbol symbol={mangaKey} />
          </div>
        )}
        <div className={specialFlags?.sleepy ? "opacity-60" : ""}>
          <PetVisual
            healthLevel={healthLevel}
            images={getImagesForSpecies(pet.pet_species)}
            blinkImages={getBlinkImagesForSpecies(pet.pet_species)}
            alt={pet.pet_name}
            size={180}
          />
        </div>
        {specialFlags?.sleepy && (
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl pointer-events-none select-none animate-pulse z-10">
            💤
          </span>
        )}
        {pet.current_outfit_emoji && (
          <span className="absolute -bottom-1 -right-1 text-2xl">{pet.current_outfit_emoji}</span>
        )}
      </div>

      <div className="flex justify-center gap-1 mt-1 flex-wrap">
        {(pet.sleepy || specialFlags?.sleepy) && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">😴 眠そう</span>
        )}
        {specialFlags?.nightOwl && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">🦉 夜ふかし</span>
        )}
        {specialFlags?.earlyBird && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">🐦 早起き</span>
        )}
        {pet.wearing_mask && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">😷 花粉対策中</span>
        )}
        {pet.worried && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">😟 心配そう</span>
        )}
        {pet.low_mood && !pet.worried && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">😢 元気ない</span>
        )}
      </div>

      <p className="font-bold text-gray-800 text-lg mt-2">{pet.pet_name}</p>
      <div className="flex items-center justify-center gap-2 mt-0.5">
        <span className="text-xs text-amber-600 font-medium">Lv.{pet.level ?? 1}</span>
        {pet.stage && (
          <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800">
            {stageLabel}
          </span>
        )}
      </div>

      {(pet.mood_comment || pet.sleepy || pet.worried) && (
        <div className="mt-2 px-3 py-2 bg-amber-50 rounded-lg border border-amber-100">
          <span className="text-2xl mr-1" aria-hidden>
            {pet.sleepy
              ? "😴"
              : pet.worried
                ? "😟"
                : pet.low_mood
                  ? "😢"
                  : pet.mood_face ?? "😐"}
          </span>
          <span className="text-sm text-slate-700 italic">
            「{pet.sleepy
              ? "眠そう... おやすみしてね"
              : pet.worried
                ? "大丈夫？ 無理しないでね"
                : pet.low_mood
                  ? "元気だしていこう..."
                  : pet.mood_comment ?? "んー"}」
          </span>
        </div>
      )}

      <div className="mt-2 flex items-center justify-center gap-2">
        <span className="text-sm text-slate-800">健康スコア</span>
        <div className="w-32 h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              (healthScore ?? 0) >= 80
                ? "bg-amber-400"
                : (healthScore ?? 0) >= 40
                  ? "bg-green-400"
                  : "bg-red-400"
            }`}
            style={{ width: `${healthScore ?? pet.happiness ?? 0}%` }}
          />
        </div>
        <span className="text-sm font-bold text-amber-700">{healthScore ?? pet.happiness ?? 0}</span>
      </div>

      {scoreBreakdown && (
        <details className="mt-1 text-left">
          <summary className="text-xs text-slate-500 hover:underline cursor-pointer text-center">
            スコア内訳
          </summary>
          <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-slate-600 px-2">
            <span>🚶 歩数</span>
            <span className="text-right font-medium">+{Math.round(scoreBreakdown.stepsScore)}</span>
            <span>🍽️ カロリー</span>
            <span className="text-right font-medium">+{Math.round(scoreBreakdown.caloriesScore)}</span>
            <span>😴 睡眠</span>
            <span className="text-right font-medium">+{Math.round(scoreBreakdown.sleepScore)}</span>
            <span>📱 ログイン</span>
            <span className="text-right font-medium">+{Math.round(scoreBreakdown.loginBonus)}</span>
            {scoreBreakdown.decayPenalty > 0 && (
              <>
                <span className="text-red-500">⏳ 放置減衰</span>
                <span className="text-right font-medium text-red-500">-{Math.round(scoreBreakdown.decayPenalty)}</span>
              </>
            )}
          </div>
        </details>
      )}

      {pet.exp_to_next && pet.exp_to_next.needed > 0 && (
        <div className="mt-2 flex items-center justify-center gap-2">
          <span className="text-xs text-slate-800">EXP</span>
          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-400 rounded-full transition-all"
              style={{ width: `${(pet.exp_to_next.current / pet.exp_to_next.needed) * 100}%` }}
            />
          </div>
        </div>
      )}

      {pet.weather && (
        <p className="mt-2 text-sm text-slate-700">
          🌤 {pet.weather.desc} {Math.round(pet.weather.temp)}°C
        </p>
      )}

      {(pet.adopted_at != null || (pet.feed_count ?? 0) > 0) && (
        <div className="mt-3 pt-3 border-t border-amber-100 text-sm text-slate-700 text-left">
          <p><strong>育成ログ</strong></p>
          {pet.adopted_at && (
            <p>迎えて {Math.max(0, Math.floor((Date.now() - new Date(pet.adopted_at).getTime()) / (1000 * 60 * 60 * 24)))} 日目</p>
          )}
          <p>餌を {pet.feed_count ?? 0} 回あげた</p>
        </div>
      )}

      <details className="mt-2 text-left">
        <summary className="text-xs text-amber-600 hover:underline cursor-pointer">
          名前・種類を変える
        </summary>
        <form
          onSubmit={(e) => { e.preventDefault(); onUpdatePet(); }}
          className="mt-2 p-3 bg-amber-50 rounded-lg space-y-2"
        >
          <input
            value={petName}
            onChange={(e) => onPetNameChange(e.target.value)}
            placeholder="名前"
            className="w-full p-2 border rounded text-sm"
          />
          <div className="flex gap-2">
            {PET_SPECIES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onPetSpeciesChange(s.id)}
                className={`px-2 py-1 rounded text-sm ${
                  petSpecies === s.id ? "bg-amber-200" : "bg-white border"
                }`}
              >
                {s.emoji} {s.name}
              </button>
            ))}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2 bg-amber-500 text-white rounded font-bold text-sm disabled:opacity-50"
          >
            更新
          </button>
        </form>
      </details>
    </div>
  );
}
