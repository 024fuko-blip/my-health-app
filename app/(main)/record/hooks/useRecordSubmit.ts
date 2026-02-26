import { useState, useCallback } from 'react';
import type { RouterLike } from '@/lib/api-client';
import { EMOTIONS } from '@/lib/record-constants';
import { ensureSession, apiPost, handleUnauthorized } from '@/lib/api-client';
import { buildRecordPayload } from '@/lib/validations/record-schema';
import type { UserSettingsMode } from './record-form-types';

/* ------------------------------------------------------------------ */
/*  AI アドバイス取得（記録保存時に使用）                                 */
/* ------------------------------------------------------------------ */

interface AiAdviceParams {
  mealDescription: string;
  generalMood: number;
  modes: UserSettingsMode;
  painLevel: number;
  stoolType: string;
  weight: string;
  steps: string;
  medications: { id: number; name: string; timings: string[] }[];
  medicationTaken: Record<string, boolean>;
  selectedEmotion: string;
  sleepQuality: string;
  mealImageBase64: string | null;
  totalMl: number;
  drinkTypes: string;
}

async function fetchAiAdvice(params: AiAdviceParams): Promise<string> {
  try {
    const medicationKeys = params.medications.flatMap((m) =>
      m.timings.map((t) => `${m.id}_${t}`)
    );
    const medicationTaken =
      medicationKeys.length > 0
        ? medicationKeys.every((key) => params.medicationTaken[key])
        : false;

    const res = await apiPost<{ advice: string }>('/api/advice', {
      mode: 'daily',
      logs: null,
      meal_description: params.mealDescription,
      general_mood: params.generalMood,
      pain_level: params.modes.mode_ibd ? params.painLevel : 0,
      stool_type: params.modes.mode_ibd ? params.stoolType : '',
      weight: params.modes.mode_diet ? params.weight : '',
      steps: params.modes.mode_diet ? params.steps : '',
      alcohol_amount: params.modes.mode_alcohol ? params.totalMl : 0,
      medication_taken: medicationTaken,
      stress_level:
        params.modes.mode_mental && params.selectedEmotion
          ? EMOTIONS.find((e) => e.label === params.selectedEmotion)?.id
          : null,
      sleep_quality: params.modes.mode_mental ? params.sleepQuality : null,
      meal_image_base64: params.mealImageBase64 ?? undefined,
    });
    if (!res.ok) return 'AI接続に失敗しました。しばらくしてから再度お試しください。';
    return res.data.advice;
  } catch {
    return 'AI接続に失敗しました。しばらくしてから再度お試しください。';
  }
}

/* ------------------------------------------------------------------ */
/*  送信フック                                                         */
/* ------------------------------------------------------------------ */

export interface SubmitFormSnapshot {
  date: string;
  memo: string;
  mentalDiary: string;
  gender: string;
  skinCondition: number;
  periodStatus: string;
  mealDescription: string;
  mealImageBase64: string | null;
  modes: UserSettingsMode;
  painLevel: number;
  stoolType: string;
  toiletCount: number;
  temperature: string;
  weight: string;
  bodyFat: string;
  calories: string;
  protein: string;
  steps: string;
  exerciseMinutes: string;
  generalMood: number;
  selectedEmotion: string;
  sleepQuality: string;
  medications: { id: number; name: string; timings: string[] }[];
  medicationTaken: Record<string, boolean>;
  addedDrinks: { id: number; label: string; ml: number; percent: number; count: number; pureAlcohol: number }[];
}

interface UseRecordSubmitDeps {
  router: RouterLike;
  getSnapshot: () => SubmitFormSnapshot;
  onSaveSuccess: () => void;
}

export function useRecordSubmit({ router, getSnapshot, onSaveSuccess }: UseRecordSubmitDeps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultModal, setResultModal] = useState<{ show: boolean; msg: string } | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setIsSubmitting(true);
      if (!(await ensureSession(router))) return;

      const snap = getSnapshot();
      const totalMl = snap.addedDrinks.reduce((s, d) => s + d.ml * d.count, 0);
      const drinkTypes = snap.addedDrinks.map((d) => `${d.label}x${d.count}`).join(', ');

      const aiComment = await fetchAiAdvice({
        mealDescription: snap.mealDescription,
        generalMood: snap.generalMood,
        modes: snap.modes,
        painLevel: snap.painLevel,
        stoolType: snap.stoolType,
        weight: snap.weight,
        steps: snap.steps,
        medications: snap.medications,
        medicationTaken: snap.medicationTaken,
        selectedEmotion: snap.selectedEmotion,
        sleepQuality: snap.sleepQuality,
        mealImageBase64: snap.mealImageBase64,
        totalMl,
        drinkTypes,
      });

      const allMedicationKeys = snap.medications.flatMap((m) =>
        m.timings.map((t) => `${m.id}_${t}`)
      );
      const allMedicationTaken =
        allMedicationKeys.length > 0
          ? allMedicationKeys.every((key) => snap.medicationTaken[key])
          : false;

      const payload = buildRecordPayload({
        date: snap.date,
        memo: snap.memo,
        mentalDiary: snap.mentalDiary,
        gender: snap.gender,
        skinCondition: snap.skinCondition,
        periodStatus: snap.periodStatus,
        mealDescription: snap.mealDescription,
        modes: snap.modes,
        painLevel: snap.painLevel,
        toiletCount: snap.toiletCount,
        temperature: snap.temperature,
        weight: snap.weight,
        bodyFat: snap.bodyFat,
        calories: snap.calories,
        protein: snap.protein,
        steps: snap.steps,
        exerciseMinutes: snap.exerciseMinutes,
        generalMood: snap.generalMood,
        selectedEmotion: snap.selectedEmotion,
        sleepQuality: snap.sleepQuality,
        allMedicationTaken,
        medicationTakenDetail: snap.medicationTaken,
        totalMl,
        drinkTypes,
        aiComment,
      });

      const saveRes = await apiPost<unknown>('/api/health-logs', payload);
      setIsSubmitting(false);

      if (saveRes.ok) {
        setResultModal({ show: true, msg: aiComment });
        onSaveSuccess();
      } else {
        if (saveRes.status === 401) handleUnauthorized(router);
        else alert('保存エラー: ' + (saveRes.error ?? saveRes.status));
      }
    },
    [router, getSnapshot, onSaveSuccess]
  );

  const handleCloseModal = useCallback(() => {
    setResultModal(null);
    router.push('/dashboard');
  }, [router]);

  return { isSubmitting, resultModal, handleSubmit, handleCloseModal };
}
