import type React from 'react';
import { useState, useCallback } from 'react';
import type { Medication } from '../hooks/record-form-types';

/** 生理ボタン専用（選択状態を分離・二重押下防止） */
function PeriodButtons({
  periodStatus,
  setPeriodStatus,
  lastPeriodDate,
  selectedDate,
  onPeriodStart,
  onPeriodEnd,
  onPeriodStatusSave,
  onUserEdit,
}: {
  periodStatus: string;
  setPeriodStatus: (v: string) => void;
  lastPeriodDate?: string;
  selectedDate?: string;
  onPeriodStart?: (date: string) => Promise<void>;
  onPeriodEnd?: (startDate: string, duration: number) => Promise<void>;
  onPeriodStatusSave?: (date: string, status: string) => Promise<void>;
  onUserEdit?: () => void;
}) {
  const [saving, setSaving] = useState(false);

  const getDateStr = useCallback(() => {
    if (selectedDate) return selectedDate;
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, [selectedDate]);

  const handleClick = useCallback(async (
    status: string,
    extra?: () => Promise<void>
  ) => {
    if (saving) return;
    onUserEdit?.();
    setSaving(true);
    setPeriodStatus(status);
    const dateStr = getDateStr();
    try {
      await onPeriodStatusSave?.(dateStr, status);
      await extra?.();
    } finally {
      setSaving(false);
    }
  }, [saving, getDateStr, setPeriodStatus, onPeriodStatusSave, onUserEdit]);

  const dateStr = getDateStr();

  const btnClass = (selected: boolean) =>
    `p-3 rounded-lg border-2 flex flex-col items-center justify-center gap-1 font-bold text-sm transition min-h-[72px] record-btn touch-manipulation ${
      selected
        ? 'border-slate-500 bg-slate-200 text-slate-800 ring-2 ring-slate-400'
        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 active:bg-slate-100'
    }`;

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
      <label className="text-xs font-bold block text-slate-700">🩸 生理</label>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const next = periodStatus === '生理中' ? 'なし' : '生理中';
            handleClick(next, async () => {
              if (next === '生理中') await onPeriodStart?.(dateStr);
            });
          }}
          className={btnClass(periodStatus === '生理中')}
        >
          <span className="text-lg">🩸</span>
          <span>生理中</span>
          <span className="text-[10px] font-normal text-slate-500">タップでON/OFF</span>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const next = periodStatus === '生理終了' ? 'なし' : '生理終了';
            handleClick(next, async () => {
              if (next === '生理終了' && onPeriodEnd && lastPeriodDate) {
                const start = new Date(lastPeriodDate);
                const end = new Date(dateStr + 'T12:00:00');
                const diff = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
                const duration = Math.max(1, Math.min(14, diff));
                await onPeriodEnd(lastPeriodDate, duration);
              }
            });
          }}
          className={btnClass(periodStatus === '生理終了')}
        >
          <span className="text-lg">✓</span>
          <span>生理終了</span>
        </button>
      </div>
      <p className="text-xs text-gray-500">選択はその日の記録にすぐ保存されます。生理中を選ぶと開始日も記録されます</p>
    </div>
  );
}

/** フォーム値（体調・体温・体重・生理・肌・服薬） */
export interface BasicInfoFormState {
  generalMood: number;
  temperature: string;
  weight: string;
  periodStatus: string;
  skinCondition: number;
  medicationTaken: Record<string, boolean>;
}

/** 生理関連の設定・コールバック */
export interface BasicInfoPeriodConfig {
  lastPeriodDate?: string;
  selectedDate?: string;
  onPeriodStart?: (date: string) => Promise<void>;
  onPeriodEnd?: (startDate: string, duration: number) => Promise<void>;
  onPeriodStatusSave?: (date: string, status: string) => Promise<void>;
}

/** 5 props に集約（Clean Code） */
export interface BasicInfoSectionProps {
  formState: BasicInfoFormState;
  setGeneralMood: (v: number) => void;
  setTemperature: (v: string) => void;
  setWeight: (v: string) => void;
  setPeriodStatus: (v: string) => void;
  setSkinCondition: (v: number) => void;
  setMedicationTaken: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  medications: Medication[];
  onMedicationStatusSave?: (medKey: string, taken: boolean) => Promise<void>;
  periodConfig: BasicInfoPeriodConfig;
  gender: string;
  onUserEdit?: () => void;
  defaultTemperature?: string;
  defaultWeight?: string;
}

function stepValue(current: string, fallback: string, step: number): string {
  const base = current !== '' ? parseFloat(current) : parseFloat(fallback || '0');
  if (Number.isNaN(base)) return fallback || '0';
  return (base + step).toFixed(1);
}

export function BasicInfoSection({
  formState,
  setGeneralMood,
  setTemperature,
  setWeight,
  setPeriodStatus,
  setSkinCondition,
  setMedicationTaken,
  medications,
  onMedicationStatusSave,
  periodConfig,
  gender,
  onUserEdit,
  defaultTemperature,
  defaultWeight,
}: BasicInfoSectionProps) {
  const {
    generalMood,
    temperature,
    weight,
    periodStatus,
    skinCondition,
    medicationTaken,
  } = formState;
  const {
    lastPeriodDate,
    selectedDate,
    onPeriodStart,
    onPeriodEnd,
    onPeriodStatusSave,
  } = periodConfig;
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
      <div>
        <label className="text-xs font-bold text-gray-700 block mb-2">😊 体調 (1-5)</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((level) => (
            <button
              key={level}
              type="button"
              onClick={(e) => { e.preventDefault(); onUserEdit?.(); setGeneralMood(generalMood === level ? 3 : level); }}
              className={`flex-1 py-2 rounded-lg border-2 font-bold transition record-btn touch-manipulation active:scale-95 ${
                generalMood === level
                  ? 'border-slate-500 bg-slate-100 text-slate-800'
                  : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <div>
          <label className="text-xs font-bold text-neutral-600 block mb-1">体温</label>
          <div className="flex items-center gap-2 max-w-[180px]">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); onUserEdit?.(); setTemperature(stepValue(temperature, defaultTemperature || '36.5', -0.1)); }}
              className="w-10 h-10 rounded-full border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 flex items-center justify-center font-bold text-lg record-btn touch-manipulation"
              aria-label="体温を下げる"
            >
              −
            </button>
            <input
              type="number"
              step="0.1"
              value={temperature}
              onChange={(e) => { onUserEdit?.(); setTemperature(e.target.value); }}
              placeholder={defaultTemperature || "36.5"}
              className="w-full min-w-0 p-3 border border-neutral-200 rounded-lg text-lg font-bold text-center"
            />
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); onUserEdit?.(); setTemperature(stepValue(temperature, defaultTemperature || '36.5', 0.1)); }}
              className="w-10 h-10 rounded-full border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 flex items-center justify-center font-bold text-lg record-btn touch-manipulation"
              aria-label="体温を上げる"
            >
              +
            </button>
            <span className="text-lg font-bold text-neutral-500">℃</span>
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-neutral-600 block mb-1">体重</label>
          <div className="flex items-center gap-2 max-w-[180px]">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); onUserEdit?.(); setWeight(stepValue(weight, defaultWeight || '60.0', -0.1)); }}
              className="w-10 h-10 rounded-full border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 flex items-center justify-center font-bold text-lg record-btn touch-manipulation"
              aria-label="体重を下げる"
            >
              −
            </button>
            <input
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => { onUserEdit?.(); setWeight(e.target.value); }}
              placeholder={defaultWeight || "60.0"}
              className="w-full min-w-0 p-3 border border-neutral-200 rounded-lg text-lg font-bold text-center"
            />
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); onUserEdit?.(); setWeight(stepValue(weight, defaultWeight || '60.0', 0.1)); }}
              className="w-10 h-10 rounded-full border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 flex items-center justify-center font-bold text-lg record-btn touch-manipulation"
              aria-label="体重を上げる"
            >
              +
            </button>
            <span className="text-lg font-bold text-neutral-500">kg</span>
          </div>
        </div>
      </div>

      {medications.length > 0 && (
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 text-sm">今日の薬</span>
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
            <div key={med.id} className="bg-white p-2 rounded-lg border border-slate-100">
              <div className="text-xs font-bold text-slate-700 mb-2">{med.name}</div>
              <div className="grid grid-cols-4 gap-1">
                {med.timings.map((timing) => {
                  const key = `${med.id}_${timing}`;
                  const nextTaken = !medicationTaken[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        onUserEdit?.();
                        setMedicationTaken((prev) => ({
                          ...prev,
                          [key]: nextTaken,
                        }));
                        onMedicationStatusSave?.(key, nextTaken);
                      }}
                      className={`py-1.5 rounded-lg border-2 font-bold text-xs transition record-btn touch-manipulation active:scale-95 ${
                        medicationTaken[key]
                          ? 'border-green-500 bg-green-100 text-green-800'
                          : 'border-slate-200 bg-slate-50 text-slate-400'
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
        <PeriodButtons
          periodStatus={periodStatus}
          setPeriodStatus={setPeriodStatus}
          lastPeriodDate={lastPeriodDate}
          selectedDate={selectedDate}
          onPeriodStart={onPeriodStart}
          onPeriodEnd={onPeriodEnd}
          onPeriodStatusSave={onPeriodStatusSave}
          onUserEdit={onUserEdit}
        />
      )}

      {gender === 'female' && (
        <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-200">
          <label className="text-xs font-bold text-slate-700 block mb-2">✨ 肌の調子</label>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((level) => (
              <button
                key={level}
                type="button"
                onClick={(e) => { e.preventDefault(); onUserEdit?.(); setSkinCondition(skinCondition === level ? 3 : level); }}
                className={`py-2 rounded-lg border-2 font-bold transition record-btn touch-manipulation active:scale-95 ${
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
