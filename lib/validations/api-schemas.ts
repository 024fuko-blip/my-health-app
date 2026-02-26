/**
 * API リクエスト用 Zod スキーマ。
 * parseJsonBody と組み合わせて入力を検証する。
 */

import { z } from 'zod';

/** YYYY-MM-DD 形式の日付 */
const dateStrSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, 'Invalid date format (YYYY-MM-DD)');

/** 任意の string | null 相当（form から string が来ることもある） */
const optionalStr = z.union([z.string(), z.null(), z.number()]).optional();
/** 任意の number | null（form から string が来ることもある） */
const optionalNum = z.union([z.number(), z.string(), z.null()]).optional();

/** health-logs POST ボディ */
export const healthLogPostSchema = z.object({
  date: dateStrSchema,
  memo: optionalStr,
  medication_taken: z.boolean().optional(),
  medication_taken_detail: optionalStr,
  general_mood: optionalNum,
  temperature: optionalNum,
  meal_description: optionalStr,
  period_status: optionalStr,
  ai_comment: optionalStr,
  pain_level: optionalNum,
  stool_type: optionalStr,
  alcohol_amount: optionalNum,
  alcohol_percent: optionalNum,
  alcohol_type: optionalStr,
  stress_level: optionalNum,
  sleep_quality: optionalStr,
  spending: optionalNum,
  weight: optionalNum,
  body_fat: optionalNum,
  calories: optionalNum,
  protein: optionalNum,
  steps: optionalNum,
  exercise_minutes: optionalNum,
});

export type HealthLogPostBody = z.infer<typeof healthLogPostSchema>;

/** health-logs PATCH ボディ */
export const healthLogPatchSchema = z.object({
  id: z.string().min(1, 'id required'),
  memo: optionalStr,
  general_mood: optionalNum,
  temperature: optionalNum,
  meal_description: optionalStr,
  pain_level: optionalNum,
  stool_type: optionalStr,
  weight: optionalNum,
  steps: optionalNum,
  period_status: optionalStr,
  alcohol_amount: optionalNum,
  stress_level: optionalNum,
  sleep_quality: optionalStr,
  body_fat: optionalNum,
  calories: optionalNum,
  protein: optionalNum,
});

export type HealthLogPatchBody = z.infer<typeof healthLogPatchSchema>;

/** user-settings PUT ボディ */
const PERSONALITIES = ['tsundere', 'kibishime', 'amayama', 'naruse'] as const;
const personalityEnum = z.enum(PERSONALITIES);
const optionalNumField = z.union([z.number(), z.string()]).optional();

export const userSettingsPutSchema = z.object({
  mode_ibd: z.boolean().optional(),
  mode_alcohol: z.boolean().optional(),
  mode_mental: z.boolean().optional(),
  mode_diet: z.boolean().optional(),
  medical_history: z.union([z.string(), z.null()]).optional(),
  current_medications: z.union([z.string(), z.null()]).optional(),
  medication_reminder_times: z.union([z.string(), z.null()]).optional(),
  gender: z.string().optional(),
  ai_personality: personalityEnum.optional(),
  profile_name: z.union([z.string(), z.null()]).optional(),
  birth_date: z.union([z.string(), z.null()]).optional(),
  height: optionalNumField,
  weight: optionalNumField,
  normal_temperature: optionalNumField,
  prefecture: z.union([z.string(), z.null()]).optional(),
  latitude: optionalNumField,
  longitude: optionalNumField,
});

export type UserSettingsPutBody = z.infer<typeof userSettingsPutSchema>;

/** advice POST ボディ（daily/weekly 共通、ログは weekly のみ） */
const logEntrySchema = z.record(z.string(), z.unknown());

export const advicePostSchema = z.object({
  mode: z.enum(['daily', 'weekly']).optional(),
  logs: z.array(logEntrySchema).optional(),
  meal_image_base64: z.string().optional(),
}).passthrough(); // dailyInput の任意フィールドを許可

export type AdvicePostBody = z.infer<typeof advicePostSchema>;

/** analyze-meal POST ボディ */
export const analyzeMealPostSchema = z.object({
  image_base64: z.string().optional(),
  meal_description: z.string().optional(),
}).refine(
  (data) =>
    (typeof data.image_base64 === 'string' && data.image_base64.startsWith('data:image')) ||
    (typeof data.meal_description === 'string' && data.meal_description.trim().length > 0),
  { message: '画像データまたは食事の文字説明が必要です' }
);

export type AnalyzeMealPostBody = z.infer<typeof analyzeMealPostSchema>;

/** report POST ボディ */
export const reportPostSchema = z.object({
  period: z.literal(30).or(z.literal(7)).optional(),
});

export type ReportPostBody = z.infer<typeof reportPostSchema>;
