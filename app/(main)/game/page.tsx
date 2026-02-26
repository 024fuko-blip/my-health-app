"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ensureSession, handleUnauthorized, apiFetch } from "@/lib/api-client";

const DEFAULT_BADGES = [
  { id: "streak_3", name: "3日連続記録", emoji: "🔥", earned: false, earnedAt: null as string | null },
  { id: "streak_7", name: "7日連続記録", emoji: "⭐", earned: false, earnedAt: null },
  { id: "streak_14", name: "2週間連続", emoji: "🌟", earned: false, earnedAt: null },
  { id: "streak_30", name: "30日連続記録", emoji: "👑", earned: false, earnedAt: null },
  { id: "first_log", name: "初記録", emoji: "🎉", earned: false, earnedAt: null },
];

interface Badge {
  id: string;
  name: string;
  emoji?: string;
  earned: boolean;
  earnedAt: string | null;
}

interface GameStats {
  total_points: number;
  current_streak: number;
  longest_streak: number;
  last_record_date: string | null;
  badges: Badge[];
}

interface PetSummary {
  pet_name: string;
  species_emoji: string;
  current_outfit_emoji: string | null;
  happiness: number;
}

const defaultStats: GameStats = {
  total_points: 0,
  current_streak: 0,
  longest_streak: 0,
  last_record_date: null,
  badges: DEFAULT_BADGES,
};

export default function GamePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<GameStats>(defaultStats);
  const [pet, setPet] = useState<PetSummary | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const [showExplanation, setShowExplanation] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setFetchError(false);
      const session = await ensureSession(router);
      if (!session) return;
      try {
        const [statsRes, petRes] = await Promise.all([
          apiFetch("/api/game-stats"),
          apiFetch("/api/pet"),
        ]);
        if (statsRes.status === 401 || petRes.status === 401) {
          handleUnauthorized(router);
          setLoading(false);
          return;
        }
        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data);
        } else {
          setFetchError(true);
        }
        if (petRes.ok) {
          const data = await petRes.json();
          if (data.pet) setPet(data.pet);
        }
      } catch {
        setFetchError(true);
      }
      setLoading(false);
    };
    fetchData();
  }, [router]);

  if (loading) return <div className="p-4">読み込み中...</div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-gray-700 hover:bg-amber-200 transition"
          aria-label="戻る"
        >
          ←
        </button>
        <h1 className="text-xl font-bold text-amber-900">ゲーム</h1>
      </div>

      {/* 初回・常に表示できるゲーム説明 */}
      <div className="bg-amber-50 border-2 border-amber-200 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowExplanation((v) => !v)}
          className="w-full px-4 py-3 flex items-center justify-between text-left"
        >
          <span className="font-bold text-amber-900">📖 ゲームの説明</span>
          <span className="text-amber-600">{showExplanation ? "閉じる ▼" : "開く ▶"}</span>
        </button>
        {showExplanation && (
          <div className="px-4 pb-4 pt-0 text-sm text-gray-700 space-y-2 border-t border-amber-200/80">
            <p>
              <strong>記録を続ける</strong>とポイントがもらえるよ。連続で記録すると<strong>ストリーク</strong>が伸びて、バッジがもらえる。
            </p>
            <p>
              <strong>ぽっち</strong>は、ねこ・いぬ・うさぎ・カピバラ・ハムスター・アヒルの<strong>6種類</strong>から選べるペット。たまったポイントで<strong>餌</strong>や<strong>着せ替え</strong>を買って、育てていこう！
            </p>
            <p className="text-xs text-gray-700">
              まだペットを迎えてない場合は下の「ぽっち」カードから種類を選んで迎えよう。
            </p>
          </div>
        )}
      </div>

      {fetchError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-800 flex items-center justify-between gap-2">
          <span>データの取得に失敗しました</span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-red-600 font-bold underline"
          >
            再読み込み
          </button>
        </div>
      )}

      {/* ぽっちセクション */}
      <div className="space-y-2">
        <Link
          href="/game/pet"
          className="block bg-gradient-to-r from-amber-50 to-violet-50 border-2 border-amber-200 p-4 hover:border-amber-300 transition"
        >
          <div className="flex items-center gap-4">
            <div className="text-5xl">
              {pet?.current_outfit_emoji && (
                <span className="mr-0.5">{pet.current_outfit_emoji}</span>
              )}
              <span>{pet?.species_emoji ?? "🐱"}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-gray-800">
                {pet ? pet.pet_name : "ぽっち"}
              </h2>
              <p className="text-sm text-gray-600">
                {pet
                  ? `幸福度 ${pet.happiness} · 餌・着替・部屋・ミニゲームで育てよう`
                  : "タップしてぽっちを迎えよう"}
              </p>
            </div>
            <span className="text-gray-600">→</span>
          </div>
        </Link>
        {pet && (
          <Link
            href="/game/pet?tab=play"
            className="block py-2 px-4 bg-violet-100 border border-violet-200 text-violet-800 text-sm font-bold text-center"
          >
            🎮 ミニゲームで遊ぶ
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-black text-amber-600">{stats.current_streak}</p>
          <p className="text-xs font-bold text-amber-800">連続記録（日）</p>
        </div>
        <div className="bg-violet-50 border-2 border-violet-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-black text-violet-600">{stats.total_points}</p>
          <p className="text-xs font-bold text-violet-800">ポイント</p>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <p className="text-sm font-bold text-gray-700 mb-1">最長ストリーク</p>
        <p className="text-2xl font-bold text-gray-900">{stats.longest_streak} 日</p>
      </div>

      <div>
        <h2 className="font-bold text-gray-800 mb-3">Badges</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {stats.badges.map((b) => (
            <div
              key={b.id}
              className={`rounded-xl border-2 p-3 text-center transition ${
                b.earned
                  ? "bg-amber-50 border-amber-300"
                  : "bg-gray-50 border-gray-200 opacity-60"
              }`}
            >
              <span className="text-2xl block mb-1">{b.emoji ?? "?"}</span>
              <p className="text-xs font-bold text-gray-800">{b.name}</p>
              {b.earned && b.earnedAt && (
                <p className="text-[10px] text-amber-700 mt-0.5">
                  {b.earnedAt} 獲得
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <Link
        href="/record"
        className="block w-full py-3 bg-amber-500 text-white font-bold rounded-xl text-center hover:bg-amber-600"
      >
        記録してポイントを稼ぐ
      </Link>
    </div>
  );
}
