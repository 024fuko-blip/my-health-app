"use client";

import Image from "next/image";
import { PET_SPECIES } from "@/lib/pet-shop";
import { getMangaSymbolForPet } from "@/lib/manga-symbols";
import { MangaSymbol } from "@/app/components/MangaSymbol";
import { PetVisual } from "./PetVisual";
import type { PetData } from "../hooks/pet-game-types";
import type { PetSpecialFlags } from "@/lib/pet-health";
import { getImagesForSpecies, getBlinkImagesForSpecies } from "@/lib/pet-health";

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

const DOG_STAGE_LABELS: Record<string, string> = {
  stage_1: "おすわりパピー",
  stage_2: "ほねほねバディ",
  stage_3: "マッスルわんこ",
  stage_4: "わんわん大王",
  stage_5: "チャンピオン犬",
};

const ROOM_STYLES: Record<string, { sky: string; ground: string }> = {
  room_forest: { sky: "linear-gradient(to bottom, #a7f3d0, #d1fae5, #ecfccb)", ground: "linear-gradient(to right, #4ade80, #10b981)" },
  room_ocean:  { sky: "linear-gradient(to bottom, #bae6fd, #cffafe, #dbeafe)", ground: "linear-gradient(to right, #22d3ee, #60a5fa)" },
  room_night:  { sky: "linear-gradient(to bottom, #312e81, #1e293b, #4c1d95)", ground: "linear-gradient(to right, #334155, #475569)" },
};
const DEFAULT_ROOM = { sky: "linear-gradient(to bottom, #bae6fd, #e0f2fe, #d1fae5)", ground: "linear-gradient(to right, #a3e635, #22c55e)" };

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
  const isNight = roomId === "room_night";
  const room = ROOM_STYLES[roomId] ?? DEFAULT_ROOM;

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

  const statusBadges: Array<{ key: string; emoji: string; text: string; colors: string }> = [];
  if (pet.weather) {
    statusBadges.push({
      key: "weather",
      emoji: isNight ? "🌙" : "☀️",
      text: `${pet.weather.desc} ${Math.round(pet.weather.temp)}°C`,
      colors: isNight ? "bg-indigo-900/60 text-indigo-100" : "bg-white/70 text-slate-700",
    });
  }
  if (pet.wearing_mask) {
    statusBadges.push({ key: "mask", emoji: "😷", text: "花粉対策中", colors: "bg-green-100/80 text-green-800" });
  }
  if (pet.sleepy || specialFlags?.sleepy) {
    statusBadges.push({ key: "sleepy", emoji: "😴", text: "眠そう", colors: "bg-indigo-100/80 text-indigo-700" });
  }
  if (specialFlags?.nightOwl) {
    statusBadges.push({ key: "owl", emoji: "🦉", text: "夜ふかし", colors: "bg-purple-100/80 text-purple-700" });
  }
  if (specialFlags?.earlyBird) {
    statusBadges.push({ key: "bird", emoji: "🐦", text: "早起き", colors: "bg-sky-100/80 text-sky-700" });
  }
  if (pet.worried) {
    statusBadges.push({ key: "worried", emoji: "😟", text: "心配そう", colors: "bg-amber-100/80 text-amber-700" });
  } else if (pet.low_mood) {
    statusBadges.push({ key: "low", emoji: "😢", text: "元気ない", colors: "bg-slate-100/80 text-slate-600" });
  }

  const daysAdopted = pet.adopted_at
    ? Math.max(0, Math.floor((Date.now() - new Date(pet.adopted_at).getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="rounded-2xl overflow-hidden shadow-lg border border-white/40">
      {/* --- 野原ビジュアルエリア --- */}
      <div className="relative pt-3 pb-8" style={{ background: room.sky }}>
        {/* ステータスバッジ（天気 + 花粉 etc.） */}
        {statusBadges.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-3 mb-2 justify-end">
            {statusBadges.map((b) => (
              <span
                key={b.key}
                className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full backdrop-blur-sm ${b.colors}`}
              >
                {b.emoji} {b.text}
              </span>
            ))}
          </div>
        )}

        {/* ペット本体 */}
        <div className="flex justify-center">
          <div className="relative">
            {mangaKey && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                <MangaSymbol symbol={mangaKey} />
              </div>
            )}
            <div className={specialFlags?.sleepy ? "opacity-60" : ""}>
              <PetVisual
                healthLevel={healthLevel}
                images={getImagesForSpecies(pet.pet_species)}
                blinkImages={getBlinkImagesForSpecies(pet.pet_species)}
                alt={pet.pet_name}
                size={240}
              />
            </div>
            {specialFlags?.sleepy && (
              <span className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl pointer-events-none select-none animate-pulse z-10">
                💤
              </span>
            )}
            {pet.current_outfit_emoji && (
              <span className="absolute -bottom-1 -right-1 text-3xl drop-shadow">{pet.current_outfit_emoji}</span>
            )}
          </div>
        </div>

        {/* 地面グラデーション */}
        <div className="absolute bottom-0 left-0 right-0 h-6 opacity-60" style={{ background: room.ground }} />
        <div className="absolute bottom-0 left-0 right-0 h-3" style={{ background: "linear-gradient(to top, rgba(255,255,255,0.3), transparent)" }} />
      </div>

      {/* --- 情報エリア --- */}
      <div className={`px-5 py-4 space-y-3 ${isNight ? "bg-slate-900 text-white" : "bg-white"}`}>
        {/* 名前 + レベル */}
        <div className="text-center">
          <p className={`font-bold text-xl ${isNight ? "text-white" : "text-gray-800"}`}>{pet.pet_name}</p>
          <div className="flex items-center justify-center gap-2 mt-0.5">
            <span className={`text-xs font-medium ${isNight ? "text-amber-300" : "text-amber-600"}`}>
              Lv.{pet.level ?? 1}
            </span>
            {pet.stage && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${isNight ? "bg-amber-900/40 text-amber-200" : "bg-amber-100 text-amber-800"}`}>
                {stageLabel}
              </span>
            )}
            {daysAdopted != null && (
              <span className={`text-xs ${isNight ? "text-slate-400" : "text-slate-400"}`}>
                {daysAdopted}日目
              </span>
            )}
          </div>
        </div>

        {/* 吹き出しコメント */}
        {(pet.mood_comment || pet.sleepy || pet.worried) && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${isNight ? "bg-slate-800 border border-slate-700" : "bg-amber-50 border border-amber-100"}`}>
            <span className="text-xl shrink-0" aria-hidden>
              {pet.sleepy ? "😴" : pet.worried ? "😟" : pet.low_mood ? "😢" : pet.mood_face ?? "😐"}
            </span>
            <span className={`text-sm italic ${isNight ? "text-slate-300" : "text-slate-600"}`}>
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

        {/* 健康スコア */}
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium shrink-0 ${isNight ? "text-slate-400" : "text-slate-500"}`}>
            健康スコア
          </span>
          <div className={`flex-1 h-2.5 rounded-full overflow-hidden ${isNight ? "bg-slate-700" : "bg-gray-200"}`}>
            <div
              className={`h-full rounded-full transition-all ${
                (healthScore ?? 0) >= 80 ? "bg-amber-400"
                  : (healthScore ?? 0) >= 40 ? "bg-green-400"
                  : "bg-red-400"
              }`}
              style={{ width: `${Math.max(2, healthScore ?? pet.happiness ?? 0)}%` }}
            />
          </div>
          <span className={`text-sm font-bold min-w-[2.5ch] text-right ${isNight ? "text-amber-300" : "text-amber-700"}`}>
            {healthScore ?? pet.happiness ?? 0}
          </span>
        </div>

        {scoreBreakdown && (
          <details className="text-left">
            <summary className={`text-xs hover:underline cursor-pointer text-center ${isNight ? "text-slate-400" : "text-slate-400"}`}>
              スコア内訳
            </summary>
            <div className={`mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs px-2 ${isNight ? "text-slate-400" : "text-slate-500"}`}>
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
                  <span className="text-red-400">⏳ 放置減衰</span>
                  <span className="text-right font-medium text-red-400">-{Math.round(scoreBreakdown.decayPenalty)}</span>
                </>
              )}
            </div>
          </details>
        )}

        {/* 育成ログ + 名前変更 */}
        <details className="text-left">
          <summary className={`text-xs cursor-pointer ${isNight ? "text-amber-400 hover:text-amber-300" : "text-amber-600 hover:underline"}`}>
            名前・種類を変える
          </summary>
          <form
            onSubmit={(e) => { e.preventDefault(); onUpdatePet(); }}
            className={`mt-2 p-3 rounded-lg space-y-2 ${isNight ? "bg-slate-800" : "bg-amber-50"}`}
          >
            <input
              value={petName}
              onChange={(e) => onPetNameChange(e.target.value)}
              placeholder="名前"
              className={`w-full p-2 border rounded text-sm ${isNight ? "bg-slate-700 border-slate-600 text-white" : ""}`}
            />
            <div className="grid grid-cols-3 gap-2">
              {PET_SPECIES.map((s) => {
                const sImages = getImagesForSpecies(s.id);
                const hasImg = sImages[1].startsWith("/pets/");
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onPetSpeciesChange(s.id)}
                    className={`flex flex-col items-center gap-0.5 px-1 py-2 rounded-lg text-xs transition-all ${
                      petSpecies === s.id
                        ? isNight ? "bg-amber-700 text-amber-100 ring-2 ring-amber-400" : "bg-amber-100 ring-2 ring-amber-400"
                        : isNight ? "bg-slate-700 text-slate-300 border border-slate-600" : "bg-white border"
                    }`}
                  >
                    {hasImg ? (
                      <Image src={sImages[1]} alt={s.name} width={40} height={40} className="object-contain" />
                    ) : (
                      <span className="text-2xl leading-none">{s.emoji}</span>
                    )}
                    <span>{s.name}</span>
                  </button>
                );
              })}
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
    </div>
  );
}
