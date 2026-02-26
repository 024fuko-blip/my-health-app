"use client";

import type { PeriodDays } from '../hooks/useDashboardData';

interface PeriodToggleProps {
  period: PeriodDays;
  setPeriod: (p: PeriodDays) => void;
}

export function PeriodToggle({ period, setPeriod }: PeriodToggleProps) {
  return (
    <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-full max-w-xs">
      <button
        type="button"
        onClick={() => setPeriod(7)}
        className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition ${
          period === 7 ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        週間 (7日間)
      </button>
      <button
        type="button"
        onClick={() => setPeriod(30)}
        className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition ${
          period === 30 ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        月間 (30日間)
      </button>
    </div>
  );
}
