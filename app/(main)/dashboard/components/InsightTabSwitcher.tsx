"use client";

import type { InsightTab } from '../hooks/useDashboardData';

interface InsightTabSwitcherProps {
  insightTab: InsightTab;
  setInsightTab: (tab: InsightTab) => void;
}

const insightLabels: Record<InsightTab, string> = {
  daily: '日次',
  weekly: '週次',
  monthly: '月次',
  yearly: '年次',
};

export function InsightTabSwitcher({ insightTab, setInsightTab }: InsightTabSwitcherProps) {
  const tabDescriptions: Record<InsightTab, string> = {
    daily: '直近の傾向を把握',
    weekly: '週単位のパターン',
    monthly: '月単位の流れ',
    yearly: '年間の変化',
  };

  return (
    <div className="space-y-1">
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-full max-w-md">
        {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setInsightTab(tab)}
            className={`flex-1 py-2.5 px-2 rounded-lg font-bold text-sm transition ${
              insightTab === tab ? 'bg-white text-[var(--color-text)] shadow-kirei-card' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            {insightLabels[tab]}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500 px-1">{tabDescriptions[insightTab]}</p>
    </div>
  );
}
