"use client";

import Link from "next/link";
import Image from "next/image";
import { PET_SPECIES } from "@/lib/pet-shop";
import { getImagesForSpecies } from "@/lib/pet-health";
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
import { PetLiquidTab } from "./components/PetLiquidTab";

const TABS = [
  { key: "feed" as const, label: "🍖 餌" },
  { key: "outfit" as const, label: "👗 着替" },
  { key: "room" as const, label: "🏠 部屋" },
  { key: "play" as const, label: "🎮 遊ぶ" },
  { key: "liquid" as const, label: "💤 液体" },
] as const;

export default function GamePetPage() {
  const {
    loading,
    data,
    healthLevel,
    healthScore,
    specialFlags,
    scoreBreakdown,
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
        <div className="rounded-2xl overflow-hidden shadow-lg border border-white/40">
          {/* プレビューエリア */}
          <div className="relative bg-gradient-to-b from-sky-200 via-sky-100 to-emerald-50 pt-6 pb-10">
            <div className="flex justify-center">
              {(() => {
                const previewImages = getImagesForSpecies(petSpecies);
                const previewSrc = previewImages[1];
                const speciesInfo = PET_SPECIES.find((s) => s.id === petSpecies);
                return previewSrc.startsWith("/pets/") ? (
                  <Image
                    src={previewSrc}
                    alt={speciesInfo?.name ?? "ペット"}
                    width={200}
                    height={200}
                    className="object-contain drop-shadow-lg"
                    priority
                  />
                ) : (
                  <span className="text-[120px] leading-none drop-shadow-lg">
                    {speciesInfo?.emoji ?? "🐾"}
                  </span>
                );
              })()}
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-r from-lime-400 to-green-500 opacity-60" />
            <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-t from-white/30 to-transparent" />
          </div>

          {/* フォームエリア */}
          <div className="bg-white px-5 py-5 space-y-4">
            {message && (
              <div className={`px-3 py-2 rounded-lg text-sm ${
                message.includes("失敗") || message.includes("エラー")
                  ? "bg-red-50 border border-red-200 text-red-800"
                  : "bg-green-50 border border-green-200 text-green-800"
              }`}>
                {message}
              </div>
            )}
            <div className="text-center">
              <h2 className="font-bold text-lg text-amber-900">ぽっちを迎えよう</h2>
              <p className="text-xs text-amber-700 mt-1">
                個性的でかわいい<strong>6種類</strong>から1匹選んで、名前をつけて迎えよう！
              </p>
            </div>
            <form onSubmit={handleCreatePet} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">名前</label>
                <input
                  type="text"
                  value={petName}
                  onChange={(e) => setPetName(e.target.value)}
                  placeholder="ぽっち"
                  className="w-full p-2.5 border rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">種類</label>
                <div className="grid grid-cols-3 gap-2">
                  {PET_SPECIES.map((s) => {
                    const speciesImages = getImagesForSpecies(s.id);
                    const hasImage = speciesImages[1].startsWith("/pets/");
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setPetSpecies(s.id)}
                        className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                          petSpecies === s.id
                            ? "border-amber-500 bg-amber-50 shadow-md scale-[1.03]"
                            : "border-gray-200 bg-white hover:border-amber-300"
                        }`}
                      >
                        {hasImage ? (
                          <Image
                            src={speciesImages[1]}
                            alt={s.name}
                            width={56}
                            height={56}
                            className="object-contain"
                          />
                        ) : (
                          <span className="text-4xl leading-none">{s.emoji}</span>
                        )}
                        <span className="text-xs">{s.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-amber-500 text-white font-bold rounded-xl disabled:opacity-50 hover:bg-amber-600 transition"
              >
                {saving ? "作成中..." : "ぽっちを迎える"}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <>
          <PetCard
            data={data}
            healthLevel={healthLevel}
            healthScore={healthScore}
            specialFlags={specialFlags}
            scoreBreakdown={scoreBreakdown}
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

          <div className="flex gap-2 border-b border-gray-200 pb-2 overflow-x-auto scrollbar-hide">
            {(petSpecies === "cat" ? TABS : TABS.filter((t) => t.key !== "liquid")).map(
              (t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`flex-1 min-w-14 py-2 font-bold text-sm shrink-0 ${
                  tab === t.key
                    ? "bg-amber-500 text-white"
                    : "bg-slate-100 text-slate-800"
                }`}
              >
                {t.label}
              </button>
            )
            )}
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
          {tab === "liquid" && petSpecies === "cat" && (
            <PetLiquidTab speciesEmoji={data.pet?.species_emoji ?? "🐱"} />
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
