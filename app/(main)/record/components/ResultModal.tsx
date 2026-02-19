import type { AiPersonality } from '../hooks/record-form-types';

interface ResultModalProps {
  msg: string;
  /** AI人格（DB由来で未知の値の場合は string も許容し、表示時はデフォルトにフォールバック） */
  aiPersonality: AiPersonality | string;
  onClose: () => void;
}

export function ResultModal({ msg, aiPersonality, onClose }: ResultModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border-4 border-pink-400 relative animate-slide-up">
        <div className="mb-4 p-3 bg-amber-100 border-2 border-amber-400 rounded-xl text-center">
          <span className="text-2xl">🎉</span>
          <p className="font-black text-amber-800 text-lg">ポイント獲得！</p>
          <p className="text-amber-600 font-bold">+10 pt</p>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-4xl">
            {aiPersonality === 'amayama' ? '💕' : aiPersonality === 'ikemen' ? '😎' : '💋'}
          </span>
          <h3 className="text-xl font-bold text-pink-800">
            {aiPersonality === 'amayama'
              ? 'デレデレからの言葉'
              : aiPersonality === 'ikemen'
                ? 'イケメンコーチからの言葉'
                : 'ツンデレコーチからの言葉'}
          </h3>
        </div>
        <div className="bg-pink-50 p-4 rounded-xl text-gray-800 leading-relaxed whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
          {msg}
        </div>
        <button
          onClick={onClose}
          className="mt-6 w-full bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-gray-800"
        >
          わかったわよ（閉じる）
        </button>
      </div>
    </div>
  );
}
