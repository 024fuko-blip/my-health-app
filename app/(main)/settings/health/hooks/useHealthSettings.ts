"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ensureSession, handleUnauthorized, apiFetch, apiPut } from "@/lib/api-client";
import { DEFAULT_PERIOD_CYCLE, DEFAULT_PERIOD_DURATION } from "@/lib/constants";
import { parseMedications, parsePeriodSettings } from "@/lib/parse-settings";
import type { MedicationNdb } from "../components/MedicationManager";

export interface Medication {
  id: number;
  name: string;
  timings: string[];
  ndb?: MedicationNdb;
}

const DEFAULT_REMINDER_TIMES: Record<string, string> = {
  朝: "08:00",
  昼: "12:00",
  晩: "18:00",
  眠前: "22:00",
};

export function useHealthSettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullSettings, setFullSettings] = useState<Record<string, unknown>>({});
  const [gender, setGender] = useState("unspecified");
  const [periodCycle, setPeriodCycle] = useState(DEFAULT_PERIOD_CYCLE);
  const [periodDuration, setPeriodDuration] = useState(DEFAULT_PERIOD_DURATION);
  const [lastPeriodDate, setLastPeriodDate] = useState("");
  const [showPeriodOnCalendar, setShowPeriodOnCalendar] = useState(true);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [reminderTimes, setReminderTimes] = useState<Record<string, string>>(
    DEFAULT_REMINDER_TIMES
  );

  useEffect(() => {
    const fetchSettings = async () => {
      const session = await ensureSession(router);
      if (!session) return;
      const res = await apiFetch("/api/user-settings");
      if (res.status === 401) {
        handleUnauthorized(router);
        setLoading(false);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setFullSettings(data);
        setGender(data.gender ?? "unspecified");

        const ps = parsePeriodSettings(data.medical_history);
        setPeriodCycle(ps.periodCycle);
        setPeriodDuration(ps.periodDuration);
        setLastPeriodDate(ps.lastPeriodDate);
        setShowPeriodOnCalendar(ps.showPeriodOnCalendar);

        setMedications(parseMedications(data.current_medications) as Medication[]);

        let times = { ...DEFAULT_REMINDER_TIMES };
        try {
          if (data.medication_reminder_times) {
            const parsed = JSON.parse(
              data.medication_reminder_times as string
            ) as Record<string, string>;
            times = { ...DEFAULT_REMINDER_TIMES, ...parsed };
          }
        } catch {
          // ignore
        }
        setReminderTimes(times);
      }
      setLoading(false);
    };
    fetchSettings();
  }, [router]);

  const handleSave = async () => {
    setSaving(true);
    let medicalData: string;
    try {
      const existing = JSON.parse(
        (fullSettings.medical_history as string) || "{}"
      ) as { text?: string };
      medicalData = JSON.stringify({
        text: existing.text ?? "",
        periodCycle,
        periodDuration,
        lastPeriodDate: lastPeriodDate || undefined,
        showPeriodOnCalendar,
      });
    } catch {
      medicalData = JSON.stringify({
        text: "",
        periodCycle,
        periodDuration,
        lastPeriodDate: lastPeriodDate || undefined,
        showPeriodOnCalendar,
      });
    }
    const medicationData = JSON.stringify({ medications });
    const payload = {
      ...fullSettings,
      gender,
      medical_history: medicalData,
      current_medications: medicationData,
      medication_reminder_times: JSON.stringify(reminderTimes),
    };
    const result = await apiPut<Record<string, unknown>>("/api/user-settings", payload);
    setSaving(false);
    if (result.ok) {
      setFullSettings(payload);
      alert("保存しました");
    } else if (result.status === 401) {
      handleUnauthorized(router);
    } else {
      alert("保存に失敗しました" + (result.error ? ` (${result.error})` : ""));
    }
  };

  return {
    loading,
    saving,
    gender,
    setGender,
    periodCycle,
    setPeriodCycle,
    periodDuration,
    setPeriodDuration,
    lastPeriodDate,
    setLastPeriodDate,
    showPeriodOnCalendar,
    setShowPeriodOnCalendar,
    medications,
    setMedications,
    reminderTimes,
    setReminderTimes,
    handleSave,
  };
}
