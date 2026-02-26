"use client";

import { useState, useEffect, useCallback } from "react";

interface MemoryGameProps {
  onFinish: (pairsMatched: number) => void;
  onClose: () => void;
}

const CARD_PAIRS: [string, string][] = [
  ["体調", "健康"],
  ["睡眠", "休息"],
  ["食事", "栄養"],
  ["運動", "フィットネス"],
  ["ストレス", "リラックス"],
  ["水分", "ハイドレーション"],
  ["薬", "服薬"],
  ["記録", "ログ"],
];

interface Card {
  id: number;
  label: string;
  pairId: number;
}

function createShuffledCards(): Card[] {
  const cards: Card[] = [];
  CARD_PAIRS.forEach(([a, b], pairId) => {
    cards.push({ id: pairId * 2, label: a, pairId });
    cards.push({ id: pairId * 2 + 1, label: b, pairId });
  });
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

export function MemoryGame({ onFinish, onClose }: MemoryGameProps) {
  const [cards] = useState(() => createShuffledCards());
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [blocked, setBlocked] = useState(false);

  const handleClick = useCallback(
    (index: number) => {
      if (blocked || flipped.includes(index) || matched.has(cards[index].pairId)) return;
      const next = [...flipped, index];
      setFlipped(next);
      if (next.length === 2) {
        setBlocked(true);
        const [a, b] = next;
        const pairA = cards[a].pairId;
        const pairB = cards[b].pairId;
        if (pairA === pairB) {
          setMatched((m) => new Set([...m, pairA]));
          setFlipped([]);
          setBlocked(false);
        } else {
          setTimeout(() => {
            setFlipped([]);
            setBlocked(false);
          }, 800);
        }
      }
    },
    [blocked, flipped, matched, cards]
  );

  useEffect(() => {
    if (matched.size === CARD_PAIRS.length) {
      setTimeout(() => onFinish(CARD_PAIRS.length), 600);
    }
  }, [matched.size, onFinish]);

  const isComplete = matched.size === CARD_PAIRS.length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white p-4 max-w-sm w-full">
        <h3 className="font-bold text-lg mb-2">神経衰弱</h3>
        <p className="text-xs text-gray-600 mb-3">
          ペアのカードを探してめくってね（健康用語）
        </p>
        <div className="grid grid-cols-4 gap-2">
          {cards.map((card, index) => {
            const isFlipped = flipped.includes(index) || matched.has(card.pairId);
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => handleClick(index)}
                disabled={blocked && !isFlipped}
                className={`aspect-square flex items-center justify-center text-sm font-bold rounded-lg border-2 transition ${
                  isFlipped
                    ? "bg-amber-100 border-amber-400 text-gray-800"
                    : "bg-violet-100 border-violet-300 text-violet-800 hover:bg-violet-200"
                } disabled:opacity-70`}
              >
                {isFlipped ? card.label : "?"}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-sm text-center text-gray-600">
          マッチ: {matched.size} / {CARD_PAIRS.length}
        </p>
        {isComplete && (
          <p className="mt-2 text-center font-bold text-green-600">全クリア！</p>
        )}
        <button
          type="button"
          onClick={() => {
            onFinish(matched.size);
            onClose();
          }}
          className="mt-4 w-full py-2 border border-gray-300"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
