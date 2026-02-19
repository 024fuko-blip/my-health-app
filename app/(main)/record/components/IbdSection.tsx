import type React from 'react';

interface IbdSectionProps {
  temperature: string;
  setTemperature: (v: string) => void;
  weight: string;
  setWeight: (v: string) => void;
  toiletCount: number;
  setToiletCount: React.Dispatch<React.SetStateAction<number>>;
  painLevel: number;
  setPainLevel: (v: number) => void;
}

export function IbdSection({
  temperature,
  setTemperature,
  weight,
  setWeight,
  toiletCount,
  setToiletCount,
  painLevel,
  setPainLevel,
}: IbdSectionProps) {
  return (
    <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 space-y-4">
      <h3 className="font-bold text-blue-800">💊 IBDチェック</h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-blue-700 block mb-1">🌡️ 体温</label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              placeholder="36.5"
              className="flex-1 p-2 border rounded text-sm text-center"
            />
            <span className="text-sm text-gray-500">℃</span>
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-blue-700 block mb-1">⚖️ 体重</label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="60.0"
              className="flex-1 p-2 border rounded text-sm text-center"
            />
            <span className="text-sm text-gray-500">kg</span>
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-blue-700 block mb-2">🚻 トイレ回数</label>
        <div className="flex items-center justify-center gap-4 bg-white p-3 rounded-lg border border-blue-200">
          <button
            type="button"
            onClick={() => setToiletCount((c) => Math.max(0, c - 1))}
            className="w-12 h-12 rounded-full bg-blue-100 text-blue-800 text-2xl font-bold hover:bg-blue-200 transition"
          >
            −
          </button>
          <span className="text-4xl font-bold text-blue-800 w-16 text-center">{toiletCount}</span>
          <button
            type="button"
            onClick={() => setToiletCount((c) => c + 1)}
            className="w-12 h-12 rounded-full bg-blue-100 text-blue-800 text-2xl font-bold hover:bg-blue-200 transition"
          >
            +
          </button>
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-blue-700 block mb-2">😣 腹痛レベル</label>
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setPainLevel(level)}
              className={`py-3 rounded-lg border-2 font-bold transition ${
                painLevel === level
                  ? level <= 2
                    ? 'border-green-500 bg-green-100 text-green-800'
                    : level === 3
                      ? 'border-yellow-500 bg-yellow-100 text-yellow-800'
                      : 'border-red-500 bg-red-100 text-red-800'
                  : 'border-gray-200 bg-white text-gray-500 hover:border-blue-300'
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
        <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
          <span>なし</span>
          <span>激痛</span>
        </div>
      </div>
    </div>
  );
}
