"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** 生理周期フェーズを判定 */
interface CyclePhase {
  phase: 'period' | 'follicular' | 'ovulation' | 'luteal_early' | 'pms' | 'unknown';
  dayInCycle: number;
  daysUntilPeriod: number;
  daysUntilOvulation: number;
  isOvulationWindow: boolean; // 妊娠しやすい時期
}

function getCyclePhase(
  targetDate: string,
  lastPeriodDate: string,
  periodCycle: number,
  periodDuration: number
): CyclePhase | null {
  if (!lastPeriodDate) return null;
  
  const target = new Date(targetDate);
  const lastPeriod = new Date(lastPeriodDate);
  
  // 最後の生理開始日からの日数
  const diffDays = Math.floor((target.getTime() - lastPeriod.getTime()) / (1000 * 60 * 60 * 24));
  
  // 周期内の何日目か（0始まり）
  const dayInCycle = ((diffDays % periodCycle) + periodCycle) % periodCycle;
  
  // 排卵日は次の生理開始の14日前 = 周期 - 14日目
  const ovulationDay = periodCycle - 14;
  
  // 次の生理までの日数
  const daysUntilPeriod = periodCycle - dayInCycle;
  
  // 排卵日までの日数
  const daysUntilOvulation = ovulationDay - dayInCycle;
  
  // 妊娠しやすい期間（排卵日の5日前〜排卵日）
  const isOvulationWindow = dayInCycle >= (ovulationDay - 5) && dayInCycle <= ovulationDay;
  
  let phase: CyclePhase['phase'] = 'unknown';
  
  if (dayInCycle < periodDuration) {
    // 生理中
    phase = 'period';
  } else if (dayInCycle < ovulationDay - 3) {
    // 卵胞期（生理後〜排卵3日前）
    phase = 'follicular';
  } else if (dayInCycle <= ovulationDay) {
    // 排卵期（排卵日前後）
    phase = 'ovulation';
  } else if (daysUntilPeriod > 10) {
    // 黄体期前半
    phase = 'luteal_early';
  } else {
    // PMS期間（生理10日前〜）
    phase = 'pms';
  }
  
  return {
    phase,
    dayInCycle: dayInCycle + 1, // 1始まりに
    daysUntilPeriod,
    daysUntilOvulation,
    isOvulationWindow,
  };
}

/** ツンデレAIコメントを生成 */
function getTsundereComment(phase: CyclePhase): string {
  const { phase: p, dayInCycle, daysUntilPeriod, daysUntilOvulation, isOvulationWindow } = phase;
  
  switch (p) {
    case 'period':
      return `💢 生理${dayInCycle}日目ね...体がつらいのは分かってるわよ。
別にあんたのこと心配してるわけじゃないけど、今日は無理しないで。
温かいものでも飲みなさい。貧血にも気をつけなさいよね！`;
    
    case 'follicular':
      return `✨ 今日は周期${dayInCycle}日目、卵胞期よ！
肌の調子もいいし、体も軽いはず...あんた今日は絶好調でしょ？
勘違いしないでよね、別に褒めてないわよ。客観的事実を言ってるだけ。
${daysUntilOvulation > 0 ? `排卵日まであと${daysUntilOvulation}日...` : ''}`;
    
    case 'ovulation':
      const ovuMsg = isOvulationWindow 
        ? `\n⚠️ 妊娠しやすい時期よ！心当たりがあるなら気をつけなさい！` 
        : '';
      return `🥚 排卵期（周期${dayInCycle}日目）ね。
おりものが増えたり、お腹が張ったりするかも。
体温も上がり始めるから、だるさを感じても普通よ。${ovuMsg}
...別に、あんたの体のこと詳しく知りたいわけじゃないわよ！`;
    
    case 'luteal_early':
      return `🌙 黄体期前半（周期${dayInCycle}日目）ね。
次の生理まであと${daysUntilPeriod}日...今のうちにやりたいこと済ませときなさい。
まだ比較的安定してるから、調子に乗らないでよね。
PMSが来る前の貴重な時間よ、有効に使いなさい！`;
    
    case 'pms':
      const intensity = daysUntilPeriod <= 3 ? '特に' : '';
      return `⚠️ PMS期間突入よ（周期${dayInCycle}日目）！
生理まであと${daysUntilPeriod}日...${intensity}イライラしやすいから気をつけなさい！

😤 イライラ・情緒不安定
🍫 食欲増加・甘いもの欲
😴 眠気・だるさ  
💢 肌荒れ注意！

...あんたがつらいのは分かってるわよ。でも周りに当たらないでよね！
チョコでも食べて落ち着きなさい。別に優しくしてるわけじゃないわよ！`;
    
    default:
      return '';
  }
}

interface DrinkPreset {
  label: string;
  ml: number;
  percent: number;
}

interface AddedDrink {
  id: number;
  label: string;
  ml: number;
  percent: number;
  count: number;
  pureAlcohol: number;
}

interface HealthLogRow {
  id: string;
  memo?: string | null;
  medication_taken?: boolean | null;
  general_mood?: number | null;
  period_status?: string | null;
  meal_description?: string | null;
  pain_level?: number | null;
  stool_type?: string | null;
  alcohol_amount?: number | null;
  alcohol_type?: string | null;
  stress_level?: number | null;
  sleep_quality?: string | null;
  spending?: number | null;
  weight?: number | null;
  body_fat?: number | null;
  calories?: number | null;
  protein?: number | null;
  steps?: number | null;
  exercise_minutes?: number | null;
}

/** 設定のモードフラグ（DB user_settings の一部）。参照前に定義しておく */
interface UserSettingsMode {
  mode_ibd?: boolean;
  mode_diet?: boolean;
  mode_alcohol?: boolean;
  mode_mental?: boolean;
}

/** 感情ボタン用 */
const EMOTIONS = [
  { id: 1, emoji: '😊', label: '嬉しい' },
  { id: 2, emoji: '😌', label: '穏やか' },
  { id: 3, emoji: '😐', label: '普通' },
  { id: 4, emoji: '😢', label: '悲しい' },
  { id: 5, emoji: '😠', label: 'イライラ' },
  { id: 6, emoji: '😰', label: '不安' },
  { id: 7, emoji: '😴', label: '疲れた' },
];

const DRINK_PRESETS: Record<string, DrinkPreset> = {
  beer350: { label: "ビール (350ml)", ml: 350, percent: 5 },
  beer500: { label: "ビール (500ml)", ml: 500, percent: 5 },
  highball350: { label: "ハイボール (350ml)", ml: 350, percent: 7 },
  highball500: { label: "ハイボール (500ml)", ml: 500, percent: 7 },
  chuhai350: { label: "チューハイ (350ml)", ml: 350, percent: 5 },
  chuhai500: { label: "チューハイ (500ml)", ml: 500, percent: 5 },
  strongChuhai: { label: "ストロング系 (350ml)", ml: 350, percent: 9 },
  sake: { label: "日本酒 (1合)", ml: 180, percent: 15 },
  wine: { label: "ワイン (グラス)", ml: 120, percent: 12 },
  wineBottle: { label: "ワイン (ボトル)", ml: 750, percent: 12 },
  shochu: { label: "焼酎 (ロック1杯)", ml: 60, percent: 25 },
  whiskey: { label: "ウイスキー (シングル)", ml: 30, percent: 40 },
};

/** 純アルコール量(g)から分解時間を計算（体重ベース） */
function calculateDecompositionTime(pureAlcoholGrams: number, bodyWeightKg: number = 60): number {
  // 体重1kgあたり1時間に約0.1gのアルコールを分解
  const ratePerHour = bodyWeightKg * 0.1;
  return pureAlcoholGrams / ratePerHour;
}

/** 時刻文字列(HH:MM)に時間を加算して新しい時刻を返す */
function addHoursToTime(timeStr: string, hours: number): string {
  const [h, m] = timeStr.split(':').map(Number);
  const totalMinutes = h * 60 + m + Math.round(hours * 60);
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  const nextDay = totalMinutes >= 24 * 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}${nextDay ? ' (翌日)' : ''}`;
}

/** DBの alcohol_type 文字列（例: "ビール (350ml)x2, ハイボール (350ml)x1"）を addedDrinks に復元する */
function parseAlcoholTypeToAddedDrinks(
  alcoholType: string | null | undefined,
  alcoholAmountMl: number | null | undefined
): AddedDrink[] {
  const result: AddedDrink[] = [];
  if (!alcoholType || !alcoholType.trim()) {
    return result;
  }
  const parts = alcoholType.split(/\s*[,、]\s*/).map((p) => p.trim()).filter(Boolean);
  let totalMlParsed = 0;
  for (let i = 0; i < parts.length; i++) {
    const match = parts[i].match(/^(.+?)x(\d+)$/);
    if (!match) continue;
    const [, label, countStr] = match;
    const count = parseInt(countStr, 10) || 1;
    const preset = Object.values(DRINK_PRESETS).find((p) => p.label === label);
    if (preset) {
      const pure = preset.ml * (preset.percent / 100) * 0.8;
      result.push({
        id: Date.now() + i,
        label: preset.label,
        ml: preset.ml,
        percent: preset.percent,
        count,
        pureAlcohol: pure * count,
      });
      totalMlParsed += preset.ml * count;
    } else {
      // 手入力データの復元を試みる
      const customMatch = label.match(/手入力 \((\d+)ml, ([\d.]+)%\)/);
      if (customMatch) {
        const ml = parseInt(customMatch[1]);
        const percent = parseFloat(customMatch[2]);
        const pure = ml * (percent / 100) * 0.8;
        result.push({
          id: Date.now() + i,
          label,
          ml,
          percent,
          count,
          pureAlcohol: pure * count,
        });
        totalMlParsed += ml * count;
      }
    }
  }
  const amount = alcoholAmountMl ?? 0;
  if (amount > totalMlParsed && amount > 0) {
    result.push({
      id: Date.now() + 999,
      label: `その他 (${amount - totalMlParsed}ml)`,
      ml: amount - totalMlParsed,
      percent: 5,
      count: 1,
      pureAlcohol: 0,
    });
  }
  return result;
}

export default function RecordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [modes, setModes] = useState<UserSettingsMode>({});
  const [gender, setGender] = useState('unspecified');
  const [medicalHistory, setMedicalHistory] = useState('');
  
  // 生理周期設定
  const [periodSettings, setPeriodSettings] = useState({
    lastPeriodDate: '',
    periodCycle: 28,
    periodDuration: 5,
  });

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [memo, setMemo] = useState('');
  // 複数の薬の服用状態（薬ID_タイミング → boolean）
  const [medicationTaken, setMedicationTaken] = useState<Record<string, boolean>>({});
  // 薬のリスト
  const [medications, setMedications] = useState<{ id: number; name: string; timings: string[] }[]>([]);
  const [generalMood, setGeneralMood] = useState(3);
  const [periodStatus, setPeriodStatus] = useState('なし');

  const [mealDescription, setMealDescription] = useState('');
  /** 食事写真（Base64 data URL）。API送信用・プレビュー用 */
  const [mealImageBase64, setMealImageBase64] = useState<string | null>(null);

  const [painLevel, setPainLevel] = useState(1);
  const [stoolType, setStoolType] = useState('普通');
  const [toiletCount, setToiletCount] = useState(0);
  const [temperature, setTemperature] = useState('');
  
  // 肌の調子（女性限定）
  const [skinCondition, setSkinCondition] = useState(3);

  const [addedDrinks, setAddedDrinks] = useState<AddedDrink[]>([]);
  const [selectedDrinkKey, setSelectedDrinkKey] = useState('beer350');
  const [drinkCount, setDrinkCount] = useState(1);
  
  // 飲酒時間
  const [drinkStartTime, setDrinkStartTime] = useState('19:00');
  const [drinkEndTime, setDrinkEndTime] = useState('21:00');
  
  // 体重（分解時間計算用、設定から取得も可能）
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
  /** アルコール内訳を復元できなかった場合の表示用（例: "以前の記録: 350ml"） */
  const [previousAlcoholSummary, setPreviousAlcoholSummary] = useState('');
  
  // 食事の栄養分析結果
  const [nutritionData, setNutritionData] = useState<{
    foods?: string[];
    calories?: number;
    protein?: number;
    fat?: number;
    carbs?: number;
    fiber?: number;
    salt?: number;
    notes?: string;
  } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // ドラッグ&ドロップ状態
  const [isDragging, setIsDragging] = useState(false);

  function applyLogToForm(log: HealthLogRow | null): void {
    if (!log) {
      setPreviousAlcoholSummary('');
      setMemo('');
      // 薬の状態をリセット（全薬・全タイミング）
      const resetMed: Record<string, boolean> = {};
      medications.forEach(med => {
        med.timings.forEach(t => { resetMed[`${med.id}_${t}`] = false; });
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
    // 薬の状態を復元（旧データは全タイミングに適用）
    const medState: Record<string, boolean> = {};
    medications.forEach(med => {
      med.timings.forEach(t => { medState[`${med.id}_${t}`] = !!log.medication_taken; });
    });
    setMedicationTaken(medState);
    setGeneralMood(log.general_mood ?? 3);
    setPeriodStatus(log.period_status || 'なし');
    setMealDescription(log.meal_description || '');
    setPainLevel(log.pain_level ?? 1);
    setStoolType(log.stool_type || '普通');
    // stool_typeから回数を抽出（「トイレX回」形式）
    const toiletMatch = (log.stool_type || '').match(/トイレ(\d+)回/);
    setToiletCount(toiletMatch ? parseInt(toiletMatch[1]) : 0);
    setTemperature('');
    // memoから肌の調子を抽出（「【肌】X」形式）
    const skinMatch = (log.memo || '').match(/【肌】(\d)/);
    setSkinCondition(skinMatch ? parseInt(skinMatch[1]) : 3);
    setDrinkStartTime('19:00');
    setDrinkEndTime('21:00');
    // stress_levelを感情IDとして使用
    const emotionId = log.stress_level ?? 0;
    const emotion = EMOTIONS.find(e => e.id === emotionId);
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
          setGender((settings.gender as string) || 'unspecified');
          setMedicalHistory((settings.medical_history as string) || '');
          
          // 薬の情報を取得（複数対応）
          try {
            const medData = JSON.parse(settings.current_medications || '{}');
            let meds: { id: number; name: string; timings: string[] }[] = [];
            
            // 新形式（配列）
            if (medData.medications && Array.isArray(medData.medications)) {
              meds = medData.medications;
            }
            // 旧形式（単一の薬）からの移行
            else if (medData.name || medData.timings) {
              if (medData.name || (medData.timings && medData.timings.length > 0)) {
                meds = [{ id: Date.now(), name: medData.name || '薬', timings: medData.timings || [] }];
              }
            }
            
            setMedications(meds);
            
            // 初期状態はすべて未服用
            const initialState: Record<string, boolean> = {};
            meds.forEach(med => {
              med.timings.forEach(t => { initialState[`${med.id}_${t}`] = false; });
            });
            setMedicationTaken(initialState);
          } catch {
            setMedications([]);
          }
          
          // 生理周期情報を取得
          try {
            const medHistory = JSON.parse(settings.medical_history || '{}');
            setPeriodSettings({
              lastPeriodDate: medHistory.lastPeriodDate || '',
              periodCycle: medHistory.periodCycle || 28,
              periodDuration: medHistory.periodDuration || 5,
            });
          } catch {
            // パースエラー時はデフォルト値を維持
          }
        }
        const today = new Date().toISOString().split('T')[0];
        const logRes = await fetch(`/api/health-logs?date=${today}`, { credentials: 'include' });
        if (logRes.status === 401) {
          router.replace('/login');
          return;
        }
        const log = logRes.ok ? await logRes.json() : null;
        applyLogToForm((log as HealthLogRow) ?? null);
      } catch (err) {
        console.error('Record init error:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  useEffect(() => {
    if (loading) return;
    const loadLogForDate = async () => {
      const sessionRes = await fetch('/api/auth/session', { credentials: 'include' });
      const sessionData = await sessionRes.json();
      if (!sessionData.user) return;
      const logRes = await fetch(`/api/health-logs?date=${date}`, { credentials: 'include' });
      if (logRes.status === 401) return;
      const log = logRes.ok ? await logRes.json() : null;
      applyLogToForm((log as HealthLogRow) ?? null);
    };
    loadLogForDate();
  }, [date, loading]);

  const handleAddDrink = () => {
    const preset = DRINK_PRESETS[selectedDrinkKey];
    const pure = preset.ml * (preset.percent / 100) * 0.8;
    setAddedDrinks([...addedDrinks, { 
      id: Date.now(), 
      label: preset.label, 
      ml: preset.ml, 
      percent: preset.percent,
      count: drinkCount, 
      pureAlcohol: pure * drinkCount 
    }]);
    setDrinkCount(1);
  };
  
  const handleRemoveDrink = (id: number) => setAddedDrinks(addedDrinks.filter(d => d.id !== id));
  const currentTotalPureAlcohol = addedDrinks.reduce((sum, d) => sum + d.pureAlcohol, 0);
  const currentTotalMl = addedDrinks.reduce((sum, d) => sum + d.ml * d.count, 0);
  const decompositionHours = calculateDecompositionTime(currentTotalPureAlcohol, userWeight);
  const soberTime = drinkEndTime ? addHoursToTime(drinkEndTime, decompositionHours) : '--:--';

  // 画像ファイルを処理する共通関数
  const processImageFile = async (file: File) => {
    if (!file) return;
    
    const fileName = file.name.toLowerCase();
    
    // HEICファイルの警告
    if (fileName.endsWith('.heic') || fileName.endsWith('.heif')) {
      alert('HEICファイルはブラウザで表示できません。\niPhoneの設定で「互換性優先」にするか、JPG/PNGに変換してください。\n\n設定 > カメラ > フォーマット > 互換性優先');
      return;
    }
    
    // MIMEタイプまたは拡張子で画像判定
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const isImageByType = file.type.startsWith('image/');
    const isImageByExt = imageExtensions.some(ext => fileName.endsWith(ext));
    if (!isImageByType && !isImageByExt) {
      alert('対応形式: JPG, PNG, GIF, WebP');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = async () => {
      const result = reader.result;
      if (typeof result === 'string') {
        // data:image/ で始まることを確認
        if (!result.startsWith('data:image/')) {
          alert('画像ファイルとして読み込めませんでした。\nJPGまたはPNG形式で保存し直してください。');
          return;
        }
        
        setMealImageBase64(result);
        
        // 自動で栄養分析を開始
        setIsAnalyzing(true);
        setNutritionData(null);
        try {
          const res = await fetch('/api/analyze-meal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_base64: result }),
            credentials: 'include',
          });
          if (res.ok) {
            const data = await res.json();
            if (data.error) {
              console.error('API error:', data.error);
              // エラーでもfoodsを手動で入力できるようにする
              setNutritionData({ foods: ['料理名を入力してください'] });
            } else {
              setNutritionData(data);
              // カロリーとタンパク質を自動入力
              if (data.calories) setCalories(String(data.calories));
              if (data.protein) setProtein(String(data.protein));
            }
          } else {
            console.error('API response error:', res.status);
            setNutritionData({ foods: ['料理名を入力してください'] });
          }
        } catch (err) {
          console.error('Meal analysis error:', err);
          setNutritionData({ foods: ['料理名を入力してください'] });
        } finally {
          setIsAnalyzing(false);
        }
      }
    };
    reader.onerror = () => {
      console.error('Failed to read image');
      alert('画像の読み込みに失敗しました。別の画像を選んでください。');
    };
    reader.readAsDataURL(file);
  };

  const handleMealImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
    e.target.value = '';
  };
  
  // ドラッグ&ドロップハンドラー
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
      const file = files[0];
      // processImageFile内で判定するので、そのまま渡す
      processImageFile(file);
    }
  };

  const clearMealImage = () => {
    setMealImageBase64(null);
    setNutritionData(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const sessionRes = await fetch('/api/auth/session', { credentials: 'include' });
    const sessionData = await sessionRes.json();
    if (!sessionData.user) return;

    // アルコール集計
    let totalMl = 0; let types: string[] = [];
    addedDrinks.forEach(d => { totalMl += d.ml * d.count; types.push(`${d.label}x${d.count}`); });

    // 1. AI分析 (APIへ送信)
    let aiComment = "";
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
          medication_taken: medications.flatMap(med => med.timings.map(t => `${med.id}_${t}`)).length > 0 
            ? medications.flatMap(med => med.timings.map(t => `${med.id}_${t}`)).every(key => medicationTaken[key])
            : false,
          stress_level: modes.mode_mental && selectedEmotion ? EMOTIONS.find(e => e.label === selectedEmotion)?.id : null,
          sleep_quality: modes.mode_mental ? sleepQuality : null,
          meal_image_base64: mealImageBase64 ?? undefined,
        })
      });

      if (!aiRes.ok) {
        const errorText = await aiRes.text();
        throw new Error(`API Error: ${aiRes.status} ${errorText}`);
      }

      const aiData = await aiRes.json();
      aiComment = aiData.advice;

    } catch (err) {
      console.error("AI Error Details:", err);
      aiComment = "通信エラーよ！オネエがちょっと休憩中みたい。（API接続に失敗しました）";
    }

    // 2. DB保存（同一日付は上書き）
    // memoとmentalDiaryを結合、女性の場合は肌の調子も含める
    const skinMemo = gender === 'female' ? `【肌】${skinCondition}` : '';
    const combinedMemo = [memo, mentalDiary, skinMemo].filter(Boolean).join('\n---\n');
    
    // 全ての薬の全てのタイミングを飲んだかどうか
    const allMedicationKeys = medications.flatMap(med => 
      med.timings.map(t => `${med.id}_${t}`)
    );
    const allMedicationTaken = allMedicationKeys.length > 0
      ? allMedicationKeys.every(key => medicationTaken[key])
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

      stress_level: modes.mode_mental && selectedEmotion ? EMOTIONS.find(e => e.label === selectedEmotion)?.id : null,
      sleep_quality: modes.mode_mental ? sleepQuality : null,
      spending: null,

      // 体重はIBDモードまたはボディメイクモードで保存
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
      console.error('Record save error:', saveRes.status, errData);
      alert('保存エラー: ' + (errData.error || saveRes.statusText));
    }
  };

  const handleCloseModal = () => {
    setResultModal(null);
    router.push('/dashboard'); 
  };

  if (loading) return <div>読み込み中...</div>;

  // 生理周期に基づく体調予測
  const cyclePhase = gender === 'female' && periodSettings.lastPeriodDate
    ? getCyclePhase(date, periodSettings.lastPeriodDate, periodSettings.periodCycle, periodSettings.periodDuration)
    : null;
  const tsundereComment = cyclePhase ? getTsundereComment(cyclePhase) : '';

  // 日付のフォーマット（大きく表示用）
  const dateObj = new Date(date);
  const isToday = date === new Date().toISOString().split('T')[0];
  const formattedDate = dateObj.toLocaleDateString('ja-JP', { 
    month: 'long', 
    day: 'numeric',
    weekday: 'short'
  });

  return (
    <div className="space-y-6 pb-24 relative">
      {/* 日付表示（大きく） */}
      <div className="bg-white p-4 rounded-xl shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold text-gray-800">{formattedDate}</p>
            {isToday && <span className="text-sm text-blue-600 font-medium">📅 今日</span>}
          </div>
          <input 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)} 
            className="text-sm border p-2 rounded text-gray-500 w-auto"
          />
        </div>
      </div>
      
      {/* 生理周期予測コメント（女性のみ）- 日付の下 */}
      {gender === 'female' && periodSettings.lastPeriodDate && cyclePhase && (
        <div className="relative">
          {/* 吹き出し */}
          <div className="bg-gradient-to-r from-pink-100 to-purple-100 p-4 rounded-2xl border-2 border-pink-300 shadow-lg relative">
            {/* 吹き出しの三角 */}
            <div className="absolute -bottom-3 left-8 w-6 h-6 bg-gradient-to-br from-pink-100 to-purple-100 border-r-2 border-b-2 border-pink-300 transform rotate-45"></div>
            
            <div className="flex items-start gap-3">
              <div className="text-4xl flex-shrink-0">
                {cyclePhase.phase === 'period' && '😣'}
                {cyclePhase.phase === 'follicular' && '✨'}
                {cyclePhase.phase === 'ovulation' && '🥚'}
                {cyclePhase.phase === 'luteal_early' && '🌙'}
                {cyclePhase.phase === 'pms' && '😤'}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-pink-800 text-sm">💋 今日のあんたへ</span>
                  <span className="text-xs text-pink-600 bg-pink-200 px-2 py-0.5 rounded-full">
                    周期 {cyclePhase.dayInCycle}日目
                  </span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {tsundereComment}
                </p>
                
                {/* 周期情報サマリー */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {cyclePhase.daysUntilPeriod > 0 && (
                    <span className="text-xs bg-white px-2 py-1 rounded-full border border-pink-200">
                      🩸 生理まで {cyclePhase.daysUntilPeriod}日
                    </span>
                  )}
                  {cyclePhase.daysUntilOvulation > 0 && cyclePhase.phase !== 'pms' && (
                    <span className="text-xs bg-white px-2 py-1 rounded-full border border-purple-200">
                      🥚 排卵まで {cyclePhase.daysUntilOvulation}日
                    </span>
                  )}
                  {cyclePhase.isOvulationWindow && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full border border-red-200 font-bold">
                      ⚠️ 妊娠しやすい時期
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* キャラクター */}
          <div className="absolute -bottom-1 left-2 text-3xl">👹</div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* 基本情報 */}
        <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
          {/* 薬の服用チェック（複数対応） */}
          {medications.length > 0 && (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-800 text-sm">💊 今日の薬</span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  medications.flatMap(med => med.timings.map(t => `${med.id}_${t}`)).every(key => medicationTaken[key])
                    ? 'bg-green-200 text-green-800'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {medications.flatMap(med => med.timings.map(t => `${med.id}_${t}`)).filter(key => medicationTaken[key]).length}/
                  {medications.flatMap(med => med.timings).length}
                </span>
              </div>
              
              {medications.map(med => (
                <div key={med.id} className="bg-white p-2 rounded-lg border border-blue-100">
                  <div className="text-xs font-bold text-blue-700 mb-2">{med.name}</div>
                  <div className="grid grid-cols-4 gap-1">
                    {med.timings.map(timing => {
                      const key = `${med.id}_${timing}`;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setMedicationTaken(prev => ({
                            ...prev,
                            [key]: !prev[key]
                          }))}
                          className={`py-1.5 rounded-lg border-2 font-bold text-xs transition ${
                            medicationTaken[key]
                              ? 'border-green-500 bg-green-100 text-green-800'
                              : 'border-gray-200 bg-gray-50 text-gray-400'
                          }`}
                        >
                          {timing}
                          {medicationTaken[key] && ' ✓'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 生理チェック（女性のみ）- シンプルなチェックボックス */}
          {gender === 'female' && (
            <button
              type="button"
              onClick={() => setPeriodStatus(periodStatus === '生理中' ? 'なし' : '生理中')}
              className={`w-full p-3 rounded-lg border-2 flex items-center justify-center gap-2 font-bold transition ${
                periodStatus === '生理中'
                  ? 'border-pink-500 bg-pink-100 text-pink-800'
                  : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-pink-300'
              }`}
            >
              <span className="text-xl">🩸</span>
              <span>生理きた</span>
              {periodStatus === '生理中' && <span>✓</span>}
            </button>
          )}
          
          {/* 肌の調子（女性のみ） */}
          {gender === 'female' && (
            <div className="bg-pink-50 p-3 rounded-lg border border-pink-200">
              <label className="text-xs font-bold text-pink-700 block mb-2">✨ 肌の調子</label>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map(level => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setSkinCondition(level)}
                    className={`py-2 rounded-lg border-2 font-bold transition ${
                      skinCondition === level
                        ? level >= 4 
                          ? 'border-green-500 bg-green-100 text-green-800'
                          : level === 3
                          ? 'border-yellow-500 bg-yellow-100 text-yellow-800'
                          : 'border-red-500 bg-red-100 text-red-800'
                        : 'border-gray-200 bg-white text-gray-500 hover:border-pink-300'
                    }`}
                  >
                    <span className="text-lg block">
                      {level === 1 && '😱'}
                      {level === 2 && '😣'}
                      {level === 3 && '😐'}
                      {level === 4 && '😊'}
                      {level === 5 && '✨'}
                    </span>
                    <span className="text-xs">{level}</span>
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
                <span>荒れ荒れ</span>
                <span>絶好調</span>
              </div>
            </div>
          )}
        </div>


       {/* 🍽️ 食事記録エリア */}
        <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 space-y-3">
          <h3 className="font-bold text-orange-800">🍽️ 食事メモ (AI分析用)</h3>
          <textarea 
            value={mealDescription} 
            onChange={(e) => setMealDescription(e.target.value)} 
            className="w-full h-24 p-2 border rounded text-sm" 
            placeholder="例: ラーメン大盛り、餃子。お腹いっぱい..." 
          />
          
          <div className="space-y-2">
            {/* ドラッグ&ドロップエリア */}
            {!mealImageBase64 && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                  isDragging
                    ? 'border-orange-500 bg-orange-100 scale-[1.02]'
                    : 'border-orange-300 bg-white hover:border-orange-400'
                }`}
              >
                <div className="space-y-2">
                  <div className="text-4xl">{isDragging ? '📥' : '📷'}</div>
                  <p className="text-sm text-gray-600">
                    {isDragging ? (
                      <span className="font-bold text-orange-600">ここにドロップ！</span>
                    ) : (
                      <>
                        <span className="font-bold">食事写真をドラッグ&ドロップ</span>
                        <br />
                        <span className="text-xs text-gray-400">または下のボタンから選択</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            )}
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleMealImageChange} 
                className="hidden" 
              />
              <span className="bg-orange-500 text-white text-sm px-3 py-2 rounded-lg font-bold hover:bg-orange-600 transition">
                📷 {mealImageBase64 ? '写真を変更' : 'ファイルを選択'}
              </span>
            </label>

            {mealImageBase64 && (
              <div className="space-y-3">
                {/* 写真サムネイル（小さく表示） */}
                <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-orange-200">
                  <div className="relative flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={mealImageBase64} 
                      alt="食事" 
                      className="w-16 h-16 rounded-lg object-cover" 
                    />
                    <button 
                      type="button" 
                      onClick={clearMealImage} 
                      className="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 rounded-full text-xs font-bold shadow hover:bg-red-600"
                      aria-label="写真を削除"
                    >
                      ×
                    </button>
                  </div>
                  <div className="flex-1 text-xs text-gray-500">
                    {isAnalyzing ? (
                      <span className="text-orange-600 flex items-center gap-1">
                        <span className="animate-spin">🔄</span> 料理を認識中...
                      </span>
                    ) : nutritionData ? (
                      <span className="text-green-600">✓ 認識完了</span>
                    ) : (
                      <span>写真をアップロード済み</span>
                    )}
                  </div>
                </div>
                
                {/* 認識した料理リスト（編集可能） */}
                {nutritionData && (
                  <div className="bg-white p-3 rounded-lg border border-orange-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-orange-700">🍽️ 認識した料理</span>
                      <span className="text-xs text-gray-400">タップで編集</span>
                    </div>
                    
                    {/* 料理名リスト */}
                    <div className="space-y-2">
                      {(nutritionData.foods || []).map((food, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={food}
                            onChange={(e) => {
                              const newFoods = [...(nutritionData.foods || [])];
                              newFoods[index] = e.target.value;
                              setNutritionData({ ...nutritionData, foods: newFoods });
                            }}
                            className="flex-1 p-2 border border-orange-200 rounded text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newFoods = (nutritionData.foods || []).filter((_, i) => i !== index);
                              setNutritionData({ ...nutritionData, foods: newFoods });
                            }}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                      
                      {/* 料理追加ボタン */}
                      <button
                        type="button"
                        onClick={() => {
                          const newFoods = [...(nutritionData.foods || []), ''];
                          setNutritionData({ ...nutritionData, foods: newFoods });
                        }}
                        className="w-full p-2 border-2 border-dashed border-orange-300 rounded text-sm text-orange-600 hover:bg-orange-50"
                      >
                        + 料理を追加
                      </button>
                    </div>
                    
                    {/* 栄養データ（コンパクト表示） */}
                    <div className="pt-2 border-t border-orange-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-orange-700">📊 推定栄養素</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-center text-xs">
                        <div className="bg-red-50 p-1.5 rounded">
                          <span className="text-gray-500 block">カロリー</span>
                          <span className="font-bold text-red-700">{nutritionData.calories ?? '—'}</span>
                          <span className="text-gray-400">kcal</span>
                        </div>
                        <div className="bg-blue-50 p-1.5 rounded">
                          <span className="text-gray-500 block">タンパク質</span>
                          <span className="font-bold text-blue-700">{nutritionData.protein ?? '—'}</span>
                          <span className="text-gray-400">g</span>
                        </div>
                        <div className="bg-yellow-50 p-1.5 rounded">
                          <span className="text-gray-500 block">脂質</span>
                          <span className="font-bold text-yellow-700">{nutritionData.fat ?? '—'}</span>
                          <span className="text-gray-400">g</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-center text-xs mt-1">
                        <div className="bg-green-50 p-1.5 rounded">
                          <span className="text-gray-500 block">炭水化物</span>
                          <span className="font-bold text-green-700">{nutritionData.carbs ?? '—'}</span>
                          <span className="text-gray-400">g</span>
                        </div>
                        <div className="bg-purple-50 p-1.5 rounded">
                          <span className="text-gray-500 block">食物繊維</span>
                          <span className="font-bold text-purple-700">{nutritionData.fiber ?? '—'}</span>
                          <span className="text-gray-400">g</span>
                        </div>
                        <div className="bg-gray-50 p-1.5 rounded">
                          <span className="text-gray-500 block">塩分</span>
                          <span className="font-bold text-gray-700">{nutritionData.salt ?? '—'}</span>
                          <span className="text-gray-400">g</span>
                        </div>
                      </div>
                    </div>
                    
                    {nutritionData.notes && (
                      <p className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                        💡 {nutritionData.notes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 💊 IBD */}
        {modes.mode_ibd && (
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 space-y-4">
            <h3 className="font-bold text-blue-800">💊 IBDチェック</h3>
            
            {/* 体温・体重 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-blue-700 block mb-1">🌡️ 体温</label>
                <div className="flex items-center gap-1">
                  <input 
                    type="number" 
                    step="0.1" 
                    value={temperature} 
                    onChange={e => setTemperature(e.target.value)} 
                    placeholder="36.5"
                    className="flex-1 p-2 border rounded text-sm text-center"
                  />
                  <span className="text-sm text-gray-500">℃</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-blue-700 block mb-1">⚖️ 体重</label>
                <div className="flex items-center gap-1">
                  <input 
                    type="number" 
                    step="0.1" 
                    value={weight} 
                    onChange={e => setWeight(e.target.value)} 
                    placeholder="60.0"
                    className="flex-1 p-2 border rounded text-sm text-center"
                  />
                  <span className="text-sm text-gray-500">kg</span>
                </div>
              </div>
            </div>
            
            {/* トイレ回数カウンター */}
            <div>
              <label className="text-xs font-bold text-blue-700 block mb-2">🚻 トイレ回数</label>
              <div className="flex items-center justify-center gap-4 bg-white p-3 rounded-lg border border-blue-200">
                <button
                  type="button"
                  onClick={() => setToiletCount(Math.max(0, toiletCount - 1))}
                  className="w-12 h-12 rounded-full bg-blue-100 text-blue-800 text-2xl font-bold hover:bg-blue-200 transition"
                >
                  −
                </button>
                <span className="text-4xl font-bold text-blue-800 w-16 text-center">{toiletCount}</span>
                <button
                  type="button"
                  onClick={() => setToiletCount(toiletCount + 1)}
                  className="w-12 h-12 rounded-full bg-blue-100 text-blue-800 text-2xl font-bold hover:bg-blue-200 transition"
                >
                  +
                </button>
              </div>
            </div>
            
            {/* 腹痛レベル */}
            <div>
              <label className="text-xs font-bold text-blue-700 block mb-2">😣 腹痛レベル</label>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map(level => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setPainLevel(level)}
                    className={`py-3 rounded-lg border-2 font-bold transition ${
                      painLevel === level
                        ? level <= 2 
                          ? 'border-green-500 bg-green-100 text-green-800'
                          : level === 3
                          ? 'border-yellow-500 bg-yellow-100 text-yellow-800'
                          : 'border-red-500 bg-red-100 text-red-800'
                        : 'border-gray-200 bg-white text-gray-500 hover:border-blue-300'
                    }`}
                  >
                    <span className="text-lg block">
                      {level === 1 && '😊'}
                      {level === 2 && '🙂'}
                      {level === 3 && '😐'}
                      {level === 4 && '😣'}
                      {level === 5 && '😭'}
                    </span>
                    <span className="text-xs">{level}</span>
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
                <span>なし</span>
                <span>激痛</span>
              </div>
            </div>
          </div>
        )}

        {/* 💪 ボディメイク */}
        {modes.mode_diet && (
          <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 space-y-3">
            <h3 className="font-bold text-purple-800">💪 ボディメイク</h3>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs font-bold">体重(kg)</label><input type="number" step="0.1" value={weight} onChange={e=>setWeight(e.target.value)} className="w-full p-2 border rounded" /></div>
              <div><label className="text-xs font-bold">体脂肪(%)</label><input type="number" step="0.1" value={bodyFat} onChange={e=>setBodyFat(e.target.value)} className="w-full p-2 border rounded" /></div>
              <div><label className="text-xs font-bold">カロリー</label><input type="number" value={calories} onChange={e=>setCalories(e.target.value)} className="w-full p-2 border rounded" /></div>
              <div><label className="text-xs font-bold">タンパク質(g)</label><input type="number" step="0.1" value={protein} onChange={e=>setProtein(e.target.value)} className="w-full p-2 border rounded" /></div>
              <div><label className="text-xs font-bold">歩数</label><input type="number" value={steps} onChange={e=>setSteps(e.target.value)} className="w-full p-2 border rounded" /></div>
            </div>
          </div>
        )}

        {/* 🍺 アルコール */}
        {modes.mode_alcohol && (
          <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-yellow-800">🍺 アルコール記録</h3>
              <span className="text-sm font-bold text-yellow-700 bg-yellow-200 px-2 py-1 rounded">
                {currentTotalPureAlcohol.toFixed(1)}g / {currentTotalMl}ml
              </span>
            </div>
            
            {previousAlcoholSummary && (
              <p className="text-xs text-yellow-700 bg-yellow-100/80 rounded px-2 py-1">{previousAlcoholSummary}</p>
            )}
            
            {/* 飲酒時間 */}
            <div className="bg-white p-3 rounded-lg border border-yellow-200">
              <label className="text-xs font-bold text-yellow-800 block mb-2">⏰ 飲酒時間</label>
              <div className="flex items-center gap-2">
                <input 
                  type="time" 
                  value={drinkStartTime} 
                  onChange={e => setDrinkStartTime(e.target.value)} 
                  className="flex-1 p-2 border rounded text-sm"
                />
                <span className="text-gray-500">〜</span>
                <input 
                  type="time" 
                  value={drinkEndTime} 
                  onChange={e => setDrinkEndTime(e.target.value)} 
                  className="flex-1 p-2 border rounded text-sm"
                />
              </div>
            </div>
            
            {/* プリセットから追加 */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-yellow-800 block">🍻 プリセットから追加</label>
              <div className="flex gap-2">
                <select 
                  value={selectedDrinkKey} 
                  onChange={e => setSelectedDrinkKey(e.target.value)} 
                  className="flex-1 p-2 border rounded text-sm"
                >
                  {Object.entries(DRINK_PRESETS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label} ({v.percent}%)</option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={drinkCount}
                  onChange={e => setDrinkCount(parseInt(e.target.value) || 1)}
                  className="w-16 p-2 border rounded text-sm text-center"
                />
                <button 
                  type="button" 
                  onClick={handleAddDrink} 
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 rounded font-bold transition"
                >
                  追加
                </button>
              </div>
            </div>
            
            {/* 追加済みリスト */}
            {addedDrinks.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-yellow-800 block">📝 今日の記録</label>
                <div className="bg-white rounded-lg border border-yellow-200 divide-y divide-yellow-100">
                  {addedDrinks.map(d => (
                    <div key={d.id} className="flex items-center justify-between p-2 text-sm">
                      <span>{d.label} x{d.count}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-700 text-xs">{d.pureAlcohol.toFixed(1)}g</span>
                        <button 
                          type="button" 
                          onClick={() => handleRemoveDrink(d.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* 分解時間表示 */}
            {currentTotalPureAlcohol > 0 && (
              <div className="bg-amber-100 p-3 rounded-lg border border-amber-300">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🚗</span>
                  <span className="font-bold text-amber-800">アルコール分解予測</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-white p-2 rounded">
                    <span className="text-xs text-gray-500 block">分解にかかる時間</span>
                    <span className="font-bold text-amber-800">約 {decompositionHours.toFixed(1)} 時間</span>
                  </div>
                  <div className="bg-white p-2 rounded">
                    <span className="text-xs text-gray-500 block">分解完了予測</span>
                    <span className="font-bold text-amber-800">{soberTime}</span>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-amber-700">体重</span>
                  <input
                    type="number"
                    value={userWeight}
                    onChange={e => setUserWeight(parseInt(e.target.value) || 60)}
                    className="w-16 p-1 border rounded text-xs text-center"
                  />
                  <span className="text-xs text-amber-700">kg で計算</span>
                </div>
                <p className="text-xs text-amber-600 mt-2">
                  ※ 個人差があります。運転は完全に抜けてから！
                </p>
              </div>
            )}
          </div>
        )}

        {/* 🌿 メンタル */}
        {modes.mode_mental && (
          <div className="bg-green-50 p-4 rounded-xl border border-green-200 space-y-4">
            <h3 className="font-bold text-green-800">🌿 今日の気持ち</h3>
            
            {/* 感情ボタン */}
            <div>
              <label className="text-xs font-bold text-green-700 block mb-2">今の気分は？</label>
              <div className="grid grid-cols-4 gap-2">
                {EMOTIONS.map(emotion => (
                  <button
                    key={emotion.id}
                    type="button"
                    onClick={() => setSelectedEmotion(selectedEmotion === emotion.label ? '' : emotion.label)}
                    className={`p-2 rounded-lg border-2 transition-all ${
                      selectedEmotion === emotion.label
                        ? 'border-green-500 bg-green-100 scale-105'
                        : 'border-gray-200 bg-white hover:border-green-300'
                    }`}
                  >
                    <span className="text-2xl block">{emotion.emoji}</span>
                    <span className="text-xs text-gray-600">{emotion.label}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* 睡眠の質 */}
            <div>
              <label className="text-xs font-bold text-green-700 block mb-1">😴 睡眠の質</label>
              <div className="flex gap-2">
                {['悪い', '普通', '良い'].map(q => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setSleepQuality(q)}
                    className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition ${
                      sleepQuality === q
                        ? 'border-green-500 bg-green-100 text-green-800'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-green-300'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
            
            {/* 一言日記 */}
            <div>
              <label className="text-xs font-bold text-green-700 block mb-1">📝 ひとこと日記</label>
              <textarea
                value={mentalDiary}
                onChange={e => setMentalDiary(e.target.value)}
                placeholder="今日あったこと、感じたことを自由に..."
                className="w-full p-3 border border-green-200 rounded-lg text-sm h-20 resize-none"
              />
            </div>
          </div>
        )}

        <div><label className="text-sm font-bold block mb-1">ひとことメモ</label><textarea value={memo} onChange={e=>setMemo(e.target.value)} className="w-full border p-3 rounded-lg h-20" /></div>

        <button type="submit" disabled={isSubmitting} className="w-full bg-pink-600 hover:bg-pink-700 text-white p-4 rounded-xl font-bold shadow-lg disabled:bg-gray-400">
          {isSubmitting ? '分析中...👹' : '記録して相棒に報告 📝'}
        </button>
      </form>

      {/* 結果表示モーダル */}
      {resultModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border-4 border-pink-400 relative animate-slide-up">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-4xl">💋</span>
              <h3 className="text-xl font-bold text-pink-800">鬼コーチからの言葉</h3>
            </div>
            <div className="bg-pink-50 p-4 rounded-xl text-gray-800 leading-relaxed whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
              {resultModal.msg}
            </div>
            <button 
              onClick={handleCloseModal}
              className="mt-6 w-full bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-gray-800"
            >
              わかったわよ（閉じる）
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
