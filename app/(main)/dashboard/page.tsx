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
import { buildPmdaUrl } from '@/lib/medication-prompt';
import { computeMindScore, computeBodyScore, buildChartData } from '@/lib/dashboard-utils';

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

interface MedicationWithNdb {
  id: number;
  name: string;
  timings: string[];
  ndb?: { drugCode: string; categoryName: string; price: number | null; isGeneric: boolean };
}

// 色を簡素化: メイン2色（スレート系＋アクセント）
const CHART_COLOR_PRIMARY = '#475569'; // slate-600
const CHART_COLOR_ACCENT = '#7c3aed'; // violet-600

// グラフ表示可能な項目（モードとの対応付き・色は2色で統一）
const CHART_ITEMS = [
  { key: '体調', color: CHART_COLOR_PRIMARY, label: '体調', mode: null },
  { key: '腹痛', color: CHART_COLOR_ACCENT, label: '腹痛', mode: 'mode_ibd' },
  { key: 'トイレ', color: CHART_COLOR_PRIMARY, label: 'トイレ', mode: 'mode_ibd' },
  { key: '気分', color: CHART_COLOR_ACCENT, label: '気分', mode: 'mode_mental' },
  { key: '体重', color: CHART_COLOR_PRIMARY, label: '体重', mode: 'mode_diet' },
  { key: 'アルコール', color: CHART_COLOR_ACCENT, label: 'アルコール', mode: 'mode_alcohol' },
] as const;

const CORRELATION_LABELS: Record<string, string> = {
  sleep_mood: '睡眠↔体調',
  stress_mood: 'ストレス↔体調',
  period_mood: '生理↔体調',
  alcohol_pain_next: '飲酒→翌日腹痛',
  stress_mood_next: 'ストレス→翌日体調',
};

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
  const [triggers, setTriggers] = useState<Array<{ label: string; ratio: number; description: string }>>([]);
  const [correlations, setCorrelations] = useState<Record<string, number>>({});
  const [todayLog, setTodayLog] = useState<HealthLogRow | null>(null);
  const [sectionOpen, setSectionOpen] = useState({
    report: true,
    chart: true,
    mindBody: false,
    correlation: false,
    triggers: false,
  });

  // ユーザーの設定モード
  const [modes, setModes] = useState<UserSettingsMode>({});
  const [medications, setMedications] = useState<MedicationWithNdb[]>([]);
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
        try {
          const medData = JSON.parse(settings.current_medications || '{}') as { medications?: MedicationWithNdb[] };
          setMedications(medData.medications ?? []);
        } catch {
          setMedications([]);
        }
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

      const [logsRes, todayRes] = await Promise.all([
        fetch(`/api/health-logs?startDate=${startStr}&endDate=${endStr}`, { credentials: 'include' }),
        fetch(`/api/health-logs?date=${endStr}`, { credentials: 'include' }),
      ]);
      if (logsRes.status === 401 || todayRes.status === 401) {
        router.replace('/login');
        setLoading(false);
        return;
      }
      const logsData = logsRes.ok ? await logsRes.json() : [];
      if (Array.isArray(logsData)) setLogs(logsData as HealthLogRow[]);
      const todayData = todayRes.ok ? await todayRes.json() : null;
      setTodayLog(todayData as HealthLogRow | null);
      if (!logsRes.ok) console.error('Dashboard logs fetch error:', logsRes.status);
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
    const fetchCorrelationStats = async () => {
      if (insightTab !== 'daily') return;
      try {
        const res = await fetch('/api/correlation-stats', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setTriggers(data.triggers ?? []);
          setCorrelations(data.correlations ?? {});
        }
      } catch (e) {
        console.error('Correlation stats fetch error:', e);
      }
    };
    fetchCorrelationStats();
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
          setReport(data.report ?? '分析に失敗しました。もう一度お試しください。');
        }
      } catch (err) {
        console.error('Report fetch error:', err);
        setReport('通信エラーです。しばらくしてからもう一度お試しください。');
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

  const mindScore = computeMindScore(logs);
  const bodyScore = computeBodyScore(logs);
  const chartData = buildChartData(logs);

  const insightLabels: Record<Exclude<InsightTab, 'daily'>, string> = {
    weekly: '週次',
    monthly: '月次',
    yearly: '年次',
  };

  return (
    <div className="space-y-6 pb-20">
      {/* 分析タブ */}
      <div className="space-y-1">
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
        <p className="text-xs text-gray-500 px-1">
          {insightTab === 'daily' && '直近の傾向を把握'}
          {insightTab === 'weekly' && '週単位のパターン'}
          {insightTab === 'monthly' && '月単位の流れ'}
          {insightTab === 'yearly' && '年間の変化'}
        </p>
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
      ) : (
        <>
      {/* 服薬中の薬（PMDAリンク付き） */}
      {medications.length > 0 && (
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
          <h2 className="font-bold text-green-800 mb-2">💊 服薬中の薬</h2>
          <div className="space-y-2">
            {medications.map((med) => (
              <div key={med.id} className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-green-800">{med.name}</span>
                <a
                  href={buildPmdaUrl(med.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700"
                >
                  PMDAで副作用を確認する
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 今日の体調カード（最上部・認知負荷軽減） */}
      <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-4">
        <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
          <span>📋</span> 今日の体調
        </h2>
        {todayLog ? (
          <div className="space-y-2 text-sm">
            <div className="flex flex-wrap gap-2">
              {todayLog.general_mood != null && (
                <span className="px-2 py-1 rounded-full bg-slate-200 text-slate-700 font-medium">
                  体調 {todayLog.general_mood}/5
                </span>
              )}
              {todayLog.sleep_quality && (
                <span className="px-2 py-1 rounded-full bg-slate-200 text-slate-700">
                  睡眠: {todayLog.sleep_quality}
                </span>
              )}
              {todayLog.stress_level != null && (
                <span className="px-2 py-1 rounded-full bg-slate-200 text-slate-700">
                  ストレス {todayLog.stress_level}/10
                </span>
              )}
              {todayLog.pain_level != null && modes.mode_ibd && (
                <span className="px-2 py-1 rounded-full bg-slate-200 text-slate-700">
                  腹痛 {todayLog.pain_level}/5
                </span>
              )}
            </div>
            {todayLog.memo && (
              <p className="text-gray-600 text-xs line-clamp-2">{todayLog.memo}</p>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">
            まだ今日の記録がないわ。記録してから出直しなさい！
          </p>
        )}
      </div>

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

      {/* グラフエリア（折りたたみ可） */}
      <details open={sectionOpen.chart} onToggle={(e) => setSectionOpen(s => ({ ...s, chart: (e.target as HTMLDetailsElement).open }))} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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
      </details>

      {/* 心身スコアカード（折りたたみ可・色を簡素化） */}
      {(mindScore != null || bodyScore != null) && (
        <details open={sectionOpen.mindBody} onToggle={(e) => setSectionOpen(s => ({ ...s, mindBody: (e.target as HTMLDetailsElement).open }))} className="overflow-hidden rounded-xl border border-gray-200">
          <summary className="p-4 cursor-pointer list-none flex items-center justify-between font-bold text-gray-700 bg-slate-50 hover:bg-slate-100">
            <span>心身スコア</span>
            <span className="text-xs font-normal text-gray-400">{sectionOpen.mindBody ? '閉じる' : '開く'}</span>
          </summary>
          <div className="p-4 bg-white border-t border-gray-100">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-600">心（メンタル）</span>
            <p className="text-2xl font-bold text-slate-800 mt-1">{mindScore ?? '—'}</p>
            <p className="text-xs text-slate-500">直近{period}日平均</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-600">身（フィジカル）</span>
            <p className="text-2xl font-bold text-slate-800 mt-1">{bodyScore ?? '—'}</p>
            <p className="text-xs text-slate-500">直近{period}日平均</p>
          </div>
        </div>
          </div>
        </details>
      )}

      {/* 相関ヒートマップ（折りたたみ可） */}
      {Object.keys(correlations).length > 0 && (
        <details open={sectionOpen.correlation} onToggle={(e) => setSectionOpen(s => ({ ...s, correlation: (e.target as HTMLDetailsElement).open }))} className="overflow-hidden rounded-xl border border-slate-200">
          <summary className="p-4 cursor-pointer list-none flex items-center justify-between font-bold text-slate-700 bg-slate-50 hover:bg-slate-100">
            <span>相関マップ</span>
            <span className="text-xs font-normal text-gray-400">{sectionOpen.correlation ? '閉じる' : '開く'}</span>
          </summary>
          <div className="p-4 bg-white border-t border-slate-100">
          <div className="space-y-2">
            {Object.entries(correlations).map(([key, val]) => {
              const intensity = Math.min(1, Math.abs(val));
              const isPos = val > 0;
              const bg = isPos
                ? `rgba(34,197,94,${0.2 + intensity * 0.5})`
                : `rgba(239,68,68,${0.2 + intensity * 0.5})`;
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-slate-600 w-32">
                    {CORRELATION_LABELS[key] ?? key}
                  </span>
                  <div
                    className="flex-1 h-6 rounded bg-slate-200 overflow-hidden"
                    style={{ maxWidth: 120 }}
                  >
                    <div
                      className="h-full rounded transition-all"
                      style={{
                        width: `${(Math.abs(val) + 1) * 50}%`,
                        backgroundColor: bg,
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-700 w-10">{val > 0 ? '+' : ''}{val}</span>
                </div>
              );
            })}
          </div>
          </div>
        </details>
      )}

      {/* トリガーカード（折りたたみ可・色簡素化） */}
      {triggers.length > 0 && (
        <details open={sectionOpen.triggers} onToggle={(e) => setSectionOpen(s => ({ ...s, triggers: (e.target as HTMLDetailsElement).open }))} className="overflow-hidden rounded-xl border border-slate-200">
          <summary className="p-4 cursor-pointer list-none flex items-center justify-between font-bold text-slate-800 bg-slate-50 hover:bg-slate-100">
            <span className="flex items-center gap-2">
              <span>🔬</span>
              心身相関の発見
            </span>
            <span className="text-xs font-normal text-gray-400">{sectionOpen.triggers ? '閉じる' : '開く'}</span>
          </summary>
          <div className="p-4 bg-white border-t border-slate-100 space-y-2">
            {triggers.map((t, i) => (
              <div
                key={i}
                className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm"
              >
                <span className="font-bold text-slate-800">{t.label}</span>
                <p className="text-gray-700 mt-1">{t.description}</p>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* AI分析レポート（折りたたみ可・色簡素化） */}
      <details open={sectionOpen.report} onToggle={(e) => setSectionOpen(s => ({ ...s, report: (e.target as HTMLDetailsElement).open }))} className="overflow-hidden rounded-xl border border-slate-200">
        <summary className="p-4 cursor-pointer list-none flex items-center justify-between font-bold text-slate-800 bg-slate-50 hover:bg-slate-100">
          <span className="flex items-center gap-2">
            <span>💋</span>
            相棒の期間総評（因果関係分析）
          </span>
          <span className="text-xs font-normal text-gray-400">{sectionOpen.report ? '閉じる' : '開く'}</span>
        </summary>
        <div className="p-4 bg-white border-t border-slate-100">
          <div className="bg-slate-50 p-4 rounded-lg text-gray-800 font-medium leading-relaxed min-h-[120px] whitespace-pre-wrap">
            {analyzing ? (
              <span className="text-slate-600">分析中...</span>
            ) : report ? (
              report
            ) : (
              <span className="text-gray-400 text-sm">
                記録がたまると、ここに因果関係に基づく気づきを表示します。
              </span>
            )}
          </div>
        </div>
      </details>
        </>
      )}
    </div>
  );
}
