import type React from 'react';

interface IbdSectionProps {
  onUserEdit?: () => void;
  toiletCount: number;
  setToiletCount: React.Dispatch<React.SetStateAction<number>>;
  painLevel: number;
  setPainLevel: (v: number) => void;
}

export function IbdSection({
  onUserEdit,
  toiletCount,
  setToiletCount,
  painLevel,
  setPainLevel,
}: IbdSectionProps) {
  return (
    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
      <h3 className="font-bold text-slate-700">IBDチェック</h3>

      <div>
        <label className="text-xs font-bold text-slate-700 block mb-2">トイレ回数</label>
        <div className="flex items-center justify-center gap-4 bg-white p-3 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); onUserEdit?.(); setToiletCount((c) => Math.max(0, c - 1)); }}
            className="w-12 h-12 rounded-full bg-slate-100 text-slate-800 text-2xl font-bold hover:bg-slate-200 transition record-btn touch-manipulation active:scale-95"
          >
            −
          </button>
          <span className="text-4xl font-bold text-slate-800 w-16 text-center">{toiletCount}</span>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); onUserEdit?.(); setToiletCount((c) => c + 1); }}
            className="w-12 h-12 rounded-full bg-slate-100 text-slate-800 text-2xl font-bold hover:bg-slate-200 transition record-btn touch-manipulation active:scale-95"
          >
            +
          </button>
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-slate-700 block mb-2">腹痛レベル</label>
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((level) => (
            <button
              key={level}
              type="button"
              onClick={(e) => { e.preventDefault(); onUserEdit?.(); setPainLevel(level); }}
              className={`py-3 rounded-lg border-2 font-bold transition record-btn touch-manipulation active:scale-95 ${
                painLevel === level
                  ? level <= 2
                    ? 'border-green-500 bg-green-100 text-green-800'
                    : level === 3
                      ? 'border-yellow-500 bg-yellow-100 text-yellow-800'
                      : 'border-red-500 bg-red-100 text-red-800'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
              }`}
            >
              <span className="text-lg block">
                {level === 1 && '😊'}
                {level === 2 && '🙂'}
                {level === 3 && '😐'}
                {level === 4 && '😣'}
                {level === 5 && '😭'}
              </span>
              <span className="text-xs">{level}</span>
            </button>
          ))}
        </div>
        <div className="flex justify-between text-xs text-slate-400 mt-1 px-1">
          <span>なし</span>
          <span>激痛</span>
        </div>
      </div>
    </div>
  );
}
