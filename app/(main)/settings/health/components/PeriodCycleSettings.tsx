"use client";

interface PeriodCycleSettingsProps {
  gender: string;
  periodCycle: number;
  setPeriodCycle: (v: number) => void;
  periodDuration: number;
  setPeriodDuration: (v: number) => void;
  lastPeriodDate: string;
  setLastPeriodDate: (v: string) => void;
  showPeriodOnCalendar: boolean;
  setShowPeriodOnCalendar: (v: boolean) => void;
}

export function PeriodCycleSettings({
  gender,
  periodCycle,
  setPeriodCycle,
  periodDuration,
  setPeriodDuration,
  lastPeriodDate,
  setLastPeriodDate,
  showPeriodOnCalendar,
  setShowPeriodOnCalendar,
}: PeriodCycleSettingsProps) {
  if (gender === "female") {
    return (
      <div className="bg-[var(--color-accent-pink)]/20 p-4 border border-[var(--color-border)] space-y-4">
        <h3 className="font-bold text-[var(--color-text)]">🩸 生理周期</h3>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showPeriodOnCalendar}
            onChange={(e) => setShowPeriodOnCalendar(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm">カレンダー・記録画面に生理周期を表示する</span>
        </label>
        <div>
          <label className="block text-xs font-bold mb-1">最後の生理開始日</label>
          <input
            type="date"
            value={lastPeriodDate}
            onChange={(e) => setLastPeriodDate(e.target.value)}
            className="w-full p-2 border rounded text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold mb-1">周期（日数）</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={21}
                max={40}
                value={periodCycle}
                onChange={(e) => setPeriodCycle(parseInt(e.target.value) || 28)}
                className="w-full p-2 border rounded text-sm text-center"
              />
              <span className="text-sm text-gray-500">日</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">生理期間</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={3}
                max={10}
                value={periodDuration}
                onChange={(e) => setPeriodDuration(parseInt(e.target.value) || 5)}
                className="w-full p-2 border rounded text-sm text-center"
              />
              <span className="text-sm text-gray-500">日</span>
            </div>
          </div>
        </div>
        {lastPeriodDate && (
          <p className="text-sm text-pink-800">
            <span className="font-bold">次の生理予定日:</span>{" "}
            {(() => {
              const next = new Date(lastPeriodDate);
              next.setDate(next.getDate() + periodCycle);
              return next.toLocaleDateString("ja-JP", { month: "long", day: "numeric" });
            })()}
          </p>
        )}
        <p className="text-xs text-gray-500">カレンダーに生理予測・PMSが表示されます</p>
      </div>
    );
  }

  return (
    <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
      生理周期はプロフィールで性別を「女性」にすると表示されます。
    </p>
  );
}
