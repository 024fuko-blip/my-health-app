"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PET_SPECIES } from "@/lib/pet-shop";

interface PetState {
  pet_name: string;
  pet_species: string;
  species_emoji: string;
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

interface PetData {
  pet: PetState | null;
  points: number;
  inventory: Record<string, number>;
  foods: FoodItem[];
  outfits: OutfitItem[];
}

export default function GamePetPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PetData | null>(null);
  const [tab, setTab] = useState<"feed" | "outfit">("feed");
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
  };

  const fetchPet = async () => {
    try {
      const sessionRes = await fetch("/api/auth/session", {
        credentials: "include",
      });
      const sessionData = await sessionRes.json();
      if (!sessionData.user) {
        router.replace("/login");
        setLoading(false);
        return;
      }
      const res = await fetch("/api/pet", { credentials: "include" });
      if (res.status === 401) {
        router.replace("/login");
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

  const handleCreatePet = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/pet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pet_name: petName.trim() || "ぽっち",
          pet_species: petSpecies,
        }),
        credentials: "include",
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        await fetchPet();
      } else {
        setMessage((j as { error?: string }).error ?? "作成に失敗しました");
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
    const res = await fetch("/api/pet/feed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
      credentials: "include",
    });
    const j = await res.json();
    if (res.ok) {
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
    const res = await fetch("/api/pet/buy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, quantity: quantity ?? 1 }),
      credentials: "include",
    });
    const j = await res.json();
    if (res.ok) {
      setMessage("購入した！");
      await fetchPet();
    } else setMessage(j.error ?? "購入に失敗しました");
  };

  const handleEquip = async (outfitId: string | null) => {
    setMessage(null);
    const res = await fetch("/api/pet/outfit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        outfitId: outfitId === "outfit_none" ? null : outfitId,
      }),
      credentials: "include",
    });
    if (res.ok) {
      setMessage(outfitId ? "着せ替えた！" : "衣装を外した");
      await fetchPet();
    } else {
      const j = await res.json();
      setMessage(j.error ?? "失敗しました");
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
          <div className="bg-white border-2 border-amber-200 rounded-2xl p-6 text-center shadow-sm">
            <div className="text-6xl mb-2">
              {dataToUse.pet?.current_outfit_emoji && (
                <span className="mr-1">{dataToUse.pet.current_outfit_emoji}</span>
              )}
              <span>{dataToUse.pet?.species_emoji}</span>
            </div>
            <p className="font-bold text-gray-800 text-lg">{dataToUse.pet?.pet_name}</p>
            <span className="text-xs text-amber-600 font-medium">Lv.{dataToUse.pet?.level ?? 1}</span>
            {dataToUse.pet?.mood_comment && (
              <div className="mt-2 px-3 py-2 bg-amber-50 rounded-lg border border-amber-100">
                <span className="text-2xl mr-1" aria-hidden>{dataToUse.pet.mood_face ?? "😐"}</span>
                <span className="text-sm text-gray-700 italic">「{dataToUse.pet.mood_comment}」</span>
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
                  const res = await fetch("/api/pet", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      pet_name: petName.trim() || "ぽっち",
                      pet_species: petSpecies,
                    }),
                    credentials: "include",
                  });
                  if (res.ok) await fetchPet();
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
              className={`flex-1 py-2 rounded-lg font-bold text-sm ${
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
              className={`flex-1 py-2 rounded-lg font-bold text-sm ${
                tab === "outfit"
                  ? "bg-amber-500 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              👗 着せ替え
            </button>
          </div>

          {tab === "feed" && (
            <div className="space-y-4">
              <h3 className="font-bold text-gray-800">所持している餌</h3>
              {dataToUse.foods.filter((f) => f.owned > 0).length === 0 ? (
                <p className="text-sm text-gray-500">
                  餌を持っていません。下のショップで購入しよう。
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {dataToUse.foods
                    .filter((f) => f.owned > 0)
                    .map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => handleFeed(f.id)}
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
                {dataToUse.foods.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between p-3 bg-white border rounded-xl"
                  >
                    <span className="text-2xl">{f.emoji}</span>
                    <div className="flex-1 mx-2 text-left">
                      <p className="font-bold">{f.name}</p>
                      <p className="text-xs text-gray-500">
                        +{f.happiness_gain} 幸福度 / {f.cost} pt
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleBuy(f.id, f.cost, 1)}
                        disabled={dataToUse.points < f.cost}
                        className="px-3 py-1 bg-amber-500 text-white rounded-lg text-sm font-bold disabled:opacity-50"
                      >
                        1個
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBuy(f.id, f.cost * 5, 5)}
                        disabled={dataToUse.points < f.cost * 5}
                        className="px-3 py-1 bg-amber-600 text-white rounded-lg text-sm font-bold disabled:opacity-50"
                      >
                        5個
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "outfit" && (
            <div className="space-y-4">
              <h3 className="font-bold text-gray-800">着せ替え</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleEquip("outfit_none")}
                  className={`px-3 py-2 rounded-xl border-2 ${
                    !dataToUse.pet?.current_outfit_id
                      ? "border-amber-500 bg-amber-50"
                      : "border-gray-200"
                  }`}
                >
                  なし
                </button>
                {dataToUse.outfits
                  .filter((o) => o.owned)
                  .map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => handleEquip(o.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 ${
                        o.equipped
                          ? "border-amber-500 bg-amber-50"
                          : "border-gray-200"
                      }`}
                    >
                      {o.emoji && <span>{o.emoji}</span>}
                      <span>{o.name}</span>
                    </button>
                  ))}
              </div>
              <h3 className="font-bold text-gray-800 pt-2">ショップ（着せ替え）</h3>
              <div className="grid gap-2">
                {dataToUse.outfits.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between p-3 bg-white border rounded-xl"
                  >
                    <span className="text-2xl">{o.emoji ?? "—"}</span>
                    <div className="flex-1 mx-2 text-left">
                      <p className="font-bold">{o.name}</p>
                      <p className="text-xs text-gray-500">{o.cost} pt</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleBuy(o.id, o.cost)}
                      disabled={dataToUse.points < o.cost || o.owned}
                      className="px-3 py-1 bg-violet-500 text-white rounded-lg text-sm font-bold disabled:opacity-50"
                    >
                      {o.owned ? "所持済み" : "購入"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
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
