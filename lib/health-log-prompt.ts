/**
 * HealthLog の Prisma モデルを AI プロンプト向け snake_case オブジェクトに変換する。
 * report/route.ts と insights/weekly.ts で重複していたマッピングを集約。
 */

import type { HealthLog } from '@prisma/client';

export function healthLogToPromptShape(log: HealthLog) {
  return {
    date: log.date,
    memo: log.memo,
    medication_taken: log.medicationTaken,
    general_mood: log.generalMood,
    meal_description: log.mealDescription,
    period_status: log.periodStatus,
    pain_level: log.painLevel,
    stool_type: log.stoolType,
    alcohol_amount: log.alcoholAmount,
    stress_level: log.stressLevel,
    sleep_quality: log.sleepQuality,
    spending: log.spending,
    weight: log.weight,
    steps: log.steps,
    ai_comment: log.aiComment,
  };
}
