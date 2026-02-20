import { EMOTIONS } from '@/lib/record-constants';
import type { UserSettingsMode } from '@/app/(main)/record/hooks/record-form-types';

export interface RecordPayloadParams {
  date: string;
  memo: string;
  mentalDiary: string;
  gender: string;
  skinCondition: number;
  periodStatus: string;
  mealDescription: string;
  modes: UserSettingsMode;
  painLevel: number;
  toiletCount: number;
  weight: string;
  bodyFat: string;
  calories: string;
  protein: string;
  steps: string;
  exerciseMinutes: string;
  generalMood: number;
  selectedEmotion: string;
  sleepQuality: string;
  allMedicationTaken: boolean;
  medicationTakenDetail: Record<string, boolean>;
  totalMl: number;
  drinkTypes: string;
  aiComment: string;
}

export function buildRecordPayload(params: RecordPayloadParams): Record<string, unknown> {
  const skinMemo = params.gender === 'female' ? `【肌】${params.skinCondition}` : '';
  const combinedMemo = [params.memo, params.mentalDiary, skinMemo].filter(Boolean).join('\n---\n');
  return {
    date: params.date,
    memo: combinedMemo,
    medication_taken: params.allMedicationTaken,
    medication_taken_detail:
      Object.keys(params.medicationTakenDetail).length > 0
        ? JSON.stringify(params.medicationTakenDetail)
        : null,
    general_mood: params.generalMood,
    meal_description: params.mealDescription,
    period_status: params.gender === 'female' ? params.periodStatus : null,
    ai_comment: params.aiComment,
    pain_level: params.modes.mode_ibd ? params.painLevel : null,
    stool_type: params.modes.mode_ibd ? `トイレ${params.toiletCount}回` : null,
    alcohol_amount: params.modes.mode_alcohol ? params.totalMl : 0,
    alcohol_percent: 0,
    alcohol_type: params.modes.mode_alcohol ? params.drinkTypes : null,
    stress_level:
      params.modes.mode_mental && params.selectedEmotion
        ? EMOTIONS.find((e) => e.label === params.selectedEmotion)?.id
        : null,
    sleep_quality: params.modes.mode_mental ? params.sleepQuality : null,
    spending: null,
    weight:
      (params.modes.mode_ibd || params.modes.mode_diet) && params.weight
        ? parseFloat(params.weight)
        : null,
    body_fat: params.modes.mode_diet && params.bodyFat ? parseFloat(params.bodyFat) : null,
    calories: params.modes.mode_diet && params.calories ? parseInt(params.calories) : null,
    protein: params.modes.mode_diet && params.protein ? parseFloat(params.protein) : null,
    steps: params.modes.mode_diet && params.steps ? parseInt(params.steps) : null,
    exercise_minutes:
      params.modes.mode_diet && params.exerciseMinutes ? parseInt(params.exerciseMinutes) : null,
  };
}
