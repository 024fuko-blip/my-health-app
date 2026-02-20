/** 服薬スケジュール（BasicInfoSection 等で使用） */
export interface Medication {
  id: number;
  name: string;
  timings: string[];
}

/** AI 人格（ResultModal 等で使用） */
export type AiPersonality = 'tsundere' | 'kibishime' | 'amayama';

/** /api/health-logs GET レスポンスの型（snake_case） */
export interface HealthLogApiResponse {
  id: string;
  user_id: string;
  date: string;
  memo?: string | null;
  medication_taken?: boolean | null;
  general_mood?: number | null;
  meal_description?: string | null;
  period_status?: string | null;
  ai_comment?: string | null;
  pain_level?: number | null;
  stool_type?: string | null;
  alcohol_amount?: number | null;
  alcohol_percent?: number | null;
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

/** カレンダー編集フォーム（PATCH 用の部分フィールド。API レスポンスからコピーするため null 許容） */
export interface CalendarEditForm {
  id?: string;
  general_mood?: number | null;
  pain_level?: number | null;
  meal_description?: string | null;
  memo?: string | null;
  weight?: number | string | null;
  steps?: number | string | null;
}

export interface HealthLogRow {
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

export interface UserSettingsMode {
  mode_ibd?: boolean;
  mode_diet?: boolean;
  mode_alcohol?: boolean;
  mode_mental?: boolean;
}

export interface NutritionData {
  foods?: string[];
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  fiber?: number;
  salt?: number;
  notes?: string;
}
