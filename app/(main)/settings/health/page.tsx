"use client";

import { MedicationManager } from "./components/MedicationManager";
import { PeriodCycleSettings } from "./components/PeriodCycleSettings";
import { useHealthSettings } from "./hooks/useHealthSettings";

export default function SettingsHealthPage() {
  const {
    loading,
    saving,
    gender,
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
  } = useHealthSettings();

  if (loading) return <div className="p-4">読み込み中...</div>;

  return (
    <div className="space-y-6">
      <PeriodCycleSettings
        gender={gender}
        periodCycle={periodCycle}
        setPeriodCycle={setPeriodCycle}
        periodDuration={periodDuration}
        setPeriodDuration={setPeriodDuration}
        lastPeriodDate={lastPeriodDate}
        setLastPeriodDate={setLastPeriodDate}
        showPeriodOnCalendar={showPeriodOnCalendar}
        setShowPeriodOnCalendar={setShowPeriodOnCalendar}
      />

      <MedicationManager
        medications={medications}
        setMedications={setMedications}
        reminderTimes={reminderTimes}
        setReminderTimes={setReminderTimes}
      />

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-[var(--color-sage)] text-white p-3 font-bold disabled:opacity-50 hover:opacity-90"
      >
        {saving ? "保存中..." : "保存する"}
      </button>
    </div>
  );
}
