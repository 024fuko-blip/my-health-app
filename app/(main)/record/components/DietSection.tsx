interface DietSectionProps {
  /** 体重は基本情報で入力（ここでは参照表示のみ） */
  weight: string;
  onUserEdit?: () => void;
  bodyFat: string;
  setBodyFat: (v: string) => void;
  calories: string;
  setCalories: (v: string) => void;
  protein: string;
  setProtein: (v: string) => void;
  steps: string;
  setSteps: (v: string) => void;
  exerciseMinutes: string;
  setExerciseMinutes: (v: string) => void;
}

export function DietSection({
  weight,
  onUserEdit,
  bodyFat,
  setBodyFat,
  calories,
  setCalories,
  protein,
  setProtein,
  steps,
  setSteps,
  exerciseMinutes,
  setExerciseMinutes,
}: DietSectionProps) {
  return (
    <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 space-y-3">
      <h3 className="font-bold text-purple-800">💪 ボディメイク</h3>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-bold">体重(kg)</label>
          <div className="p-2 border rounded bg-purple-100/50 text-gray-600 text-sm">
            {weight || '—'}（基本情報で入力）
          </div>
        </div>
        <div>
          <label className="text-xs font-bold">体脂肪(%)</label>
          <input
            type="number"
            step="0.1"
            value={bodyFat}
            onChange={(e) => { onUserEdit?.(); setBodyFat(e.target.value); }}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="text-xs font-bold">カロリー</label>
          <input
            type="number"
            value={calories}
            onChange={(e) => { onUserEdit?.(); setCalories(e.target.value); }}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="text-xs font-bold">タンパク質(g)</label>
          <input
            type="number"
            step="0.1"
            value={protein}
            onChange={(e) => { onUserEdit?.(); setProtein(e.target.value); }}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="text-xs font-bold">歩数</label>
          <input
            type="number"
            value={steps}
            onChange={(e) => { onUserEdit?.(); setSteps(e.target.value); }}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="text-xs font-bold">運動時間(分)</label>
          <input
            type="number"
            value={exerciseMinutes}
            onChange={(e) => { onUserEdit?.(); setExerciseMinutes(e.target.value); }}
            className="w-full p-2 border rounded"
          />
        </div>
      </div>
    </div>
  );
}
