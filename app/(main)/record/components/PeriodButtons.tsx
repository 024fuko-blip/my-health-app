import { useState, useCallback } from 'react';

interface PeriodButtonsProps {
  periodStatus: string;
  setPeriodStatus: (v: string) => void;
  lastPeriodDate?: string;
  selectedDate?: string;
  onPeriodStart?: (date: string) => Promise<void>;
  onPeriodEnd?: (startDate: string, duration: number) => Promise<void>;
  onPeriodStatusSave?: (date: string, status: string) => Promise<void>;
  onUserEdit?: () => void;
}

function getTodayStr(selectedDate?: string): string {
  if (selectedDate) return selectedDate;
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function PeriodButtons({
  periodStatus,
  setPeriodStatus,
  lastPeriodDate,
  selectedDate,
  onPeriodStart,
  onPeriodEnd,
  onPeriodStatusSave,
  onUserEdit,
}: PeriodButtonsProps) {
  const [saving, setSaving] = useState(false);

  const getDateStr = useCallback(() => getTodayStr(selectedDate), [selectedDate]);

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
          <span className="text-[10px] font-normal text-slate-600">タップでON/OFF</span>
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
      <p className="text-xs text-gray-700">選択はその日の記録にすぐ保存されます。生理中を選ぶと開始日も記録されます</p>
    </div>
  );
}
