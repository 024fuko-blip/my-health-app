/**
 * 週次インサイト生成: 7日分の health_logs → 要約 + metadata
 */

import OpenAI from 'openai';
import prisma from '@/lib/prisma';
import { getServerEnv } from '@/lib/env';
import { getCharaPrompt } from '@/lib/chara-settings';
import { buildWeeklySystemPrompt } from './prompts';
import { buildUserContext } from './user-context';
import type { GenerateResult, WeeklyMetadata } from './types';

export async function generateWeeklyInsight(
  userId: string,
  startDate: string,
  endDate: string
): Promise<GenerateResult> {
  const [logs, userContext] = await Promise.all([
    prisma.healthLog.findMany({
      where: { userId, date: { gte: startDate, lte: endDate } },
      orderBy: { date: 'asc' },
    }),
    buildUserContext(userId),
  ]);

  const metadata = computeWeeklyMetadata(logs);
  const logsForPrompt = logs.map((l) => ({
    date: l.date,
    memo: l.memo,
    medication_taken: l.medicationTaken,
    general_mood: l.generalMood,
    meal_description: l.mealDescription,
    period_status: l.periodStatus,
    pain_level: l.painLevel,
    stool_type: l.stoolType,
    alcohol_amount: l.alcoholAmount,
    stress_level: l.stressLevel,
    sleep_quality: l.sleepQuality,
    weight: l.weight,
    steps: l.steps,
    ai_comment: l.aiComment,
  }));

  const env = getServerEnv();
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY が未設定です');
  }

  const chara = getCharaPrompt(userContext.aiPersonality, 'advice');
  const systemPrompt = buildWeeklySystemPrompt(chara, userContext);
  const userPrompt = `これが${startDate}〜${endDate}の記録よ！因果関係を暴いてちょうだい！\n\n## 記録データ\n${JSON.stringify(logsForPrompt, null, 2)}`;

  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
  });

  const summary =
    completion.choices[0]?.message?.content?.trim() ??
    '今週の分析結果を出せなかったわ。もう少し記録が溜まったら試してね。';

  return {
    startDate,
    endDate,
    summary,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  };
}

function computeWeeklyMetadata(
  logs: Array<{
    generalMood: number | null;
    painLevel: number | null;
    steps: number | null;
    alcoholAmount: number;
    periodStatus: string | null;
    stressLevel: number | null;
  }>
): WeeklyMetadata {
  const moods = logs.map((l) => l.generalMood).filter((v): v is number => v != null);
  const pains = logs.map((l) => l.painLevel).filter((v): v is number => v != null);
  const stressLevels = logs.map((l) => l.stressLevel).filter((v): v is number => v != null);
  const totalSteps = logs.reduce((sum, l) => sum + (l.steps ?? 0), 0);
  const alcoholDays = logs.filter((l) => (l.alcoholAmount ?? 0) > 0).length;
  const totalAlcohol = logs.reduce((sum, l) => sum + (l.alcoholAmount ?? 0), 0);

  const periodStatuses = logs.map((l) => l.periodStatus).filter(Boolean) as string[];
  const periodCounts: Record<string, number> = {};
  for (const p of periodStatuses) periodCounts[p] = (periodCounts[p] ?? 0) + 1;
  const dominantPeriod =
    Object.keys(periodCounts).length > 0
      ? Object.entries(periodCounts).sort((a, b) => b[1] - a[1])[0][0]
      : undefined;

  const meta: WeeklyMetadata = {
    daysRecorded: logs.length,
  };
  if (moods.length > 0) meta.avgMood = moods.reduce((a, b) => a + b, 0) / moods.length;
  if (pains.length > 0) meta.avgPainLevel = pains.reduce((a, b) => a + b, 0) / pains.length;
  if (stressLevels.length > 0)
    meta.avgStressLevel = stressLevels.reduce((a, b) => a + b, 0) / stressLevels.length;
  if (totalSteps > 0) meta.totalSteps = totalSteps;
  if (alcoholDays > 0) {
    meta.alcoholDays = alcoholDays;
    meta.totalAlcoholAmount = totalAlcohol;
  }
  if (dominantPeriod) meta.periodStatus = dominantPeriod;
  return meta;
}
