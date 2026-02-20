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
  /** リマインダースキップ判定用: "${med.id}_${timing}" */
  medKeys?: string[];
}

interface MedicationItem {
  id?: number;
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
  const timeToKeys: Record<string, string[]> = {};
  for (const med of medications) {
    const medId = med.id ?? 0;
    for (const t of med.timings) {
      const time = times[t] ?? t;
      if (!timeToMeds[time]) {
        timeToMeds[time] = [];
        timeToKeys[time] = [];
      }
      timeToMeds[time].push(med.name);
      timeToKeys[time].push(`${medId}_${t}`);
    }
  }

  return Object.entries(timeToMeds)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, meds]) => {
      const item: MedicationScheduleItem = {
        time,
        medications: meds,
        medKeys: timeToKeys[time],
      };
      if (options?.includeLabel) item.label = time;
      return item;
    });
}
