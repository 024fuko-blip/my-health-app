"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { HealthLogApiResponse, UserSettingsMode } from '@/app/(main)/record/hooks/record-form-types';
import { ensureSession, handleUnauthorized, apiFetch, apiPost } from '@/lib/api-client';
import { computeMindScore, computeBodyScore, buildChartData } from '@/lib/dashboard-utils';

export type PeriodDays = 7 | 30;
export type InsightTab = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface InsightRow {
  id: string;
  level: string;
  startDate: string;
  endDate: string;
  summary: string;
  metadata: Record<string, unknown> | null;
}

export interface SectionOpen {
  report: boolean;
  chart: boolean;
  mindBody: boolean;
  correlation: boolean;
  triggers: boolean;
}

export interface MedicationWithNdb {
  id: number;
  name: string;
  timings: string[];
  ndb?: { drugCode: string; categoryName: string; price: number | null; isGeneric: boolean };
}

const CHART_COLOR_PRIMARY = '#475569';
const CHART_COLOR_ACCENT = '#7c3aed';

export const CHART_ITEMS = [
  { key: '体調', color: CHART_COLOR_PRIMARY, label: '体調', mode: null },
  { key: '腹痛', color: CHART_COLOR_ACCENT, label: '腹痛', mode: 'mode_ibd' },
  { key: 'トイレ', color: CHART_COLOR_PRIMARY, label: 'トイレ', mode: 'mode_ibd' },
  { key: '気分', color: CHART_COLOR_ACCENT, label: '気分', mode: 'mode_mental' },
  { key: '体重', color: CHART_COLOR_PRIMARY, label: '体重', mode: 'mode_diet' },
  { key: 'アルコール', color: CHART_COLOR_ACCENT, label: 'アルコール', mode: 'mode_alcohol' },
] as const;

export function useDashboardData(period: PeriodDays, insightTab: InsightTab) {
  const router = useRouter();
  const [logs, setLogs] = useState<HealthLogApiResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [insights, setInsights] = useState<InsightRow[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightGenerating, setInsightGenerating] = useState(false);
  const [triggers, setTriggers] = useState<Array<{ label: string; ratio: number; description: string }>>([]);
  const [correlations, setCorrelations] = useState<Record<string, number>>({});
  const [todayLog, setTodayLog] = useState<HealthLogApiResponse | null>(null);
  const [sectionOpen, setSectionOpen] = useState<SectionOpen>({
    report: true,
    chart: true,
    mindBody: false,
    correlation: false,
    triggers: false,
  });
  const [modes, setModes] = useState<UserSettingsMode>({});
  const [medications, setMedications] = useState<MedicationWithNdb[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set(['体調']));

  useEffect(() => {
    const fetchData = async () => {
      const session = await ensureSession(router);
      if (!session) return;

      const settingsRes = await apiFetch('/api/user-settings');
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
        apiFetch(`/api/health-logs?startDate=${startStr}&endDate=${endStr}`),
        apiFetch(`/api/health-logs?date=${endStr}`),
      ]);
      if (logsRes.status === 401 || todayRes.status === 401) {
        handleUnauthorized(router);
        setLoading(false);
        return;
      }
      const logsData = logsRes.ok ? await logsRes.json() : [];
      if (Array.isArray(logsData)) setLogs(logsData as HealthLogApiResponse[]);
      const todayData = todayRes.ok ? await todayRes.json() : null;
      setTodayLog(todayData as HealthLogApiResponse | null);
      if (!logsRes.ok) console.error('Dashboard logs fetch error:', logsRes.status);
      setLoading(false);
    };
    fetchData();
  }, [period, insightTab, router]);

  useEffect(() => {
    const fetchInsights = async () => {
      if (insightTab === 'daily') return;
      setInsightsLoading(true);
      try {
        const level = insightTab === 'weekly' ? 'weekly' : insightTab === 'monthly' ? 'monthly' : 'yearly';
        const res = await apiFetch(`/api/insights?level=${level}&limit=20`);
        if (res.status === 401) {
          handleUnauthorized(router);
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
  }, [insightTab, router]);

  useEffect(() => {
    const fetchCorrelationStats = async () => {
      if (insightTab !== 'daily') return;
      try {
        const res = await apiFetch('/api/correlation-stats');
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
        const result = await apiPost<{ report?: string }>('/api/report', { period });
        if (result.ok) {
          setReport(result.data.report ?? '');
        } else {
          if (result.status === 401) {
            handleUnauthorized(router);
            return;
          }
          console.error('Report API error:', result.status, result.error);
          setReport(result.error ?? '分析に失敗しました。もう一度お試しください。');
        }
      } catch (err) {
        console.error('Report fetch error:', err);
        setReport('通信エラーです。しばらくしてからもう一度お試しください。');
      } finally {
        setAnalyzing(false);
      }
    };

    fetchReport();
  }, [period, insightTab, router]);

  const handleRegenerateInsight = async () => {
    const level = insightTab === 'weekly' ? 'weekly' : insightTab === 'monthly' ? 'monthly' : 'yearly';
    setInsightGenerating(true);
    try {
      const result = await apiPost<{ ok?: boolean }>('/api/insights', { level });
      if (result.ok) {
        const listRes = await apiFetch(`/api/insights?level=${level}&limit=20`);
        const listData = await listRes.json();
        if (listRes.ok && Array.isArray(listData.insights)) setInsights(listData.insights as InsightRow[]);
      } else {
        console.error('Insight generation failed:', result.error);
      }
    } catch (e) {
      console.error('Regenerate error:', e);
    } finally {
      setInsightGenerating(false);
    }
  };

  const availableItems = CHART_ITEMS.filter(item => {
    if (item.mode === null) return true;
    return modes[item.mode as keyof UserSettingsMode];
  });

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

  return {
    logs,
    loading,
    report,
    analyzing,
    insights,
    insightsLoading,
    insightGenerating,
    triggers,
    correlations,
    todayLog,
    sectionOpen,
    setSectionOpen,
    modes,
    medications,
    selectedItems,
    toggleItem,
    handleRegenerateInsight,
    mindScore,
    bodyScore,
    chartData,
    availableItems,
  };
}
