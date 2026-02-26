"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ensureSession, handleUnauthorized, apiFetch, apiPut, apiPatch, apiDelete } from '@/lib/api-client';
import { PATH, DEFAULT_PERIOD_CYCLE, DEFAULT_PERIOD_DURATION } from '@/lib/constants';
import type { HealthLogApiResponse, CalendarEditForm } from '@/app/(main)/record/hooks/record-form-types';

export interface PeriodSettings {
  lastPeriodDate: string;
  periodCycle: number;
  periodDuration: number;
  gender: string;
  showPeriodOnCalendar: boolean;
}

export function useCalendarData(currentDate: Date) {
  const router = useRouter();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const firstDay = new Date(year, month - 1, 1).getDay();
  const lastDate = new Date(year, month, 0).getDate();

  const [logs, setLogs] = useState<HealthLogApiResponse[]>([]);
  const [selectedLog, setSelectedLog] = useState<HealthLogApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<CalendarEditForm>({});
  const [periodSettings, setPeriodSettings] = useState<PeriodSettings>({
    lastPeriodDate: '',
    periodCycle: DEFAULT_PERIOD_CYCLE,
    periodDuration: DEFAULT_PERIOD_DURATION,
    gender: 'unspecified',
    showPeriodOnCalendar: true,
  });
  const [fullSettings, setFullSettings] = useState<Record<string, unknown>>({});

  const logsMap = useMemo(
    () => new Map(logs.map((l) => [l.date, l])),
    [logs]
  );

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const session = await ensureSession(router);
    if (!session) {
      setLoading(false);
      return;
    }

    const settingsRes = await apiFetch('/api/user-settings');
    if (settingsRes.ok) {
      const settingsData = await settingsRes.json();
      setFullSettings(settingsData);
      try {
        const medHistory = JSON.parse(settingsData.medical_history || '{}');
        setPeriodSettings({
          lastPeriodDate: medHistory.lastPeriodDate || '',
          periodCycle: medHistory.periodCycle ?? DEFAULT_PERIOD_CYCLE,
          periodDuration: medHistory.periodDuration ?? DEFAULT_PERIOD_DURATION,
          gender: settingsData.gender || 'unspecified',
          showPeriodOnCalendar: medHistory.showPeriodOnCalendar !== false,
        });
      } catch {
        // パースエラー時はデフォルト値を維持
      }
    }

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDate}`;

    const res = await apiFetch(`/api/health-logs?startDate=${startDate}&endDate=${endDate}`);
    if (res.status === 401) {
      handleUnauthorized(router);
      setLoading(false);
      return;
    }
    const data = res.ok ? await res.json() : [];
    if (Array.isArray(data)) setLogs(data);
    if (!res.ok) {
      console.error('Calendar fetch error:', res.status, await res.text().catch(() => ''));
    }
    setLoading(false);
  }, [router, year, month, lastDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleToggleShowPeriod = async () => {
    const next = !periodSettings.showPeriodOnCalendar;
    setPeriodSettings((s) => ({ ...s, showPeriodOnCalendar: next }));
    try {
      const existing = JSON.parse((fullSettings.medical_history as string) || '{}');
      const medicalData = JSON.stringify({
        ...existing,
        showPeriodOnCalendar: next,
      });
      const result = await apiPut<Record<string, unknown>>('/api/user-settings', {
        ...fullSettings,
        medical_history: medicalData,
      });
      if (result.ok) setFullSettings((prev) => ({ ...prev, medical_history: medicalData }));
      else console.error('Failed to save showPeriodOnCalendar', result.error);
    } catch (e) {
      console.error('Toggle save error:', e);
      setPeriodSettings((s) => ({ ...s, showPeriodOnCalendar: !next }));
    }
  };

  const handleDateClick = (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const log = logsMap.get(dateStr);
    if (log) {
      setSelectedLog(log);
      setEditForm(log);
      setIsEditing(false);
    } else {
      alert(`${dateStr} の記録はありません。記録ページから入力してください 📝`);
    }
  };

  const handleDelete = async () => {
    if (!selectedLog || !confirm('本当に削除しますか？この操作は取り消せません。')) return;
    const delResult = await apiDelete(`/api/health-logs?id=${selectedLog.id}`);
    if (delResult.ok) {
      alert('削除しました🗑️');
      setSelectedLog(null);
      fetchLogs();
    } else {
      if (delResult.status === 401) {
        alert('セッションが切れました。再度ログインしてください。');
        router.replace(PATH.LOGIN);
        return;
      }
      console.error('Delete error:', delResult.status);
      alert('削除エラー');
    }
  };

  const handleUpdate = async () => {
    if (!selectedLog) return;
    const result = await apiPatch<Record<string, unknown>>('/api/health-logs', {
      id: selectedLog.id,
      general_mood: editForm.general_mood,
      pain_level: editForm.pain_level,
      meal_description: editForm.meal_description,
      memo: editForm.memo,
      weight: editForm.weight,
      steps: editForm.steps,
      period_status: editForm.period_status,
      stool_type: editForm.stool_type,
      alcohol_amount: editForm.alcohol_amount,
      stress_level: editForm.stress_level,
      sleep_quality: editForm.sleep_quality,
      body_fat: editForm.body_fat,
      calories: editForm.calories,
      protein: editForm.protein,
    });

    if (result.ok) {
      alert('修正しました✨');
      setIsEditing(false);
      setSelectedLog((prev) =>
        prev ? ({ ...prev, ...editForm } as HealthLogApiResponse) : null
      );
      fetchLogs();
    } else {
      if (result.status === 401) {
        alert('セッションが切れました。再度ログインしてください。');
        router.replace(PATH.LOGIN);
        return;
      }
      console.error('Update error:', result.status, result.error);
      alert('更新エラー');
    }
  };

  return {
    year,
    month,
    firstDay,
    lastDate,
    logs,
    logsMap,
    selectedLog,
    setSelectedLog,
    loading,
    isEditing,
    setIsEditing,
    editForm,
    setEditForm,
    periodSettings,
    fullSettings,
    fetchLogs,
    handleToggleShowPeriod,
    handleDateClick,
    handleDelete,
    handleUpdate,
  };
}
