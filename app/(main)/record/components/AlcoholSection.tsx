import { DRINK_PRESETS, type AddedDrink } from '@/lib/alcohol-calc';

interface AlcoholSectionProps {
  onUserEdit?: () => void;
  addedDrinks: AddedDrink[];
  selectedDrinkKey: string;
  setSelectedDrinkKey: (v: string) => void;
  drinkCount: number;
  setDrinkCount: (v: number) => void;
  handleAddDrink: () => void;
  handleRemoveDrink: (id: number) => void;
  drinkStartTime: string;
  setDrinkStartTime: (v: string) => void;
  drinkEndTime: string;
  setDrinkEndTime: (v: string) => void;
  currentTotalPureAlcohol: number;
  currentTotalMl: number;
  previousAlcoholSummary: string;
  decompositionHours: number;
  soberTime: string;
  userWeight: number;
  setUserWeight: (v: number) => void;
}

export function AlcoholSection({
  onUserEdit,
  addedDrinks,
  selectedDrinkKey,
  setSelectedDrinkKey,
  drinkCount,
  setDrinkCount,
  handleAddDrink,
  handleRemoveDrink,
  drinkStartTime,
  setDrinkStartTime,
  drinkEndTime,
  setDrinkEndTime,
  currentTotalPureAlcohol,
  currentTotalMl,
  previousAlcoholSummary,
  decompositionHours,
  soberTime,
  userWeight,
  setUserWeight,
}: AlcoholSectionProps) {
  return (
    <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-yellow-800">🍺 アルコール記録</h3>
        <span className="text-sm font-bold text-yellow-700 bg-yellow-200 px-2 py-1 rounded">
          {currentTotalPureAlcohol.toFixed(1)}g / {currentTotalMl}ml
        </span>
      </div>

      {previousAlcoholSummary && (
        <p className="text-xs text-yellow-700 bg-yellow-100/80 rounded px-2 py-1">
          {previousAlcoholSummary}
        </p>
      )}

      <div className="bg-white p-3 rounded-lg border border-yellow-200">
        <label className="text-xs font-bold text-yellow-800 block mb-2">⏰ 飲酒時間</label>
        <div className="flex items-center gap-2">
          <input
            type="time"
            value={drinkStartTime}
            onChange={(e) => setDrinkStartTime(e.target.value)}
            className="flex-1 p-2 border rounded text-sm"
          />
          <span className="text-gray-500">〜</span>
          <input
            type="time"
            value={drinkEndTime}
            onChange={(e) => setDrinkEndTime(e.target.value)}
            className="flex-1 p-2 border rounded text-sm"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-yellow-800 block">🍻 プリセットから追加</label>
        <div className="flex gap-2">
          <select
            value={selectedDrinkKey}
            onChange={(e) => setSelectedDrinkKey(e.target.value)}
            className="flex-1 p-2 border rounded text-sm"
          >
            {Object.entries(DRINK_PRESETS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label} ({v.percent}%)
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            max={10}
            value={drinkCount}
            onChange={(e) => setDrinkCount(parseInt(e.target.value) || 1)}
            className="w-16 p-2 border rounded text-sm text-center"
          />
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); onUserEdit?.(); handleAddDrink(); }}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 rounded font-bold transition touch-manipulation active:scale-95"
          >
            追加
          </button>
        </div>
      </div>

      {addedDrinks.length > 0 && (
        <div className="space-y-1">
          <label className="text-xs font-bold text-yellow-800 block">📝 今日の記録</label>
          <div className="bg-white rounded-lg border border-yellow-200 divide-y divide-yellow-100">
            {addedDrinks.map((d) => (
              <div key={d.id} className="flex items-center justify-between p-2 text-sm">
                <span>
                  {d.label} x{d.count}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-yellow-700 text-xs">{d.pureAlcohol.toFixed(1)}g</span>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); onUserEdit?.(); handleRemoveDrink(d.id); }}
                    className="text-red-500 hover:text-red-700 p-1 touch-manipulation active:scale-95"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {currentTotalPureAlcohol > 0 && (
        <div className="bg-amber-100 p-3 rounded-lg border border-amber-300">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🚗</span>
            <span className="font-bold text-amber-800">アルコール分解予測</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-white p-2 rounded">
              <span className="text-xs text-gray-500 block">分解にかかる時間</span>
              <span className="font-bold text-amber-800">約 {decompositionHours.toFixed(1)} 時間</span>
            </div>
            <div className="bg-white p-2 rounded">
              <span className="text-xs text-gray-500 block">分解完了予測</span>
              <span className="font-bold text-amber-800">{soberTime}</span>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-amber-700">体重</span>
            <input
              type="number"
              value={userWeight}
              onChange={(e) => setUserWeight(parseInt(e.target.value) || 60)}
              className="w-16 p-1 border rounded text-xs text-center"
            />
            <span className="text-xs text-amber-700">kg で計算</span>
          </div>
          <p className="text-xs text-amber-600 mt-2">※ 個人差があります。運転は完全に抜けてから！</p>
        </div>
      )}
    </div>
  );
}
