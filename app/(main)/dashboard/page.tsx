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

import type { HealthLogApiResponse, UserSettingsMode } from '@/app/(main)/record/hooks/record-form-types';

type PeriodDays = 7 | 30;
type HealthLogRow = HealthLogApiResponse;

type InsightTab = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface InsightRow {
  id: string;
  level: string;
  startDate: string;
  endDate: string;
  summary: string;
  metadata: Record<string, unknown> | null;
}

// グラフ表示可能な項目（モードとの対応付き）
const CHART_ITEMS = [
  { key: '体調', color: '#3b82f6', label: '体調', mode: null }, // 常に表示
  { key: '腹痛', color: '#ef4444', label: '腹痛', mode: 'mode_ibd' },
  { key: 'トイレ', color: '#f59e0b', label: 'トイレ', mode: 'mode_ibd' },
  { key: '気分', color: '#10b981', label: '気分', mode: 'mode_mental' },
  { key: '体重', color: '#8b5cf6', label: '体重', mode: 'mode_diet' },
  { key: 'アルコール', color: '#ec4899', label: 'アルコール', mode: 'mode_alcohol' },
] as const;

export default function DashboardPage() {
  const router = useRouter();
  const [insightTab, setInsightTab] = useState<InsightTab>('daily');
  const [logs, setLogs] = useState<HealthLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodDays>(7);
  const [report, setReport] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [insights, setInsights] = useState<InsightRow[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightGenerating, setInsightGenerating] = useState(false);

  // ユーザーの設定モード
  const [modes, setModes] = useState<UserSettingsMode>({});
  // 表示する項目の選択状態
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set(['体調']));

  useEffect(() => {
    const fetchData = async () => {
      const sessionRes = await fetch('/api/auth/session', { credentials: 'include' });
      const sessionData = await sessionRes.json();
      if (!sessionData.user) return;

      const settingsRes = await fetch('/api/user-settings', { credentials: 'include' });
      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        setModes({
          mode_ibd: Boolean(settings.mode_ibd),
          mode_alcohol: Boolean(settings.mode_alcohol),
          mode_mental: Boolean(settings.mode_mental),
          mode_diet: Boolean(settings.mode_diet),
        });
      }

      if (insightTab !== 'daily') {
        setLoading(false);
        return;
      }

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
      if (!res.ok) console.error('Dashboard logs fetch error:', res.status);
      setLoading(false);
    };
    fetchData();
  }, [period, insightTab]);

  useEffect(() => {
    const fetchInsights = async () => {
      if (insightTab === 'daily') return;
      setInsightsLoading(true);
      try {
        const level = insightTab === 'weekly' ? 'weekly' : insightTab === 'monthly' ? 'monthly' : 'yearly';
        const res = await fetch(`/api/insights?level=${level}&limit=20`, { credentials: 'include' });
        if (res.status === 401) {
          router.replace('/login');
          return;
        }
        const data = await res.json();
        if (res.ok && Array.isArray(data.insights)) {
          setInsights(data.insights as InsightRow[]);
        }
      } catch (e) {
        console.error('Insights fetch error:', e);
      } finally {
        setInsightsLoading(false);
      }
    };
    fetchInsights();
  }, [insightTab]);

  useEffect(() => {
    const fetchReport = async () => {
      if (insightTab !== 'daily') return;
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
  }, [period, insightTab]);

  if (insightTab === 'daily' && loading) return <div className="p-4">読み込み中...</div>;
  if (insightTab !== 'daily' && insightsLoading) return <div className="p-4">読み込み中...</div>;

  const handleRegenerateInsight = async () => {
    const level = insightTab === 'weekly' ? 'weekly' : insightTab === 'monthly' ? 'monthly' : 'yearly';
    setInsightGenerating(true);
    try {
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level }),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) {
        const listRes = await fetch(`/api/insights?level=${level}&limit=20`, { credentials: 'include' });
        const listData = await listRes.json();
        if (listRes.ok && Array.isArray(listData.insights)) setInsights(listData.insights as InsightRow[]);
      } else {
        console.error('Insight generation failed:', data);
      }
    } catch (e) {
      console.error('Regenerate error:', e);
    } finally {
      setInsightGenerating(false);
    }
  };

  // 設定モードに応じてフィルタリングされた項目
  const availableItems = CHART_ITEMS.filter(item => {
    if (item.mode === null) return true; // 常に表示
    return modes[item.mode as keyof UserSettingsMode];
  });

  // 項目選択のトグル
  const toggleItem = (key: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const chartData = logs.map((row) => {
    // stool_typeからトイレ回数を抽出
    const toiletMatch = (row.stool_type || '').match(/トイレ(\d+)回/);
    const toiletCount = toiletMatch ? parseInt(toiletMatch[1]) : null;
    
    return {
      date: row.date.slice(5),
      fullDate: row.date,
      体調: row.general_mood ?? null,
      腹痛: row.pain_level ?? null,
      気分: row.stress_level ?? null,
      体重: row.weight ?? null,
      トイレ: toiletCount,
      アルコール: row.alcohol_amount ? Math.round(row.alcohol_amount / 100) : null, // 100ml単位
    };
  });

  const insightLabels: Record<Exclude<InsightTab, 'daily'>, string> = {
    weekly: '週次',
    monthly: '月次',
    yearly: '年次',
  };

  return (
    <div className="space-y-6 pb-20">
      {/* 分析タブ */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-full max-w-md">
        {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setInsightTab(tab)}
            className={`flex-1 py-2.5 px-2 rounded-lg font-bold text-sm transition ${
              insightTab === tab ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab === 'daily' ? '日次' : insightLabels[tab]}
          </button>
        ))}
      </div>

      {insightTab !== 'daily' ? (
        /* 週次・月次・年次インサイト一覧 */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-800">{insightLabels[insightTab]}レポート</h2>
            <button
              type="button"
              onClick={handleRegenerateInsight}
              disabled={insightGenerating}
              className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium disabled:opacity-50 hover:bg-purple-700"
            >
              {insightGenerating ? '生成中...' : '再生成'}
            </button>
          </div>
          {insights.length === 0 ? (
            <div className="bg-gray-50 p-6 rounded-xl text-center text-gray-500 text-sm">
              まだ分析データがありません。週次は毎週月曜、月次は毎月1日、年次は1月1日に自動生成されます。上の「再生成」で手動生成もできます。
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
      ) : (
        <>
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

      {/* グラフエリア（週間 / 月間で表示切り替え） */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-700 mb-1 flex items-center">
          <span className="mr-2">📈</span>
          {period === 7 ? '週間グラフ' : '月間グラフ'}
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          {period === 7 ? '直近7日間' : '直近30日間'}の推移
        </p>
        
        {/* 項目選択ボタン（設定モードに応じて表示） */}
        <div className="flex flex-wrap gap-2 mb-4">
          {availableItems.map(item => (
            <button
              key={item.key}
              type="button"
              onClick={() => toggleItem(item.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition border-2 ${
                selectedItems.has(item.key)
                  ? 'text-white'
                  : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
              }`}
              style={selectedItems.has(item.key) ? { 
                backgroundColor: item.color, 
                borderColor: item.color 
              } : {}}
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
                <YAxis
                  hide
                  domain={['auto', 'auto']}
                  yAxisId="left"
                />
                <YAxis
                  hide
                  domain={['auto', 'auto']}
                  yAxisId="right"
                  orientation="right"
                />
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
                {availableItems.map(item => 
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
        </>
      )}
    </div>
  );
}
