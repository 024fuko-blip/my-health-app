import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  DRINK_PRESETS,
  calculateDecompositionTime,
  addHoursToTime,
  type AddedDrink,
} from '@/lib/alcohol-calc';
import { EMOTIONS } from '@/lib/record-constants';
import { applyLogToForm } from './record-form-utils';
import { processMealImageFile } from './meal-image-handler';
import type { HealthLogRow, UserSettingsMode, NutritionData } from './record-form-types';

export type { HealthLogRow, UserSettingsMode, NutritionData } from './record-form-types';

export function useRecordForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [modes, setModes] = useState<UserSettingsMode>({});
  const [aiPersonality, setAiPersonality] = useState<string>('asuka');
  const [gender, setGender] = useState('unspecified');
  const [periodSettings, setPeriodSettings] = useState({
    lastPeriodDate: '',
    periodCycle: 28,
    periodDuration: 5,
  });

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [memo, setMemo] = useState('');
  const [medicationTaken, setMedicationTaken] = useState<Record<string, boolean>>({});
  const [medications, setMedications] = useState<{ id: number; name: string; timings: string[] }[]>([]);
  const [generalMood, setGeneralMood] = useState(3);
  const [periodStatus, setPeriodStatus] = useState('なし');
  const [mealDescription, setMealDescription] = useState('');
  const [mealImageBase64, setMealImageBase64] = useState<string | null>(null);
  const [painLevel, setPainLevel] = useState(1);
  const [stoolType, setStoolType] = useState('普通');
  const [toiletCount, setToiletCount] = useState(0);
  const [temperature, setTemperature] = useState('');
  const [skinCondition, setSkinCondition] = useState(3);
  const [addedDrinks, setAddedDrinks] = useState<AddedDrink[]>([]);
  const [selectedDrinkKey, setSelectedDrinkKey] = useState('beer350');
  const [drinkCount, setDrinkCount] = useState(1);
  const [drinkStartTime, setDrinkStartTime] = useState('19:00');
  const [drinkEndTime, setDrinkEndTime] = useState('21:00');
  const [userWeight, setUserWeight] = useState(60);
  const [selectedEmotion, setSelectedEmotion] = useState('');
  const [sleepQuality, setSleepQuality] = useState('普通');
  const [mentalDiary, setMentalDiary] = useState('');
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [steps, setSteps] = useState('');
  const [exerciseMinutes, setExerciseMinutes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultModal, setResultModal] = useState<{ show: boolean; msg: string } | null>(null);
  const [previousAlcoholSummary, setPreviousAlcoholSummary] = useState('');
  const [nutritionData, setNutritionData] = useState<NutritionData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const applyLog = useCallback(
    (log: HealthLogRow | null) => {
      applyLogToForm(log, medications, {
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
      });
    },
    [medications]
  );

  useEffect(() => {
    const init = async () => {
      try {
        const sessionRes = await fetch('/api/auth/session', { credentials: 'include' });
        const sessionData = await sessionRes.json();
        if (!sessionData.user) {
          router.replace('/login');
          return;
        }
        const settingsRes = await fetch('/api/user-settings', { credentials: 'include' });
        if (settingsRes.status === 401) {
          router.replace('/login');
          return;
        }
        const settings = settingsRes.ok ? await settingsRes.json() : null;
        if (settings) {
          setModes({
            mode_ibd: Boolean(settings.mode_ibd),
            mode_diet: Boolean(settings.mode_diet),
            mode_alcohol: Boolean(settings.mode_alcohol),
            mode_mental: Boolean(settings.mode_mental),
          });
          setAiPersonality((settings.ai_personality as string) || 'asuka');
          setGender((settings.gender as string) || 'unspecified');

          try {
            const medData = JSON.parse(settings.current_medications || '{}');
            let meds: { id: number; name: string; timings: string[] }[] = [];
            if (medData.medications && Array.isArray(medData.medications)) {
              meds = medData.medications;
            } else if (medData.name || medData.timings) {
              if (medData.name || (medData.timings && medData.timings.length > 0)) {
                meds = [
                  {
                    id: Date.now(),
                    name: medData.name || '薬',
                    timings: medData.timings || [],
                  },
                ];
              }
            }
            setMedications(meds);
            const initialState: Record<string, boolean> = {};
            meds.forEach((med) => {
              med.timings.forEach((t) => {
                initialState[`${med.id}_${t}`] = false;
              });
            });
            setMedicationTaken(initialState);
          } catch {
            setMedications([]);
          }

          try {
            const medHistory = JSON.parse(settings.medical_history || '{}');
            setPeriodSettings({
              lastPeriodDate: medHistory.lastPeriodDate || '',
              periodCycle: medHistory.periodCycle || 28,
              periodDuration: medHistory.periodDuration || 5,
            });
          } catch {
            /* keep defaults */
          }
        }
        const today = new Date().toISOString().split('T')[0];
        const logRes = await fetch(`/api/health-logs?date=${today}`, { credentials: 'include' });
        if (logRes.status === 401) {
          router.replace('/login');
          return;
        }
        const log = logRes.ok ? await logRes.json() : null;
        applyLog((log as HealthLogRow) ?? null);
      } catch (err) {
        console.error('Record init error:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router, applyLog]);

  useEffect(() => {
    if (loading) return;
    const loadLogForDate = async () => {
      const sessionRes = await fetch('/api/auth/session', { credentials: 'include' });
      const sessionData = await sessionRes.json();
      if (!sessionData.user) return;
      const logRes = await fetch(`/api/health-logs?date=${date}`, { credentials: 'include' });
      if (logRes.status === 401) return;
      const log = logRes.ok ? await logRes.json() : null;
      applyLog((log as HealthLogRow) ?? null);
    };
    loadLogForDate();
  }, [date, loading, applyLog]);

  const handleAddDrink = () => {
    const preset = DRINK_PRESETS[selectedDrinkKey];
    const pure = preset.ml * (preset.percent / 100) * 0.8;
    setAddedDrinks((prev) => [
      ...prev,
      {
        id: Date.now(),
        label: preset.label,
        ml: preset.ml,
        percent: preset.percent,
        count: drinkCount,
        pureAlcohol: pure * drinkCount,
      },
    ]);
    setDrinkCount(1);
  };

  const handleRemoveDrink = (id: number) =>
    setAddedDrinks((prev) => prev.filter((d) => d.id !== id));

  const currentTotalPureAlcohol = addedDrinks.reduce((sum, d) => sum + d.pureAlcohol, 0);
  const currentTotalMl = addedDrinks.reduce((sum, d) => sum + d.ml * d.count, 0);
  const decompositionHours = calculateDecompositionTime(currentTotalPureAlcohol, userWeight);
  const soberTime = drinkEndTime ? addHoursToTime(drinkEndTime, decompositionHours) : '--:--';

  const handleMealImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processMealImageFile(file, {
        setMealImageBase64,
        setIsAnalyzing,
        setNutritionData,
        setCalories,
        setProtein,
      });
    }
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processMealImageFile(files[0], {
        setMealImageBase64,
        setIsAnalyzing,
        setNutritionData,
        setCalories,
        setProtein,
      });
    }
  };

  const clearMealImage = () => {
    setMealImageBase64(null);
    setNutritionData(null);
  };

  const handleEstimateFromText = async () => {
    const text = mealDescription.trim();
    if (!text) {
      alert('食事メモに内容を書いてから押してください');
      return;
    }
    setIsAnalyzing(true);
    setNutritionData(null);
    try {
      const res = await fetch('/api/analyze-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meal_description: text }),
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.error) {
          setNutritionData({ foods: [text] });
        } else {
          setNutritionData(data);
          if (data.calories != null) setCalories(String(data.calories));
          if (data.protein != null) setProtein(String(data.protein));
        }
      } else {
        setNutritionData({ foods: [text] });
      }
    } catch {
      setNutritionData({ foods: [text] });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const sessionRes = await fetch('/api/auth/session', { credentials: 'include' });
    const sessionData = await sessionRes.json();
    if (!sessionData.user) return;

    let totalMl = 0;
    const types: string[] = [];
    addedDrinks.forEach((d) => {
      totalMl += d.ml * d.count;
      types.push(`${d.label}x${d.count}`);
    });

    let aiComment = '';
    try {
      const aiRes = await fetch('/api/advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'daily',
          logs: null,
          meal_description: mealDescription,
          general_mood: generalMood,
          pain_level: modes.mode_ibd ? painLevel : 0,
          stool_type: modes.mode_ibd ? stoolType : '',
          weight: modes.mode_diet ? weight : '',
          steps: modes.mode_diet ? steps : '',
          alcohol_amount: modes.mode_alcohol ? totalMl : 0,
          medication_taken:
            medications.flatMap((med) => med.timings.map((t) => `${med.id}_${t}`)).length > 0
              ? medications
                  .flatMap((med) => med.timings.map((t) => `${med.id}_${t}`))
                  .every((key) => medicationTaken[key])
              : false,
          stress_level:
            modes.mode_mental && selectedEmotion
              ? EMOTIONS.find((e) => e.label === selectedEmotion)?.id
              : null,
          sleep_quality: modes.mode_mental ? sleepQuality : null,
          meal_image_base64: mealImageBase64 ?? undefined,
        }),
      });
      if (!aiRes.ok) throw new Error(`API Error: ${aiRes.status}`);
      const aiData = await aiRes.json();
      aiComment = aiData.advice;
    } catch {
      aiComment = '通信エラーよ！オネエがちょっと休憩中みたい。（API接続に失敗しました）';
    }

    const skinMemo = gender === 'female' ? `【肌】${skinCondition}` : '';
    const combinedMemo = [memo, mentalDiary, skinMemo].filter(Boolean).join('\n---\n');
    const allMedicationKeys = medications.flatMap((med) =>
      med.timings.map((t) => `${med.id}_${t}`)
    );
    const allMedicationTaken =
      allMedicationKeys.length > 0
        ? allMedicationKeys.every((key) => medicationTaken[key])
        : false;

    const payload: Record<string, unknown> = {
      date,
      memo: combinedMemo,
      medication_taken: allMedicationTaken,
      general_mood: generalMood,
      meal_description: mealDescription,
      period_status: gender === 'female' ? periodStatus : null,
      ai_comment: aiComment,
      pain_level: modes.mode_ibd ? painLevel : null,
      stool_type: modes.mode_ibd ? `トイレ${toiletCount}回` : null,
      alcohol_amount: modes.mode_alcohol ? totalMl : 0,
      alcohol_percent: 0,
      alcohol_type: modes.mode_alcohol ? types.join(', ') : null,
      stress_level:
        modes.mode_mental && selectedEmotion
          ? EMOTIONS.find((e) => e.label === selectedEmotion)?.id
          : null,
      sleep_quality: modes.mode_mental ? sleepQuality : null,
      spending: null,
      weight: (modes.mode_ibd || modes.mode_diet) && weight ? parseFloat(weight) : null,
      body_fat: modes.mode_diet && bodyFat ? parseFloat(bodyFat) : null,
      calories: modes.mode_diet && calories ? parseInt(calories) : null,
      protein: modes.mode_diet && protein ? parseFloat(protein) : null,
      steps: modes.mode_diet && steps ? parseInt(steps) : null,
      exercise_minutes: modes.mode_diet && exerciseMinutes ? parseInt(exerciseMinutes) : null,
    };

    const saveRes = await fetch('/api/health-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include',
    });

    setIsSubmitting(false);

    if (saveRes.ok) {
      setResultModal({ show: true, msg: aiComment });
      setMemo('');
      setAddedDrinks([]);
      setMealDescription('');
      setMealImageBase64(null);
      setPreviousAlcoholSummary('');
      setMentalDiary('');
    } else {
      if (saveRes.status === 401) {
        alert('セッションが切れました。再度ログインしてください。');
        router.replace('/login');
        return;
      }
      const errData = await saveRes.json().catch(() => ({}));
      alert('保存エラー: ' + (errData.error || saveRes.statusText));
    }
  };

  const handleCloseModal = () => {
    setResultModal(null);
    router.push('/dashboard');
  };

  const handlePeriodStart = async (dateStr: string) => {
    try {
      const res = await fetch('/api/user-settings/period', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ last_period_date: dateStr }),
        credentials: 'include',
      });
      if (res.ok) {
        setPeriodSettings((prev) => ({ ...prev, lastPeriodDate: dateStr }));
      }
    } catch (e) {
      console.error('Period start update error:', e);
    }
  };

  const handlePeriodEnd = async (_startDate: string, duration: number) => {
    try {
      const res = await fetch('/api/user-settings/period', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period_duration: duration }),
        credentials: 'include',
      });
      if (res.ok) {
        setPeriodSettings((prev) => ({ ...prev, periodDuration: duration }));
      }
    } catch (e) {
      console.error('Period end update error:', e);
    }
  };

  return {
    loading,
    modes,
    aiPersonality,
    gender,
    periodSettings,
    date,
    setDate,
    memo,
    setMemo,
    medicationTaken,
    setMedicationTaken,
    medications,
    generalMood,
    setGeneralMood,
    periodStatus,
    setPeriodStatus,
    handlePeriodStart,
    handlePeriodEnd,
    mealDescription,
    setMealDescription,
    mealImageBase64,
    painLevel,
    setPainLevel,
    stoolType,
    toiletCount,
    setToiletCount,
    temperature,
    setTemperature,
    skinCondition,
    setSkinCondition,
    addedDrinks,
    selectedDrinkKey,
    setSelectedDrinkKey,
    drinkCount,
    setDrinkCount,
    drinkStartTime,
    setDrinkStartTime,
    drinkEndTime,
    setDrinkEndTime,
    userWeight,
    setUserWeight,
    selectedEmotion,
    setSelectedEmotion,
    sleepQuality,
    setSleepQuality,
    mentalDiary,
    setMentalDiary,
    weight,
    setWeight,
    bodyFat,
    setBodyFat,
    calories,
    setCalories,
    protein,
    setProtein,
    steps,
    setSteps,
    exerciseMinutes,
    setExerciseMinutes,
    isSubmitting,
    resultModal,
    previousAlcoholSummary,
    nutritionData,
    setNutritionData,
    isAnalyzing,
    isDragging,
    handleAddDrink,
    handleRemoveDrink,
    currentTotalPureAlcohol,
    currentTotalMl,
    decompositionHours,
    soberTime,
    handleMealImageChange,
    clearMealImage,
    handleEstimateFromText,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleSubmit,
    handleCloseModal,
  };
}
