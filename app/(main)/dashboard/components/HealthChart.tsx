"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { ChartDataPoint } from '@/lib/dashboard-utils';

interface ChartItem {
  key: string;
  color: string;
  label: string;
  mode: string | null;
}

interface HealthChartProps {
  period: 7 | 30;
  chartData: ChartDataPoint[];
  availableItems: readonly ChartItem[];
  selectedItems: Set<string>;
  toggleItem: (key: string) => void;
  sectionOpen: { chart: boolean };
  setSectionOpen: React.Dispatch<React.SetStateAction<import('../hooks/useDashboardData').SectionOpen>>;
}

export function HealthChart({
  period,
  chartData,
  availableItems,
  selectedItems,
  toggleItem,
  sectionOpen,
  setSectionOpen,
}: HealthChartProps) {
  return (
    <details
      open={sectionOpen.chart}
      onToggle={(e) => setSectionOpen((s) => ({ ...s, chart: (e.target as HTMLDetailsElement).open }))}
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
    >
      <summary className="p-4 cursor-pointer list-none flex items-center justify-between font-bold text-gray-700 hover:bg-gray-50">
        <span className="flex items-center gap-2">
          <span>📈</span>
          {period === 7 ? '週間グラフ' : '月間グラフ'}
        </span>
        <span className="text-xs font-normal text-gray-400">{sectionOpen.chart ? '閉じる' : '開く'}</span>
      </summary>
      <div className="px-4 pb-4 border-t border-gray-100">
        <p className="text-xs text-gray-500 mb-3">
          {period === 7 ? '直近7日間' : '直近30日間'}の推移
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {availableItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => toggleItem(item.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition border-2 ${
                selectedItems.has(item.key)
                  ? 'text-white'
                  : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
              }`}
              style={
                selectedItems.has(item.key)
                  ? { backgroundColor: item.color, borderColor: item.color }
                  : {}
              }
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="h-72 w-full">
          {chartData.length > 0 && selectedItems.size > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis hide domain={['auto', 'auto']} yAxisId="left" />
                <YAxis hide domain={['auto', 'auto']} yAxisId="right" orientation="right" />
                <Tooltip
                  formatter={(value, name) => {
                    if (value == null || typeof value !== 'number') return '—';
                    if (name === 'アルコール') return `${value * 100}ml`;
                    if (name === '体重') return `${value}kg`;
                    if (name === 'トイレ') return `${value}回`;
                    return value;
                  }}
                  labelFormatter={(_, payload) => (payload[0]?.payload?.fullDate ?? '')}
                />
                <Legend />
                {availableItems.map(
                  (item) =>
                    selectedItems.has(item.key) && (
                      <Line
                        key={item.key}
                        yAxisId={item.key === '体重' ? 'right' : 'left'}
                        type="monotone"
                        dataKey={item.key}
                        stroke={item.color}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        connectNulls
                        name={item.label}
                      />
                    )
                )}
              </LineChart>
            </ResponsiveContainer>
          ) : chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              この期間の記録がまだないわ。記録画面で入力してから出直しなさい！
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              表示する項目を選択してちょうだい！
            </div>
          )}
        </div>
      </div>
    </details>
  );
}
