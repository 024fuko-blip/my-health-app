"use client";

import { useState, useEffect, useCallback } from "react";
import { generatePuzzle, validateSolution } from "@/lib/sudoku-6x6";

interface SudokuGameProps {
  onFinish: (completed: boolean) => void;
  onClose: () => void;
}

export function SudokuGame({ onFinish, onClose }: SudokuGameProps) {
  const [puzzle, setPuzzle] = useState<number[][] | null>(null);
  const [grid, setGrid] = useState<number[][]>([]);
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const { puzzle: p, solution: s } = generatePuzzle();
    setPuzzle(p);
    setGrid(p.map((row) => [...row]));
    (window as { __sudokuSolution?: number[][] }).__sudokuSolution = s;
    return () => {
      delete (window as { __sudokuSolution?: number[][] }).__sudokuSolution;
    };
  }, []);

  const isFixed = useCallback(
    (r: number, c: number) => puzzle != null && puzzle[r][c] !== 0,
    [puzzle]
  );

  const handleCellClick = (r: number, c: number) => {
    if (completed || !puzzle || isFixed(r, c)) return;
    setSelected({ r, c });
  };

  const handleNumber = (n: number) => {
    if (completed || !puzzle || !selected) return;
    const next = grid.map((row, ri) =>
      row.map((cell, ci) =>
        ri === selected.r && ci === selected.c ? n : cell
      )
    );
    setGrid(next);
    setSelected(null);
    const filled = next.every((row) => row.every((c) => c !== 0));
    if (filled && validateSolution(puzzle, next)) {
      setCompleted(true);
      setTimeout(() => onFinish(true), 800);
    }
  };

  const handleClear = () => {
    if (completed || !selected || isFixed(selected.r, selected.c)) return;
    const next = grid.map((row, ri) =>
      row.map((cell, ci) =>
        ri === selected.r && ci === selected.c ? 0 : cell
      )
    );
    setGrid(next);
    setSelected(null);
  };

  if (!puzzle || puzzle.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white p-6 max-w-sm w-full">
          <p className="text-center">数独を生成中...</p>
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
      <div className="bg-white p-4 max-w-sm w-full">
        <h3 className="font-bold text-lg mb-3">6×6 数独</h3>
        <p className="text-sm text-slate-700 mb-3">
          1〜6を各行・各列・各2×3ブロックに1つずつ入れてね
        </p>
        <div className="grid grid-cols-6 gap-0.5 border-2 border-gray-800">
          {grid.map((row, r) =>
            row.map((cell, c) => {
              const isBoxRight = c === 2 || c === 5;
              const isBoxBottom = r === 1 || r === 3;
              const fixed = isFixed(r, c);
              const sel =
                selected?.r === r && selected?.c === c;
              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => handleCellClick(r, c)}
                  disabled={fixed}
                  className={`aspect-square flex items-center justify-center text-lg font-bold border-gray-300 ${
                    fixed ? "bg-amber-100 text-gray-800" : "bg-white hover:bg-amber-50"
                  } ${sel ? "ring-2 ring-amber-500" : ""} ${
                    isBoxRight ? "border-r-2 border-r-gray-800" : "border-r"
                  } ${isBoxBottom ? "border-b-2 border-b-gray-800" : "border-b"}`}
                >
                  {cell || ""}
                </button>
              );
            })
          )}
        </div>
        <div className="flex flex-wrap gap-2 mt-3 justify-center">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => handleNumber(n)}
              disabled={!selected || completed}
              className="w-10 h-10 rounded-lg bg-amber-200 font-bold hover:bg-amber-300 disabled:opacity-50"
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            disabled={!selected || completed}
            className="px-3 py-1 rounded-lg border border-gray-400 text-sm disabled:opacity-50"
          >
            消す
          </button>
        </div>
        {completed && (
          <p className="mt-3 text-center font-bold text-green-600">クリア！</p>
        )}
        <button
          type="button"
          onClick={() => {
            if (!completed) onFinish(false);
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
