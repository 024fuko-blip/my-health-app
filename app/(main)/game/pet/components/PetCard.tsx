"use client";

import { PET_SPECIES } from "@/lib/pet-shop";
import type { PetData } from "../hooks/usePetGame";

interface PetCardProps {
  data: PetData;
  petName: string;
  petSpecies: string;
  saving: boolean;
  onPetNameChange: (v: string) => void;
  onPetSpeciesChange: (v: string) => void;
  onUpdatePet: () => void;
}

export function PetCard({
  data,
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

  const animClass =
    pet.stage === "baby"
      ? "pet-anim-baby"
      : pet.stage === "junior"
        ? "pet-anim-junior"
        : "pet-anim-adult";

  return (
    <div className={`border-2 border-amber-200 p-6 text-center shadow-sm min-h-[200px] ${roomBg}`}>
      <div className={`text-6xl mb-2 relative inline-block touch-manipulation ${animClass}`}>
        {pet.current_outfit_emoji && (
          <span className="mr-1">{pet.current_outfit_emoji}</span>
        )}
        <span>{pet.species_emoji}</span>
      </div>

      <div className="flex justify-center gap-1 mt-1 flex-wrap">
        {pet.sleepy && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">😴 眠そう</span>
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
            {pet.stage === "baby" ? "ベビー" : pet.stage === "junior" ? "ジュニア" : "アダルト"}
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
        <span className="text-sm text-slate-800">幸福度</span>
        <div className="w-32 h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-400 rounded-full transition-all"
            style={{ width: `${pet.happiness ?? 0}%` }}
          />
        </div>
        <span className="text-sm font-bold text-amber-700">{pet.happiness ?? 0}</span>
      </div>

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
