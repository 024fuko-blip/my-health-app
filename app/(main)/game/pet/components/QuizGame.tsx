"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api-client";

interface QuizGameProps {
  onFinish: (correct: boolean) => void;
  onClose: () => void;
}

interface Quiz {
  question: string;
  choices: string[];
  correctIndex: number;
}

export function QuizGame({ onFinish, onClose }: QuizGameProps) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    apiFetch("/api/pet/minigame/quiz")
      .then((r) => r.json())
      .then((data) => {
        setQuiz({
          question: data.question,
          choices: data.choices ?? [],
          correctIndex: data.correctIndex ?? 0,
        });
      })
      .catch(() =>
        setQuiz({
          question: "健康的な生活のために大切なのは？",
          choices: ["バランスの良い食事", "夜更かし", "運動しない"],
          correctIndex: 0,
        })
      )
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (index: number) => {
    if (selected !== null) return;
    setSelected(index);
    const correct = index === (quiz?.correctIndex ?? 0);
    setTimeout(() => onFinish(correct), 1000);
  };

  if (loading || !quiz) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white p-6 max-w-sm w-full">
          <p className="text-center">クイズを読み込み中...</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 w-full py-2 border border-gray-300"
          >
            やめる
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white p-6 max-w-sm w-full">
        <h3 className="font-bold text-lg mb-4">健康クイズ</h3>
        <p className="text-gray-800 mb-4">{quiz.question}</p>
        <div className="space-y-2">
          {quiz.choices.map((choice, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(i)}
              disabled={selected !== null}
              className={`w-full p-3 text-left border-2 ${
                selected === null
                  ? "border-gray-200 hover:border-amber-400"
                  : i === quiz.correctIndex
                    ? "border-green-500 bg-green-50"
                    : selected === i
                      ? "border-red-400 bg-red-50"
                      : "border-gray-200"
              } disabled:cursor-default`}
            >
              {choice}
              {selected !== null && i === quiz.correctIndex && " ✓"}
            </button>
          ))}
        </div>
        {selected !== null && (
          <p className="mt-4 text-sm text-center text-gray-600">
            {selected === quiz.correctIndex ? "正解！" : "残念..."}
          </p>
        )}
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full py-2 border border-gray-300"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
