"use client";

import Link from "next/link";
import { PET_SPECIES } from "@/lib/pet-shop";
import { usePetGame } from "./hooks/usePetGame";
import { PetCard } from "./components/PetCard";
import { PetGame } from "./components/PetGame";
import { QuizGame } from "./components/QuizGame";
import { SudokuGame } from "./components/SudokuGame";
import { MemoryGame } from "./components/MemoryGame";
import { PetFeedTab } from "./components/PetFeedTab";
import { PetOutfitTab } from "./components/PetOutfitTab";
import { PetRoomTab } from "./components/PetRoomTab";
import { PetPlayTab } from "./components/PetPlayTab";

const TABS = [
  { key: "feed" as const, label: "🍖 餌" },
  { key: "outfit" as const, label: "👗 着替" },
  { key: "room" as const, label: "🏠 部屋" },
  { key: "play" as const, label: "🎮 遊ぶ" },
] as const;

export default function GamePetPage() {
  const {
    loading,
    data,
    tab, setTab,
    minigame, setMinigame,
    petName, setPetName,
    petSpecies, setPetSpecies,
    saving,
    message,
    handleCreatePet,
    handleFeed,
    handleBuy,
    submitMinigame,
    handleRoomUpdate,
    handleEquip,
    handleUpdatePet,
  } = usePetGame();

  if (loading) return <div className="p-4">読み込み中...</div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-3">
        <Link
          href="/game"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-slate-800 hover:bg-amber-200 transition"
          aria-label="ゲームに戻る"
        >
          ←
        </Link>
        <h1 className="text-xl font-bold text-amber-900">ぽっちを育てる</h1>
      </div>

      <div className="bg-violet-50 border-2 border-violet-200 rounded-xl p-4 text-center">
        <p className="text-sm font-bold text-violet-800 mb-1">
          所持ポイント: {data.points} pt
        </p>
        <p className="text-xs text-violet-600">
          記録するとポイントがたまるよ。餌や着せ替えに使おう！
        </p>
      </div>

      {!data.pet ? (
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
              <label className="block text-sm font-bold text-slate-800 mb-1">名前</label>
              <input
                type="text"
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
                placeholder="ぽっち"
                className="w-full p-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">種類（6種類から選択）</label>
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
          <PetCard
            data={data}
            petName={petName}
            petSpecies={petSpecies}
            saving={saving}
            onPetNameChange={setPetName}
            onPetSpeciesChange={setPetSpecies}
            onUpdatePet={handleUpdatePet}
          />

          {message && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-800">
              {message}
            </div>
          )}

          <div className="flex gap-2 border-b border-gray-200 pb-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`flex-1 py-2 font-bold text-sm ${
                  tab === t.key
                    ? "bg-amber-500 text-white"
                    : "bg-slate-100 text-slate-800"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "feed" && (
            <PetFeedTab data={data} onFeed={handleFeed} onBuy={handleBuy} />
          )}
          {tab === "outfit" && (
            <PetOutfitTab data={data} onEquip={handleEquip} onBuy={(id, cost) => handleBuy(id, cost)} />
          )}
          {tab === "room" && (
            <PetRoomTab data={data} onRoomUpdate={(id) => handleRoomUpdate(id)} onBuy={(id, cost) => handleBuy(id, cost)} />
          )}
          {tab === "play" && (
            <PetPlayTab onMinigame={setMinigame} />
          )}

          {minigame === "sudoku" && (
            <SudokuGame onFinish={(completed) => submitMinigame("sudoku", { completed })} onClose={() => setMinigame(null)} />
          )}
          {minigame === "memory" && (
            <MemoryGame onFinish={(pairsMatched) => submitMinigame("memory", { pairsMatched })} onClose={() => setMinigame(null)} />
          )}
          {minigame === "pet" && data.pet && (
            <PetGame petEmoji={data.pet.species_emoji} onFinish={(c) => submitMinigame("pet", { count: c })} onClose={() => setMinigame(null)} />
          )}
          {minigame === "quiz" && (
            <QuizGame onFinish={(c) => submitMinigame("quiz", { correct: c })} onClose={() => setMinigame(null)} />
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
