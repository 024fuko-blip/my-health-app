"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

type PeriodDays = 7 | 30;

interface HealthLogRow {
  date: string;
  general_mood?: number | null;
  pain_level?: number | null;
  stress_level?: number | null;
  [key: string]: unknown;
}

export default function DashboardPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<HealthLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodDays>(7);
  const [report, setReport] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const sessionRes = await fetch('/api/auth/session', { credentials: 'include' });
      const sessionData = await sessionRes.json();
      if (!sessionData.user) return;

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - period);
      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      const res = await fetch(`/api/health-logs?startDate=${startStr}&endDate=${endStr}`, {
        credentials: 'include',
      });
      if (res.status === 401) {
        router.replace('/login');
        setLoading(false);
        return;
      }
      const data = res.ok ? await res.json() : [];
      if (Array.isArray(data)) setLogs(data as HealthLogRow[]);
      if (!res.ok) {
        console.error('Dashboard logs fetch error:', res.status);
      }
      setLoading(false);
    };
    fetchData();
  }, [period]);

  useEffect(() => {
    const fetchReport = async () => {
      setAnalyzing(true);
      setReport('');
      try {
        const res = await fetch('/api/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ period }),
          credentials: 'include',
        });
        const data = await res.json();
        if (res.ok) {
          setReport(data.report ?? '');
        } else {
          if (res.status === 401) {
            setReport('セッションが切れました。再度ログインしてください。');
            router.replace('/login');
            return;
          }
          console.error('Report API error:', res.status, data);
          setReport(data.report ?? '分析に失敗したわ。もう一度試してちょうだい！');
        }
      } catch (err) {
        console.error('Report fetch error:', err);
        setReport('オネエが忙しいみたいだわ... 通信エラーよ。しばらくしてからもう一度試してちょうだい！');
      } finally {
        setAnalyzing(false);
      }
    };

    fetchReport();
  }, [period]);

  if (loading) return <div className="p-4">読み込み中...</div>;

  const chartData = logs.map((row) => ({
    date: row.date.slice(5),
    fullDate: row.date,
    体調: row.general_mood ?? null,
    腹痛: row.pain_level ?? null,
    ストレス: row.stress_level ?? null,
  }));

  return (
    <div className="space-y-6 pb-20">
      {/* 期間切り替えトグル */}
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

      {/* グラフエリア */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-700 mb-4 flex items-center">
          <span className="mr-2">📈</span>
          {period === 7 ? '1週間' : '1ヶ月'}の推移
        </h3>
        <div className="h-72 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis
                  hide
                  domain={[1, 10]}
                  yAxisId="mood"
                />
                <YAxis
                  hide
                  domain={[1, 10]}
                  yAxisId="stress"
                  orientation="right"
                />
                <Tooltip
                  formatter={(value: any) => (value != null ? value : '—')}
                  labelFormatter={(_, payload) => (payload[0]?.payload?.fullDate ?? '')}
                />
                <Legend />
                <Line
                  yAxisId="mood"
                  type="monotone"
                  dataKey="体調"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                  name="体調"
                />
                <Line
                  yAxisId="mood"
                  type="monotone"
                  dataKey="腹痛"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                  name="腹痛"
                />
                <Line
                  yAxisId="stress"
                  type="monotone"
                  dataKey="ストレス"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                  name="ストレス"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              この期間の記録がまだないわ。記録画面で入力してから出直しなさい！
            </div>
          )}
        </div>
      </div>

      {/* AI分析レポート表示エリア */}
      <div className="bg-purple-50 p-5 rounded-xl border-2 border-purple-200 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-3xl">💋</span>
          <h2 className="font-bold text-purple-900">オネエの期間総評（因果関係分析）</h2>
        </div>
        <div className="bg-white p-4 rounded-lg text-gray-800 font-medium leading-relaxed shadow-sm min-h-[120px] whitespace-pre-wrap">
          {analyzing ? (
            <span className="text-purple-600">分析中... 因果関係を暴いてるわよ、ちょっと待ちなさい！</span>
          ) : report ? (
            report
          ) : (
            <span className="text-gray-400 text-sm">
              記録がたまると、ここに「〇〇食べた翌日はお腹壊してる」「生理前だからイライラするのね」みたいな気づきを出してくれるわよ。
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
