"use client";

interface PeriodLegendProps {
  showPeriodOnCalendar: boolean;
  onToggle: () => void;
}

export function PeriodLegend({
  showPeriodOnCalendar,
  onToggle,
}: PeriodLegendProps) {
  return (
    <div className="mt-4 bg-white p-3 shadow-kirei-card border border-[var(--color-border)]">
      <label className="flex items-center gap-2 cursor-pointer mb-3">
        <input
          type="checkbox"
          checked={showPeriodOnCalendar}
          onChange={onToggle}
          className="w-4 h-4"
        />
        <span className="text-sm font-medium text-gray-800">生理周期で色分けする</span>
      </label>
      {showPeriodOnCalendar && (
        <>
          <h3 className="text-xs font-bold text-gray-700 mb-2">
            📅 カレンダーの見方
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <span className="w-4 h-4 bg-pink-50/70 border border-pink-100"></span>
              <span className="text-gray-700">🩸 生理予測</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-4 h-4 bg-purple-50/50 border border-purple-100"></span>
              <span className="text-gray-700">🥚 排卵日</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-4 h-4 bg-purple-50/40 border border-purple-100"></span>
              <span className="text-gray-700">💜 妊娠しやすい</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-4 h-4 bg-amber-50/50 border border-amber-100"></span>
              <span className="text-gray-700">⚠️ PMS/肌荒れ期</span>
            </div>
          </div>
          <p className="text-xs text-gray-700 mt-2">
            💧 = 生理中、✓ = 生理終了（記録）
          </p>
        </>
      )}
    </div>
  );
}
