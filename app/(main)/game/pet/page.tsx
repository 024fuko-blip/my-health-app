"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ensureSession, handleUnauthorized, apiFetch, apiPost, apiPut } from "@/lib/api-client";
import { PET_SPECIES } from "@/lib/pet-shop";
import { PetGame } from "./components/PetGame";
import { QuizGame } from "./components/QuizGame";
import { SudokuGame } from "./components/SudokuGame";
import { MemoryGame } from "./components/MemoryGame";
import { PetFeedTab } from "./components/PetFeedTab";
import { PetOutfitTab } from "./components/PetOutfitTab";
import { PetRoomTab } from "./components/PetRoomTab";
import { PetPlayTab } from "./components/PetPlayTab";

interface PetState {
  pet_name: string;
  pet_species: string;
  species_emoji: string;
  stage?: "baby" | "junior" | "adult";
  happiness: number;
  last_fed_at: string | null;
  current_outfit_id: string | null;
  current_outfit_emoji: string | null;
  level?: number;
  exp_points?: number;
  exp_to_next?: { current: number; needed: number };
  adopted_at: string | null;
  feed_count?: number;
  mood_face?: string;
  mood_label?: string;
  mood_comment?: string;
  /** 心身相関フラグ（API から返却） */
  sleepy?: boolean;
  wearing_mask?: boolean;
  worried?: boolean;
  low_mood?: boolean;
  weather?: { temp: number; desc: string } | null;
}

interface FoodItem {
  id: string;
  name: string;
  cost: number;
  emoji: string;
  happiness_gain: number;
  owned: number;
}

interface OutfitItem {
  id: string;
  name: string;
  cost: number;
  emoji: string | null;
  owned: boolean;
  equipped: boolean;
}

interface RoomItem {
  id: string;
  name: string;
  cost: number;
  emoji: string;
  owned: boolean | number;
  equipped?: boolean;
}

interface PetData {
  pet: PetState | null;
  points: number;
  inventory: Record<string, number>;
  foods: FoodItem[];
  outfits: OutfitItem[];
  rooms?: RoomItem[];
  furniture?: Array<{ id: string; name: string; cost: number; emoji: string; owned: number }>;
  current_room_id?: string | null;
  placed_furniture?: Array<{ itemId: string; position: string }>;
}

export default function GamePetPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PetData | null>(null);
  const [tab, setTab] = useState<"feed" | "outfit" | "room" | "play">("feed");
  const [minigame, setMinigame] = useState<"sudoku" | "memory" | "pet" | "quiz" | null>(null);
  const [petName, setPetName] = useState("");
  const [petSpecies, setPetSpecies] = useState("cat");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const defaultPetData: PetData = {
    pet: null,
    points: 0,
    inventory: {},
    foods: [],
    outfits: [],
    rooms: [],
    furniture: [],
    current_room_id: null,
    placed_furniture: [],
  };

  const fetchPet = async () => {
    try {
      const session = await ensureSession(router);
      if (!session) {
        setLoading(false);
        return;
      }
      const res = await apiFetch("/api/pet");
      if (res.status === 401) {
        handleUnauthorized(router);
        setLoading(false);
        return;
      }
      if (res.ok) {
        const j = await res.json();
        setData(j);
        if (j.pet) {
          setPetName(j.pet.pet_name);
          setPetSpecies(j.pet.pet_species);
        }
      } else {
        setData(defaultPetData);
      }
    } catch {
      setData(defaultPetData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPet();
  }, [router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "play") setTab("play");
  }, []);

  const handleCreatePet = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const result = await apiPost<Record<string, unknown>>("/api/pet", {
        pet_name: petName.trim() || "ぽっち",
        pet_species: petSpecies,
      });
      const j = result.ok ? result.data : {};
      if (result.ok) {
        await fetchPet();
      } else {
        setMessage(result.error ?? "作成に失敗しました");
      }
    } catch (err) {
      setMessage("通信エラーです。ブラウザを更新して再度お試しください。");
      console.error("createPet error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleFeed = async (itemId: string) => {
    setMessage(null);
    const result = await apiPost<{ used?: string; happiness?: number; error?: string }>("/api/pet/feed", { itemId });
    const j = result.ok ? result.data : { error: result.error };
    if (result.ok) {
      setMessage(`${j.used}をあげた！ 幸福度 ${j.happiness}`);
      await fetchPet();
    } else setMessage(j.error ?? "失敗しました");
  };

  const handleBuy = async (itemId: string, cost: number, quantity?: number) => {
    if ((data?.points ?? 0) < cost) {
      setMessage("ポイントが足りません");
      return;
    }
    setMessage(null);
    const result = await apiPost<{ error?: string }>("/api/pet/buy", { itemId, quantity: quantity ?? 1 });
    const j = result.ok ? {} : { error: result.error };
    if (result.ok) {
      setMessage("購入した！");
      await fetchPet();
    } else setMessage(j.error ?? "購入に失敗しました");
  };

  const submitMinigame = async (
    gameType: "catch" | "pet" | "quiz" | "sudoku" | "memory",
    payload: {
      score?: number;
      count?: number;
      correct?: boolean;
      completed?: boolean;
      pairsMatched?: number;
    }
  ) => {
    setMessage(null);
    const result = await apiPost<{ points_earned?: number; happiness_gain?: number; error?: string }>("/api/pet/minigame", {
      game_type: gameType,
      ...payload,
    });
    const j = result.ok ? result.data : { error: result.error };
    if (result.ok) {
      setMessage(
        `+${j.points_earned}pt！幸福度+${j.happiness_gain}`
      );
      await fetchPet();
    } else {
      setMessage(j.error ?? "失敗しました");
    }
    setMinigame(null);
  };

  const handleRoomUpdate = async (
    roomId?: string | null,
    placed?: Array<{ itemId: string; position: string }>
  ) => {
    setMessage(null);
    const result = await apiPut<{ error?: string }>("/api/pet/room", {
      current_room_id: roomId ?? data?.current_room_id ?? null,
      placed_furniture: placed ?? data?.placed_furniture ?? [],
    });
    if (result.ok) {
      setMessage("部屋を更新した！");
      await fetchPet();
    } else {
      setMessage(result.error ?? "失敗しました");
    }
  };

  const handleEquip = async (outfitId: string | null) => {
    setMessage(null);
    const result = await apiPost<{ error?: string }>("/api/pet/outfit", {
      outfitId: outfitId === "outfit_none" ? null : outfitId,
    });
    if (result.ok) {
      setMessage(outfitId ? "着せ替えた！" : "衣装を外した");
      await fetchPet();
    } else {
      setMessage(result.error ?? "失敗しました");
    }
  };

  if (loading) return <div className="p-4">読み込み中...</div>;
  const dataToUse = data ?? defaultPetData;

  const speciesInfo =
    PET_SPECIES.find((s) => s.id === (dataToUse.pet?.pet_species ?? "cat")) ??
    PET_SPECIES[0];

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-3">
        <Link
          href="/game"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-gray-700 hover:bg-amber-200 transition"
          aria-label="ゲームに戻る"
        >
          ←
        </Link>
        <h1 className="text-xl font-bold text-amber-900">ぽっちを育てる</h1>
      </div>

      <div className="bg-violet-50 border-2 border-violet-200 rounded-xl p-4 text-center">
        <p className="text-sm font-bold text-violet-800 mb-1">
          所持ポイント: {dataToUse.points} pt
        </p>
        <p className="text-xs text-violet-600">
          記録するとポイントがたまるよ。餌や着せ替えに使おう！
        </p>
      </div>

      {!dataToUse.pet ? (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6">
          {message && (
            <div className={`mb-3 px-3 py-2 rounded-lg text-sm ${
              message.includes("失敗") || message.includes("エラー")
                ? "bg-red-50 border border-red-200 text-red-800"
                : "bg-green-50 border border-green-200 text-green-800"
            }`}>
              {message}
            </div>
          )}
          <p className="text-sm text-amber-800 mb-3">
            個性的でぶさかわいい<strong>6種類</strong>から1匹選んで、名前をつけて迎えよう。迎えたあとは餌や着せ替えで育成していけるよ！
          </p>
          <h2 className="font-bold text-amber-900 mb-3">ぽっちを迎えよう</h2>
          <form onSubmit={handleCreatePet} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                名前
              </label>
              <input
                type="text"
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
                placeholder="ぽっち"
                className="w-full p-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                種類（6種類から選択）
              </label>
              <div className="flex gap-2 flex-wrap">
                {PET_SPECIES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setPetSpecies(s.id)}
                    className={`px-3 py-2 rounded-lg border-2 text-sm font-medium ${
                      petSpecies === s.id
                        ? "border-amber-500 bg-amber-100"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    {s.emoji} {s.name}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-amber-500 text-white font-bold rounded-xl disabled:opacity-50"
            >
              {saving ? "作成中..." : "ぽっちを迎える"}
            </button>
          </form>
        </div>
      ) : (
        <>
          <div
            className={`border-2 border-amber-200 p-6 text-center shadow-sm min-h-[200px] ${
              (dataToUse.current_room_id ?? "room_default") === "room_forest"
                ? "bg-green-50"
                : (dataToUse.current_room_id ?? "room_default") === "room_ocean"
                  ? "bg-blue-50"
                  : (dataToUse.current_room_id ?? "room_default") === "room_night"
                    ? "bg-slate-800 text-white"
                    : "bg-amber-50"
            }`}
          >
            <div className={`text-6xl mb-2 relative inline-block touch-manipulation ${
              dataToUse.pet?.stage === "baby"
                ? "pet-anim-baby"
                : dataToUse.pet?.stage === "junior"
                  ? "pet-anim-junior"
                  : "pet-anim-adult"
            }`}>
              {dataToUse.pet?.current_outfit_emoji && (
                <span className="mr-1">{dataToUse.pet.current_outfit_emoji}</span>
              )}
              <span>{dataToUse.pet?.species_emoji}</span>
            </div>
            <div className="flex justify-center gap-1 mt-1 flex-wrap">
              {dataToUse.pet?.sleepy && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">😴 眠そう</span>
              )}
              {dataToUse.pet?.wearing_mask && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">😷 花粉対策中</span>
              )}
              {dataToUse.pet?.worried && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">😟 心配そう</span>
              )}
              {dataToUse.pet?.low_mood && !dataToUse.pet?.worried && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">😢 元気ない</span>
              )}
            </div>
            <p className="font-bold text-gray-800 text-lg mt-2">{dataToUse.pet?.pet_name}</p>
            <div className="flex items-center justify-center gap-2 mt-0.5">
              <span className="text-xs text-amber-600 font-medium">Lv.{dataToUse.pet?.level ?? 1}</span>
              {dataToUse.pet?.stage && (
                <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800">
                  {dataToUse.pet.stage === "baby" ? "ベビー" : dataToUse.pet.stage === "junior" ? "ジュニア" : "アダルト"}
                </span>
              )}
            </div>
            {(dataToUse.pet?.mood_comment || dataToUse.pet?.sleepy || dataToUse.pet?.worried) && (
              <div className="mt-2 px-3 py-2 bg-amber-50 rounded-lg border border-amber-100">
                <span className="text-2xl mr-1" aria-hidden>
                  {dataToUse.pet?.sleepy
                    ? "😴"
                    : dataToUse.pet?.worried
                      ? "😟"
                      : dataToUse.pet?.low_mood
                        ? "😢"
                        : dataToUse.pet?.mood_face ?? "😐"}
                </span>
                <span className="text-sm text-gray-700 italic">
                  「
                  {dataToUse.pet?.sleepy
                    ? "眠そう... おやすみしてね"
                    : dataToUse.pet?.worried
                      ? "大丈夫？ 無理しないでね"
                      : dataToUse.pet?.low_mood
                        ? "元気だしていこう..."
                        : dataToUse.pet?.mood_comment ?? "んー"}
                  」
                </span>
              </div>
            )}
            <div className="mt-2 flex items-center justify-center gap-2">
              <span className="text-sm text-gray-500">幸福度</span>
              <div className="w-32 h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all"
                  style={{ width: `${dataToUse.pet?.happiness ?? 0}%` }}
                />
              </div>
              <span className="text-sm font-bold text-amber-700">
                {dataToUse.pet?.happiness ?? 0}
              </span>
            </div>
            {dataToUse.pet?.exp_to_next && dataToUse.pet.exp_to_next.needed > 0 && (
              <div className="mt-2 flex items-center justify-center gap-2">
                <span className="text-xs text-gray-500">EXP</span>
                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-400 rounded-full transition-all"
                    style={{ width: `${(dataToUse.pet.exp_to_next.current / dataToUse.pet.exp_to_next.needed) * 100}%` }}
                  />
                </div>
              </div>
            )}
            {dataToUse.pet?.weather && (
              <p className="mt-2 text-xs text-slate-500">
                🌤 {dataToUse.pet.weather.desc} {Math.round(dataToUse.pet.weather.temp)}°C
              </p>
            )}
            {(dataToUse.pet?.adopted_at != null || (dataToUse.pet?.feed_count ?? 0) > 0) && (
              <div className="mt-3 pt-3 border-t border-amber-100 text-xs text-gray-500 text-left">
                <p><strong>育成ログ</strong></p>
                {dataToUse.pet?.adopted_at && (
                  <p>迎えて {Math.max(0, Math.floor((Date.now() - new Date(dataToUse.pet.adopted_at).getTime()) / (1000 * 60 * 60 * 24)))} 日目</p>
                )}
                <p>餌を {dataToUse.pet?.feed_count ?? 0} 回あげた</p>
              </div>
            )}
            <details className="mt-2 text-left">
              <summary className="text-xs text-amber-600 hover:underline cursor-pointer">
                名前・種類を変える
              </summary>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setSaving(true);
                  const result = await apiPost<Record<string, unknown>>("/api/pet", {
                    pet_name: petName.trim() || "ぽっち",
                    pet_species: petSpecies,
                  });
                  if (result.ok) await fetchPet();
                  setSaving(false);
                }}
                className="mt-2 p-3 bg-amber-50 rounded-lg space-y-2"
              >
                <input
                  value={petName}
                  onChange={(e) => setPetName(e.target.value)}
                  placeholder="名前"
                  className="w-full p-2 border rounded text-sm"
                />
                <div className="flex gap-2">
                  {PET_SPECIES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setPetSpecies(s.id)}
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

          {message && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-800">
              {message}
            </div>
          )}

          <div className="flex gap-2 border-b border-gray-200 pb-2">
            <button
              type="button"
              onClick={() => setTab("feed")}
              className={`flex-1 py-2 font-bold text-sm ${
                tab === "feed"
                  ? "bg-amber-500 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              🍖 餌
            </button>
            <button
              type="button"
              onClick={() => setTab("outfit")}
              className={`flex-1 py-2 font-bold text-sm ${
                tab === "outfit"
                  ? "bg-amber-500 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              👗 着替
            </button>
            <button
              type="button"
              onClick={() => setTab("room")}
              className={`flex-1 py-2 font-bold text-sm ${
                tab === "room"
                  ? "bg-amber-500 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              🏠 部屋
            </button>
            <button
              type="button"
              onClick={() => setTab("play")}
              className={`flex-1 py-2 font-bold text-sm ${
                tab === "play"
                  ? "bg-amber-500 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              🎮 遊ぶ
            </button>
          </div>

          {tab === "feed" && (
            <PetFeedTab
              data={dataToUse}
              onFeed={handleFeed}
              onBuy={handleBuy}
            />
          )}

          {tab === "room" && (
            <PetRoomTab
              data={dataToUse}
              onRoomUpdate={(id) => handleRoomUpdate(id)}
              onBuy={(id, cost) => handleBuy(id, cost)}
            />
          )}

          {tab === "play" && (
            <PetPlayTab onMinigame={setMinigame} />
          )}

          {minigame === "sudoku" && (
            <SudokuGame
              onFinish={(completed) => submitMinigame("sudoku", { completed })}
              onClose={() => setMinigame(null)}
            />
          )}
          {minigame === "memory" && (
            <MemoryGame
              onFinish={(pairsMatched) =>
                submitMinigame("memory", { pairsMatched })
              }
              onClose={() => setMinigame(null)}
            />
          )}
          {minigame === "pet" && dataToUse.pet && (
            <PetGame
              petEmoji={dataToUse.pet.species_emoji}
              onFinish={(c) => submitMinigame("pet", { count: c })}
              onClose={() => setMinigame(null)}
            />
          )}
          {minigame === "quiz" && (
            <QuizGame
              onFinish={(c) => submitMinigame("quiz", { correct: c })}
              onClose={() => setMinigame(null)}
            />
          )}

          {tab === "outfit" && (
            <PetOutfitTab
              data={dataToUse}
              onEquip={handleEquip}
              onBuy={(id, cost) => handleBuy(id, cost)}
            />
          )}
        </>
      )}

      <Link
        href="/record"
        className="block w-full py-3 bg-amber-500 text-white font-bold rounded-xl text-center hover:bg-amber-600"
      >
        記録してポイントを稼ぐ
      </Link>
    </div>
  );
}
