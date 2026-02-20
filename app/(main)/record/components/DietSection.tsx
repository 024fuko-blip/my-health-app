interface DietSectionProps {
  weight: string;
  setWeight: (v: string) => void;
  onUserEdit?: () => void;
  bodyFat: string;
  setBodyFat: (v: string) => void;
  calories: string;
  setCalories: (v: string) => void;
  protein: string;
  setProtein: (v: string) => void;
  steps: string;
  setSteps: (v: string) => void;
}

export function DietSection({
  weight,
  setWeight,
  onUserEdit,
  bodyFat,
  setBodyFat,
  calories,
  setCalories,
  protein,
  setProtein,
  steps,
  setSteps,
}: DietSectionProps) {
  return (
    <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 space-y-3">
      <h3 className="font-bold text-purple-800">💪 ボディメイク</h3>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-bold">体重(kg)</label>
          <input
            type="number"
            step="0.1"
            value={weight}
            onChange={(e) => { onUserEdit?.(); setWeight(e.target.value); }}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="text-xs font-bold">体脂肪(%)</label>
          <input
            type="number"
            step="0.1"
            value={bodyFat}
            onChange={(e) => setBodyFat(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="text-xs font-bold">カロリー</label>
          <input
            type="number"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="text-xs font-bold">タンパク質(g)</label>
          <input
            type="number"
            step="0.1"
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="text-xs font-bold">歩数</label>
          <input
            type="number"
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
      </div>
    </div>
  );
}
