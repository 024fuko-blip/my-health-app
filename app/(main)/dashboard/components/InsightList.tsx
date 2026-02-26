"use client";

import type { InsightRow, InsightTab } from '../hooks/useDashboardData';

interface InsightListProps {
  insightTab: Exclude<InsightTab, 'daily'>;
  insights: InsightRow[];
  insightGenerating: boolean;
  onRegenerate: () => void;
}

const insightLabels: Record<Exclude<InsightTab, 'daily'>, string> = {
  weekly: '週次',
  monthly: '月次',
  yearly: '年次',
};

export function InsightList({ insightTab, insights, insightGenerating, onRegenerate }: InsightListProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-800">{insightLabels[insightTab]}レポート</h2>
        <button
          type="button"
          onClick={onRegenerate}
          disabled={insightGenerating}
          className="px-4 py-2 bg-[var(--color-sage)] text-white text-sm font-medium disabled:opacity-50 hover:opacity-90"
        >
          {insightGenerating ? '生成中...' : '再生成'}
        </button>
      </div>
      {insights.length === 0 ? (
        <div className="bg-gray-50 p-6 rounded-xl text-center text-gray-500 text-sm">
          まだ分析データがありません。週次は毎週月曜、月次は毎月1日、年次は1月1日に自動生成されます（cron 設定時）。上の「再生成」で手動生成もできます。
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((i) => (
            <div
              key={i.id}
              className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm"
            >
              <p className="text-xs text-gray-500 mb-2">
                {i.startDate} 〜 {i.endDate}
              </p>
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{i.summary}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
