import { EMOTIONS } from '@/lib/record-constants';

interface MentalSectionProps {
  selectedEmotion: string;
  setSelectedEmotion: (v: string) => void;
  sleepQuality: string;
  setSleepQuality: (v: string) => void;
  mentalDiary: string;
  setMentalDiary: (v: string) => void;
}

export function MentalSection({
  selectedEmotion,
  setSelectedEmotion,
  sleepQuality,
  setSleepQuality,
  mentalDiary,
  setMentalDiary,
}: MentalSectionProps) {
  return (
    <div className="bg-green-50 p-4 rounded-xl border border-green-200 space-y-4">
      <h3 className="font-bold text-green-800">🌿 今日の気持ち</h3>

      <div>
        <label className="text-xs font-bold text-green-700 block mb-2">今の気分は？</label>
        <div className="grid grid-cols-4 gap-2">
          {EMOTIONS.map((emotion) => (
            <button
              key={emotion.id}
              type="button"
              onClick={() =>
                setSelectedEmotion(selectedEmotion === emotion.label ? '' : emotion.label)
              }
              className={`p-2 rounded-lg border-2 transition-all ${
                selectedEmotion === emotion.label
                  ? 'border-green-500 bg-green-100 scale-105'
                  : 'border-gray-200 bg-white hover:border-green-300'
              }`}
            >
              <span className="text-2xl block">{emotion.emoji}</span>
              <span className="text-xs text-gray-600">{emotion.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-green-700 block mb-1">😴 睡眠の質</label>
        <div className="flex gap-2">
          {['悪い', '普通', '良い'].map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setSleepQuality(q)}
              className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition ${
                sleepQuality === q
                  ? 'border-green-500 bg-green-100 text-green-800'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-green-300'
              }`}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-green-700 block mb-1">📝 ひとこと日記</label>
        <textarea
          value={mentalDiary}
          onChange={(e) => setMentalDiary(e.target.value)}
          placeholder="今日あったこと、感じたことを自由に..."
          className="w-full p-3 border border-green-200 rounded-lg text-sm h-20 resize-none"
        />
      </div>
    </div>
  );
}
