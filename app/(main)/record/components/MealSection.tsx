import type React from 'react';
import type { NutritionData } from '../hooks/record-form-types';

interface MealSectionProps {
  mealDescription: string;
  setMealDescription: (v: string) => void;
  handleEstimateFromText: () => void;
  isAnalyzing: boolean;
  isDragging: boolean;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleMealImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  mealImageBase64: string | null;
  clearMealImage: () => void;
  nutritionData: NutritionData | null;
  setNutritionData: React.Dispatch<React.SetStateAction<NutritionData | null>>;
}

export function MealSection({
  mealDescription,
  setMealDescription,
  handleEstimateFromText,
  isAnalyzing,
  isDragging,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handleMealImageChange,
  mealImageBase64,
  clearMealImage,
  nutritionData,
  setNutritionData,
}: MealSectionProps) {
  return (
    <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 space-y-3">
      <h3 className="font-bold text-orange-800">🍽️ 食事メモ (AI分析用)</h3>
      <textarea
        value={mealDescription}
        onChange={(e) => setMealDescription(e.target.value)}
        className="w-full h-24 p-2 border rounded text-sm"
        placeholder="例: ラーメン大盛り、餃子。お腹いっぱい..."
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleEstimateFromText}
          disabled={!mealDescription.trim() || isAnalyzing}
          className="bg-orange-500 text-white text-sm px-3 py-2 rounded-lg font-bold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {isAnalyzing ? '🔄 推定中...' : '📝 文字から栄養を推定'}
        </button>
        <span className="text-xs text-gray-500">メモを書いて押すとカロリー・PFC等を推定</span>
      </div>

      <div className="space-y-2">
        {!mealImageBase64 && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
              isDragging
                ? 'border-orange-500 bg-orange-100 scale-[1.02]'
                : 'border-orange-300 bg-white hover:border-orange-400'
            }`}
          >
            <div className="space-y-2">
              <div className="text-4xl">{isDragging ? '📥' : '📷'}</div>
              <p className="text-sm text-gray-600">
                {isDragging ? (
                  <span className="font-bold text-orange-600">ここにドロップ！</span>
                ) : (
                  <>
                    <span className="font-bold">食事写真をドラッグ&ドロップ</span>
                    <br />
                    <span className="text-xs text-gray-400">または下のボタンから選択</span>
                  </>
                )}
              </p>
            </div>
          </div>
        )}

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="file"
            accept="image/*"
            onChange={handleMealImageChange}
            className="hidden"
          />
          <span className="bg-orange-500 text-white text-sm px-3 py-2 rounded-lg font-bold hover:bg-orange-600 transition">
            📷 {mealImageBase64 ? '写真を変更' : 'ファイルを選択'}
          </span>
        </label>

        {mealImageBase64 && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-orange-200">
              <div className="relative flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mealImageBase64}
                  alt="食事"
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <button
                  type="button"
                  onClick={clearMealImage}
                  className="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 rounded-full text-xs font-bold shadow hover:bg-red-600"
                  aria-label="写真を削除"
                >
                  ×
                </button>
              </div>
              <div className="flex-1 text-xs text-gray-500">
                {isAnalyzing ? (
                  <span className="text-orange-600 flex items-center gap-1">
                    <span className="animate-spin">🔄</span> 料理を認識中...
                  </span>
                ) : nutritionData ? (
                  <span className="text-green-600">✓ 認識完了</span>
                ) : (
                  <span>写真をアップロード済み</span>
                )}
              </div>
            </div>
          </div>
        )}

        {nutritionData && (
          <div className="bg-white p-3 rounded-lg border border-orange-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-orange-700">🍽️ 認識した料理</span>
              <span className="text-xs text-gray-400">タップで編集</span>
            </div>

            <div className="space-y-2">
              {(nutritionData.foods || []).map((food, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={food}
                    onChange={(e) => {
                      const newFoods = [...(nutritionData.foods || [])];
                      newFoods[index] = e.target.value;
                      setNutritionData({ ...nutritionData, foods: newFoods });
                    }}
                    className="flex-1 p-2 border border-orange-200 rounded text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newFoods = (nutritionData.foods || []).filter((_, i) => i !== index);
                      setNutritionData({ ...nutritionData, foods: newFoods });
                    }}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    🗑️
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const newFoods = [...(nutritionData.foods || []), ''];
                  setNutritionData({ ...nutritionData, foods: newFoods });
                }}
                className="w-full p-2 border-2 border-dashed border-orange-300 rounded text-sm text-orange-600 hover:bg-orange-50"
              >
                + 料理を追加
              </button>
            </div>

            <div className="pt-2 border-t border-orange-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-orange-700">📊 推定栄養素</span>
              </div>
              <div className="grid grid-cols-3 gap-1 text-center text-xs">
                <div className="bg-red-50 p-1.5 rounded">
                  <span className="text-gray-500 block">カロリー</span>
                  <span className="font-bold text-red-700">{nutritionData.calories ?? '—'}</span>
                  <span className="text-gray-400">kcal</span>
                </div>
                <div className="bg-blue-50 p-1.5 rounded">
                  <span className="text-gray-500 block">タンパク質</span>
                  <span className="font-bold text-blue-700">{nutritionData.protein ?? '—'}</span>
                  <span className="text-gray-400">g</span>
                </div>
                <div className="bg-yellow-50 p-1.5 rounded">
                  <span className="text-gray-500 block">脂質</span>
                  <span className="font-bold text-yellow-700">{nutritionData.fat ?? '—'}</span>
                  <span className="text-gray-400">g</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1 text-center text-xs mt-1">
                <div className="bg-green-50 p-1.5 rounded">
                  <span className="text-gray-500 block">炭水化物</span>
                  <span className="font-bold text-green-700">{nutritionData.carbs ?? '—'}</span>
                  <span className="text-gray-400">g</span>
                </div>
                <div className="bg-purple-50 p-1.5 rounded">
                  <span className="text-gray-500 block">食物繊維</span>
                  <span className="font-bold text-purple-700">{nutritionData.fiber ?? '—'}</span>
                  <span className="text-gray-400">g</span>
                </div>
                <div className="bg-gray-50 p-1.5 rounded">
                  <span className="text-gray-500 block">塩分</span>
                  <span className="font-bold text-gray-700">{nutritionData.salt ?? '—'}</span>
                  <span className="text-gray-400">g</span>
                </div>
              </div>
            </div>

            {nutritionData.notes && (
              <p className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                💡 {nutritionData.notes}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
