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

/**
 * AIプロンプトに渡してよい dailyInput フィールドの完全ホワイトリスト。
 * ここに載っていないフィールドは Zod の strip により除去される。
 */
export const ALLOWED_DAILY_INPUT_KEYS = [
  'meal_description', 'general_mood', 'pain_level', 'stool_type',
  'weight', 'body_fat', 'calories', 'protein', 'steps', 'exercise_minutes',
  'alcohol_amount', 'alcohol_reason', 'medication_taken', 'stress_level',
  'sleep_quality', 'spending', 'period_status', 'temperature', 'memo',
] as const;

export const advicePostSchema = z.object({
  mode: z.enum(['daily', 'weekly']).optional(),
  logs: z.array(logEntrySchema).optional(),
  meal_image_base64: z.string().optional(),
  // dailyInput フィールドを明示宣言（passthrough 不要・未知キーは自動 strip）
  meal_description: z.string().max(5000).optional().nullable(),
  general_mood: z.union([z.number(), z.string()]).optional().nullable(),
  pain_level: z.union([z.number(), z.string()]).optional().nullable(),
  stool_type: z.string().max(200).optional().nullable(),
  weight: z.union([z.number(), z.string()]).optional().nullable(),
  body_fat: z.union([z.number(), z.string()]).optional().nullable(),
  calories: z.union([z.number(), z.string()]).optional().nullable(),
  protein: z.union([z.number(), z.string()]).optional().nullable(),
  steps: z.union([z.number(), z.string()]).optional().nullable(),
  exercise_minutes: z.union([z.number(), z.string()]).optional().nullable(),
  alcohol_amount: z.union([z.number(), z.string()]).optional().nullable(),
  alcohol_reason: z.string().max(500).optional().nullable(),
  medication_taken: z.boolean().optional().nullable(),
  stress_level: z.union([z.number(), z.string()]).optional().nullable(),
  sleep_quality: z.string().max(100).optional().nullable(),
  spending: z.union([z.number(), z.string()]).optional().nullable(),
  period_status: z.string().max(100).optional().nullable(),
  temperature: z.union([z.number(), z.string()]).optional().nullable(),
  memo: z.string().max(2000).optional().nullable(),
});
// .passthrough() を削除 → Zod デフォルト(.strip)で未知フィールドを除去

export type AdvicePostBody = z.infer<typeof advicePostSchema>;

/**
 * パース済み advicePostSchema の残フィールドを AI プロンプト用にサニタイズする。
 * - ホワイトリスト外のキーは除去（スキーマ側で strip 済みだが多重防御として残す）
 * - 文字列は 1000 文字に切り詰め（プロンプトインジェクション長さ対策）
 */
export function sanitizeDailyInput(raw: Record<string, unknown>): Record<string, unknown> {
  const allowed = new Set<string>(ALLOWED_DAILY_INPUT_KEYS);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!allowed.has(k) || v == null) continue;
    out[k] = typeof v === 'string' ? v.slice(0, 1000) : v;
  }
  return out;
}

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

/** push-subscribe POST ボディ */
export const pushSubscribePostSchema = z.object({
  endpoint: z.string().url('endpoint must be a valid URL'),
  keys: z.object({
    p256dh: z.string().min(1, 'p256dh required'),
    auth: z.string().min(1, 'auth required'),
  }),
});

/** push-subscribe DELETE ボディ */
export const pushSubscribeDeleteSchema = z.object({
  endpoint: z.string().url('endpoint must be a valid URL'),
});

/** pet/buy POST ボディ */
export const petBuyPostSchema = z.object({
  itemId: z.string().min(1, 'itemId required'),
  quantity: z.number().int().min(1).max(10).optional().default(1),
});

/** pet/feed POST ボディ */
export const petFeedPostSchema = z.object({
  itemId: z.string().min(1, 'itemId required'),
});

/** pet/outfit POST ボディ */
export const petOutfitPostSchema = z.object({
  outfitId: z.string().nullable().optional(),
});

/** pet/room PUT ボディ */
export const petRoomPutSchema = z.object({
  current_room_id: z.string().nullable().optional(),
  placed_furniture: z
    .array(z.object({ itemId: z.string(), position: z.string() }))
    .max(8)
    .optional(),
});

/** pet POST (create/update) ボディ */
export const petPostSchema = z.object({
  pet_name: z.string().max(50).optional(),
  pet_species: z.string().optional(),
});

/** user-settings/period PATCH ボディ */
export const periodPatchSchema = z.object({
  last_period_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  period_duration: z.number().int().min(1).max(14).optional(),
});

/** health-logs/period-status PUT ボディ */
export const periodStatusPutSchema = z.object({
  date: dateStrSchema,
  period_status: z.enum(['なし', '生理中', '生理終了']).optional().default('なし'),
});

/** health-logs/medication-status PUT ボディ */
const RESERVED_MED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
export const medicationStatusPutSchema = z.object({
  date: dateStrSchema,
  med_key: z
    .string()
    .min(1)
    .max(64)
    .refine((v) => v.includes('_'), { message: 'med_key must contain _ separator' })
    .refine((v) => !RESERVED_MED_KEYS.has(v.toLowerCase()), {
      message: 'med_key contains reserved identifier',
    }),
  taken: z.boolean(),
});

/** reminders POST ボディ */
export const reminderPostSchema = z.object({
  name: z.string().min(1, 'name required').max(200),
  due_date: dateStrSchema,
  scheduled_time: z.string().regex(/^\d{1,2}:\d{2}$/).nullable().optional(),
  memo: z.string().max(1000).nullable().optional(),
});

/** reminders/[id] PATCH ボディ */
export const reminderPatchSchema = z.object({
  name: z.string().max(200).optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  scheduled_time: z.string().regex(/^\d{1,2}:\d{2}$/).nullable().optional(),
  memo: z.string().max(1000).nullable().optional(),
});

/** insights POST ボディ */
export const insightPostSchema = z.object({
  level: z.enum(['weekly', 'monthly', 'yearly']),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
