import type { AiPersonality } from '../hooks/record-form-types';

interface ResultModalProps {
  msg: string;
  /** AI人格（DB由来で未知の値の場合は string も許容し、表示時はデフォルトにフォールバック） */
  aiPersonality: AiPersonality | string;
  onClose: () => void;
}

export function ResultModal({ msg, aiPersonality, onClose }: ResultModalProps) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl relative animate-slide-up border-2 border-slate-200">
        <div className="mb-4 p-3 rounded-xl text-center bg-slate-50 border border-slate-200">
          <span className="text-2xl">🎉</span>
          <p className="font-bold text-lg text-slate-700">ポイント獲得！</p>
          <p className="font-bold text-slate-600">+10 pt</p>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-4xl">
            {aiPersonality === 'asuka' ? '💙' : aiPersonality === 'amayama' ? '💕' : aiPersonality === 'ikemen' ? '😎' : '💋'}
          </span>
          <h3 className="text-xl font-bold text-slate-800">
            {aiPersonality === 'asuka'
              ? 'あすかからの言葉'
              : aiPersonality === 'amayama'
                ? 'デレデレからの言葉'
                : aiPersonality === 'ikemen'
                  ? 'イケメンコーチからの言葉'
                  : 'ツンデレコーチからの言葉'}
          </h3>
        </div>
        <div className="p-4 rounded-xl text-gray-800 leading-relaxed whitespace-pre-wrap max-h-[60vh] overflow-y-auto bg-slate-50 border border-slate-100">
          {msg}
        </div>
        <button
          onClick={onClose}
          className="mt-6 w-full bg-slate-700 text-white py-3 rounded-xl font-medium hover:bg-slate-600 transition"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
