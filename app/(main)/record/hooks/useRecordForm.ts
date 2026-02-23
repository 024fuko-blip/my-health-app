import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  DRINK_PRESETS,
  calculateDecompositionTime,
  addHoursToTime,
  type AddedDrink,
} from '@/lib/alcohol-calc';
import { applyLogToForm } from './record-form-utils';
import type { HealthLogRow, UserSettingsMode } from './record-form-types';
import { useRecordInit, type PeriodSettings } from './useRecordInit';
import { useRecordSubmit, type SubmitFormSnapshot } from './useRecordSubmit';
import { useMealHandlers } from './useMealHandlers';
import { usePeriodHandlers } from './usePeriodHandlers';

export type { HealthLogRow, UserSettingsMode, NutritionData } from './record-form-types';

export function useRecordForm() {
  const router = useRouter();

  /* ---------- 設定系 state ---------- */
  const [modes, setModes] = useState<UserSettingsMode>({});
  const [aiPersonality, setAiPersonality] = useState<string>('tsundere');
  const [gender, setGender] = useState('unspecified');
  const [periodSettings, setPeriodSettings] = useState<PeriodSettings>({
    lastPeriodDate: '',
    periodCycle: 28,
    periodDuration: 5,
  });

  /* ---------- フォーム state ---------- */
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
  const [selectedEmotion, setSelectedEmotion] = useState('');
  const [sleepQuality, setSleepQuality] = useState('普通');
  const [mentalDiary, setMentalDiary] = useState('');
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [steps, setSteps] = useState('');
  const [exerciseMinutes, setExerciseMinutes] = useState('');
  const [previousAlcoholSummary, setPreviousAlcoholSummary] = useState('');
  /** 日付ごとの最終編集時刻。同一日のログ上書きを防ぐため日付を含む */
  const lastUserEditRef = useRef<{ date: string; time: number }>({ date: '', time: 0 });

  /* ---------- サブフック ---------- */
  const { loading, initData } = useRecordInit(router);

  const meal = useMealHandlers({
    mealDescription,
    setMealImageBase64,
    setCalories,
    setProtein,
  });

  const period = usePeriodHandlers({ setPeriodSettings, lastUserEditRef });

  const saveMedicationStatusToLog = useCallback(
    async (medKey: string, taken: boolean) => {
      lastUserEditRef.current = { date, time: Date.now() };
      try {
        await fetch('/api/health-logs/medication-status', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, med_key: medKey, taken }),
          credentials: 'include',
        });
      } catch (e) {
        console.error('Medication status save error:', e);
      }
    },
    [date]
  );

  const getSnapshot = useCallback(
    (): SubmitFormSnapshot => ({
      date, memo, mentalDiary, gender, skinCondition, periodStatus,
      mealDescription, mealImageBase64, modes, painLevel, stoolType,
      toiletCount, temperature, weight, bodyFat, calories, protein, steps,
      exerciseMinutes, generalMood, selectedEmotion, sleepQuality,
      medications, medicationTaken, addedDrinks,
    }),
    [
      date, memo, mentalDiary, gender, skinCondition, periodStatus,
      mealDescription, mealImageBase64, modes, painLevel, stoolType,
      toiletCount, temperature, weight, bodyFat, calories, protein, steps,
      exerciseMinutes, generalMood, selectedEmotion, sleepQuality,
      medications, medicationTaken, addedDrinks,
    ]
  );

  const onSaveSuccess = useCallback(() => {
    setMemo('');
    setAddedDrinks([]);
    setMealDescription('');
    setMealImageBase64(null);
    setPreviousAlcoholSummary('');
    setMentalDiary('');
  }, []);

  const submit = useRecordSubmit({ router, getSnapshot, onSaveSuccess });

  /* ---------- 初期データ反映 ---------- */
  const formSetters = useCallback(
    () => ({
      setPreviousAlcoholSummary, setMemo, setMedicationTaken, setGeneralMood,
      setPeriodStatus, setMealDescription, setMealImageBase64,
      setPainLevel, setStoolType, setToiletCount, setTemperature,
      setSkinCondition, setAddedDrinks, setDrinkStartTime, setDrinkEndTime,
      setSelectedEmotion, setSleepQuality, setMentalDiary,
      setWeight, setBodyFat, setCalories, setProtein, setSteps, setExerciseMinutes,
    }),
    []
  );

  useEffect(() => {
    if (!initData) return;
    setModes(initData.modes);
    setAiPersonality(initData.aiPersonality);
    setGender(initData.gender);
    setPeriodSettings(initData.periodSettings);
    setMedications(initData.medications);
    const initialMedState: Record<string, boolean> = {};
    initData.medications.forEach((med) => {
      med.timings.forEach((t) => { initialMedState[`${med.id}_${t}`] = false; });
    });
    setMedicationTaken(initialMedState);
    const today = new Date().toISOString().split('T')[0];
    const edit = lastUserEditRef.current;
    const recentEditSameDay = edit.date === today && Date.now() - edit.time < 5000;
    if (!recentEditSameDay) {
      const defaults = {
        temperature: initData.defaultTemperature,
        weight: initData.defaultWeight,
      };
      applyLogToForm(initData.todayLog, initData.medications, formSetters(), defaults);
    }
  }, [initData, formSetters]);

  /* ---------- 日付変更時のログ読み込み ---------- */
  const defaultsRef = useRef<{ temperature: string; weight: string }>({
    temperature: '',
    weight: '',
  });
  useEffect(() => {
    if (initData) {
      defaultsRef.current = {
        temperature: initData.defaultTemperature,
        weight: initData.defaultWeight,
      };
    }
  }, [initData]);
  const applyLog = useCallback(
    (log: HealthLogRow | null) =>
      applyLogToForm(log, medications, formSetters(), defaultsRef.current),
    [medications, formSetters]
  );

  useEffect(() => {
    if (loading) return;
    const fetchStarted = Date.now();
    const loadLogForDate = async () => {
      const sessionRes = await fetch('/api/auth/session', { credentials: 'include' });
      const sessionData = await sessionRes.json();
      if (!sessionData.user) return;
      const logRes = await fetch(`/api/health-logs?date=${date}`, { credentials: 'include' });
      if (logRes.status === 401) return;
      const log = logRes.ok ? await logRes.json() : null;
      const now = Date.now();
      const edit = lastUserEditRef.current;
      // 同一日付で5秒以内の編集、または取得開始後に編集があった場合は上書きしない
      const skipOverwrite =
        edit.date === date &&
        (now - edit.time < 5000 || edit.time > fetchStarted);
      if (skipOverwrite) return;
      applyLog((log as HealthLogRow) ?? null);
    };
    loadLogForDate();
  }, [date, loading, applyLog]);

  /* ---------- 飲酒ハンドラー ---------- */
  const handleAddDrink = () => {
    const preset = DRINK_PRESETS[selectedDrinkKey];
    const pure = preset.ml * (preset.percent / 100) * 0.8;
    setAddedDrinks((prev) => [
      ...prev,
      { id: Date.now(), label: preset.label, ml: preset.ml, percent: preset.percent, count: drinkCount, pureAlcohol: pure * drinkCount },
    ]);
    setDrinkCount(1);
  };

  const handleRemoveDrink = (id: number) =>
    setAddedDrinks((prev) => prev.filter((d) => d.id !== id));

  const currentTotalPureAlcohol = addedDrinks.reduce((sum, d) => sum + d.pureAlcohol, 0);
  const currentTotalMl = addedDrinks.reduce((sum, d) => sum + d.ml * d.count, 0);
  const effectiveWeight = weight ? parseFloat(weight) || 60 : 60;
  const decompositionHours = calculateDecompositionTime(currentTotalPureAlcohol, effectiveWeight);
  const soberTime = drinkEndTime ? addHoursToTime(drinkEndTime, decompositionHours) : '--:--';

  const markUserEdit = useCallback(
    () => {
      lastUserEditRef.current = { date, time: Date.now() };
    },
    [date]
  );

  /* ---------- 公開 API ---------- */
  return {
    loading, modes, aiPersonality, gender, periodSettings,
    defaultTemperature: initData?.defaultTemperature ?? '',
    defaultWeight: initData?.defaultWeight ?? '',
    date, setDate, markUserEdit,
    memo, setMemo,
    medicationTaken, setMedicationTaken, medications,
    generalMood, setGeneralMood,
    periodStatus, setPeriodStatus,
    savePeriodStatusToLog: period.savePeriodStatusToLog,
    saveMedicationStatusToLog,
    handlePeriodStart: period.handlePeriodStart,
    handlePeriodEnd: period.handlePeriodEnd,
    mealDescription, setMealDescription,
    mealImageBase64,
    painLevel, setPainLevel,
    stoolType,
    toiletCount, setToiletCount,
    temperature, setTemperature,
    skinCondition, setSkinCondition,
    addedDrinks, selectedDrinkKey, setSelectedDrinkKey,
    drinkCount, setDrinkCount,
    drinkStartTime, setDrinkStartTime,
    drinkEndTime, setDrinkEndTime,
    effectiveWeight,
    selectedEmotion, setSelectedEmotion,
    sleepQuality, setSleepQuality,
    mentalDiary, setMentalDiary,
    weight, setWeight,
    bodyFat, setBodyFat,
    calories, setCalories,
    protein, setProtein,
    steps, setSteps,
    exerciseMinutes, setExerciseMinutes,
    previousAlcoholSummary,
    handleAddDrink, handleRemoveDrink,
    currentTotalPureAlcohol, currentTotalMl,
    decompositionHours, soberTime,
    isSubmitting: submit.isSubmitting,
    resultModal: submit.resultModal,
    handleSubmit: submit.handleSubmit,
    handleCloseModal: submit.handleCloseModal,
    nutritionData: meal.nutritionData,
    setNutritionData: meal.setNutritionData,
    isAnalyzing: meal.isAnalyzing,
    isDragging: meal.isDragging,
    handleMealImageChange: meal.handleMealImageChange,
    handleDragOver: meal.handleDragOver,
    handleDragLeave: meal.handleDragLeave,
    handleDrop: meal.handleDrop,
    clearMealImage: meal.clearMealImage,
    handleEstimateFromText: meal.handleEstimateFromText,
  };
}
