import { parseAlcoholTypeToAddedDrinks, type AddedDrink } from '@/lib/alcohol-calc';
import { EMOTIONS } from '@/lib/record-constants';
import type { HealthLogRow } from './record-form-types';

export interface ApplyLogSetters {
  setPreviousAlcoholSummary: (v: string) => void;
  setMemo: (v: string) => void;
  setMedicationTaken: (v: Record<string, boolean>) => void;
  setGeneralMood: (v: number) => void;
  setPeriodStatus: (v: string) => void;
  setMealDescription: (v: string) => void;
  setMealImageBase64: (v: string | null) => void;
  setPainLevel: (v: number) => void;
  setStoolType: (v: string) => void;
  setToiletCount: (v: number) => void;
  setTemperature: (v: string) => void;
  setSkinCondition: (v: number) => void;
  setAddedDrinks: (v: AddedDrink[]) => void;
  setDrinkStartTime: (v: string) => void;
  setDrinkEndTime: (v: string) => void;
  setSelectedEmotion: (v: string) => void;
  setSleepQuality: (v: string) => void;
  setMentalDiary: (v: string) => void;
  setWeight: (v: string) => void;
  setBodyFat: (v: string) => void;
  setCalories: (v: string) => void;
  setProtein: (v: string) => void;
  setSteps: (v: string) => void;
  setExerciseMinutes: (v: string) => void;
}

export function applyLogToForm(
  log: HealthLogRow | null,
  medications: { id: number; name: string; timings: string[] }[],
  setters: ApplyLogSetters
) {
  const {
    setPreviousAlcoholSummary,
    setMemo,
    setMedicationTaken,
    setGeneralMood,
    setPeriodStatus,
    setMealDescription,
    setMealImageBase64,
    setPainLevel,
    setStoolType,
    setToiletCount,
    setTemperature,
    setSkinCondition,
    setAddedDrinks,
    setDrinkStartTime,
    setDrinkEndTime,
    setSelectedEmotion,
    setSleepQuality,
    setMentalDiary,
    setWeight,
    setBodyFat,
    setCalories,
    setProtein,
    setSteps,
    setExerciseMinutes,
  } = setters;

  if (!log) {
    setPreviousAlcoholSummary('');
    setMemo('');
    const resetMed: Record<string, boolean> = {};
    medications.forEach((med) => {
      med.timings.forEach((t) => {
        resetMed[`${med.id}_${t}`] = false;
      });
    });
    setMedicationTaken(resetMed);
    setGeneralMood(3);
    setPeriodStatus('なし');
    setMealDescription('');
    setMealImageBase64(null);
    setPainLevel(1);
    setStoolType('普通');
    setToiletCount(0);
    setTemperature('');
    setSkinCondition(3);
    setAddedDrinks([]);
    setDrinkStartTime('19:00');
    setDrinkEndTime('21:00');
    setSelectedEmotion('');
    setSleepQuality('普通');
    setMentalDiary('');
    setWeight('');
    setBodyFat('');
    setCalories('');
    setProtein('');
    setSteps('');
    setExerciseMinutes('');
    return;
  }

  setMemo(typeof log.memo === 'string' ? log.memo.replace(/\n【飲酒理由】.*$/, '').trim() : '');
  const medState: Record<string, boolean> = {};
  medications.forEach((med) => {
    med.timings.forEach((t) => {
      medState[`${med.id}_${t}`] = !!log.medication_taken;
    });
  });
  setMedicationTaken(medState);
  setGeneralMood(log.general_mood ?? 3);
  setPeriodStatus(log.period_status || 'なし');
  setMealDescription(log.meal_description || '');
  setPainLevel(log.pain_level ?? 1);
  setStoolType(log.stool_type || '普通');
  const toiletMatch = (log.stool_type || '').match(/トイレ(\d+)回/);
  setToiletCount(toiletMatch ? parseInt(toiletMatch[1]) : 0);
  setTemperature('');
  const skinMatch = (log.memo || '').match(/【肌】(\d)/);
  setSkinCondition(skinMatch ? parseInt(skinMatch[1]) : 3);
  setDrinkStartTime('19:00');
  setDrinkEndTime('21:00');
  const emotionId = log.stress_level ?? 0;
  const emotion = EMOTIONS.find((e) => e.id === emotionId);
  setSelectedEmotion(emotion ? emotion.label : '');
  setSleepQuality(log.sleep_quality || '普通');
  setMentalDiary('');
  setWeight(log.weight != null ? String(log.weight) : '');
  setBodyFat(log.body_fat != null ? String(log.body_fat) : '');
  setCalories(log.calories != null ? String(log.calories) : '');
  setProtein(log.protein != null ? String(log.protein) : '');
  setSteps(log.steps != null ? String(log.steps) : '');
  setExerciseMinutes(log.exercise_minutes != null ? String(log.exercise_minutes) : '');

  const restored = parseAlcoholTypeToAddedDrinks(log.alcohol_type, log.alcohol_amount);
  if (restored.length > 0) {
    setAddedDrinks(restored);
    setPreviousAlcoholSummary('');
  } else {
    setAddedDrinks([]);
    const amount = log.alcohol_amount ?? 0;
    setPreviousAlcoholSummary(amount > 0 ? `以前の記録: ${amount}ml` : '');
  }
}
