import { safeParseJson } from './json-utils';

const DEFAULT_TIMES: Record<string, string> = {
  朝: '08:00',
  昼: '12:00',
  晩: '18:00',
  眠前: '22:00',
};

export interface MedicationScheduleItem {
  time: string;
  label?: string;
  medications: string[];
}

interface MedicationItem {
  name: string;
  timings: string[];
}

interface MedicationData {
  medications?: MedicationItem[];
}

/** 服薬リマインダー時刻の型 */
type ReminderTimes = Record<string, string>;

export function buildMedicationSchedule(
  medicationReminderTimes: string | null,
  currentMedications: string | null,
  options?: { includeLabel?: boolean }
): MedicationScheduleItem[] {
  let times: Record<string, string> = { ...DEFAULT_TIMES };
  const parsedTimes = safeParseJson<ReminderTimes>(medicationReminderTimes, {});
  if (Object.keys(parsedTimes).length > 0) {
    times = { ...times, ...parsedTimes };
  }

  const medData = safeParseJson<MedicationData>(currentMedications, {});
  const medications: MedicationItem[] = Array.isArray(medData.medications)
    ? medData.medications
    : [];

  const timeToMeds: Record<string, string[]> = {};
  for (const med of medications) {
    for (const t of med.timings) {
      const time = times[t] ?? t;
      if (!timeToMeds[time]) timeToMeds[time] = [];
      timeToMeds[time].push(med.name);
    }
  }

  return Object.entries(timeToMeds)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, meds]) => {
      const item: MedicationScheduleItem = { time, medications: meds };
      if (options?.includeLabel) item.label = time;
      return item;
    });
}
