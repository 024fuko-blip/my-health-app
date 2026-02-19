import type React from 'react';
import type { Medication } from '../hooks/record-form-types';

interface BasicInfoSectionProps {
  generalMood: number;
  setGeneralMood: (v: number) => void;
  medications: Medication[];
  medicationTaken: Record<string, boolean>;
  setMedicationTaken: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  gender: string;
  periodStatus: string;
  setPeriodStatus: (v: string) => void;
  skinCondition: number;
  setSkinCondition: (v: number) => void;
  /** 生理が来た時に lastPeriodDate を更新するコールバック */
  onPeriodStart?: (date: string) => Promise<void>;
  /** 生理終了時に periodDuration を更新するコールバック */
  onPeriodEnd?: (startDate: string, duration: number) => Promise<void>;
  /** 生理ボタン選択をその日の記録に即時保存（保持用） */
  onPeriodStatusSave?: (date: string, status: string) => Promise<void>;
  lastPeriodDate?: string;
  /** 選択中の日付（即時保存時に使用） */
  selectedDate?: string;
}

export function BasicInfoSection({
  generalMood,
  setGeneralMood,
  medications,
  medicationTaken,
  setMedicationTaken,
  gender,
  periodStatus,
  setPeriodStatus,
  skinCondition,
  setSkinCondition,
  onPeriodStart,
  onPeriodEnd,
  onPeriodStatusSave,
  lastPeriodDate,
  selectedDate,
}: BasicInfoSectionProps) {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
      <div>
        <label className="text-xs font-bold text-gray-700 block mb-2">😊 体調 (1-5)</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setGeneralMood(level)}
              className={`flex-1 py-2 rounded-lg border-2 font-bold transition ${
                generalMood === level
                  ? 'border-blue-500 bg-blue-100 text-blue-800'
                  : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-blue-300'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {medications.length > 0 && (
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-blue-800 text-sm">💊 今日の薬</span>
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                medications
                  .flatMap((med) => med.timings.map((t) => `${med.id}_${t}`))
                  .every((key) => medicationTaken[key])
                  ? 'bg-green-200 text-green-800'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {
                medications
                  .flatMap((med) => med.timings.map((t) => `${med.id}_${t}`))
                  .filter((key) => medicationTaken[key]).length
              }
              /{medications.flatMap((med) => med.timings).length}
            </span>
          </div>

          {medications.map((med) => (
            <div key={med.id} className="bg-white p-2 rounded-lg border border-blue-100">
              <div className="text-xs font-bold text-blue-700 mb-2">{med.name}</div>
              <div className="grid grid-cols-4 gap-1">
                {med.timings.map((timing) => {
                  const key = `${med.id}_${timing}`;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        setMedicationTaken((prev) => ({
                          ...prev,
                          [key]: !prev[key],
                        }))
                      }
                      className={`py-1.5 rounded-lg border-2 font-bold text-xs transition ${
                        medicationTaken[key]
                          ? 'border-green-500 bg-green-100 text-green-800'
                          : 'border-gray-200 bg-gray-50 text-gray-400'
                      }`}
                    >
                      {timing}
                      {medicationTaken[key] && ' ✓'}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {gender === 'female' && (
        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
          <label className="text-xs font-bold block text-slate-700">🩸 生理</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={async () => {
                const d = new Date();
                const dateStr = selectedDate ?? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                setPeriodStatus('生理中');
                await onPeriodStatusSave?.(dateStr, '生理中');
                if (onPeriodStart) {
                  await onPeriodStart(dateStr);
                }
              }}
              className={`p-3 rounded-lg border-2 flex flex-col items-center justify-center gap-1 font-bold text-sm transition ${
                periodStatus === '生理中'
                  ? 'border-slate-500 bg-slate-200 text-slate-800 ring-2 ring-slate-400'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <span className="text-lg">🩸</span>
              <span>生理が来た</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                const next = periodStatus === '生理中' ? 'なし' : '生理中';
                const dateStr = selectedDate ?? new Date().toISOString().split('T')[0];
                setPeriodStatus(next);
                await onPeriodStatusSave?.(dateStr, next);
              }}
              className={`p-3 rounded-lg border-2 flex flex-col items-center justify-center gap-1 font-bold text-sm transition ${
                periodStatus === '生理中'
                  ? 'border-slate-500 bg-slate-200 text-slate-800 ring-2 ring-slate-400'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <span className="text-lg">💧</span>
              <span>生理中</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                const dateStr = selectedDate ?? new Date().toISOString().split('T')[0];
                setPeriodStatus('生理終了');
                await onPeriodStatusSave?.(dateStr, '生理終了');
                if (onPeriodEnd && lastPeriodDate) {
                  const start = new Date(lastPeriodDate);
                  const end = dateStr ? new Date(dateStr + 'T12:00:00') : new Date();
                  const diff = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
                  const duration = Math.max(1, Math.min(14, diff));
                  await onPeriodEnd(lastPeriodDate, duration);
                }
              }}
              className={`p-3 rounded-lg border-2 flex flex-col items-center justify-center gap-1 font-bold text-sm transition ${
                periodStatus === '生理終了'
                  ? 'border-slate-500 bg-slate-200 text-slate-800 ring-2 ring-slate-400'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <span className="text-lg">✓</span>
              <span>生理終了</span>
            </button>
          </div>
          <p className="text-xs text-gray-500">選択はその日の記録にすぐ保存されます。健康管理で手動入力も可能</p>
        </div>
      )}

      {gender === 'female' && (
        <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-200">
          <label className="text-xs font-bold text-slate-700 block mb-2">✨ 肌の調子</label>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setSkinCondition(level)}
                className={`py-2 rounded-lg border-2 font-bold transition ${
                  skinCondition === level
                    ? level >= 4
                      ? 'border-green-500 bg-green-100 text-green-800'
                      : level === 3
                        ? 'border-yellow-500 bg-yellow-100 text-yellow-800'
                        : 'border-red-500 bg-red-100 text-red-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <span className="text-lg block">
                  {level === 1 && '😱'}
                  {level === 2 && '😣'}
                  {level === 3 && '😐'}
                  {level === 4 && '😊'}
                  {level === 5 && '✨'}
                </span>
                <span className="text-xs">{level}</span>
              </button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
            <span>荒れ荒れ</span>
            <span>絶好調</span>
          </div>
        </div>
      )}
    </div>
  );
}
