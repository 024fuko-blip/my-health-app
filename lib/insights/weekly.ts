/**
 * 週次インサイト生成: 7日分の health_logs → 要約 + metadata
 */

import prisma from '@/lib/prisma';
import { getCharaPrompt } from '@/lib/chara-settings';
import { chatCompletion } from '@/lib/openai-client';
import { healthLogToPromptShape } from '@/lib/health-log-prompt';
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
  const logsForPrompt = logs.map(healthLogToPromptShape);

  const chara = getCharaPrompt(userContext.aiPersonality, 'advice');
  const systemPrompt = buildWeeklySystemPrompt(chara, userContext);
  const userPrompt = `これが${startDate}〜${endDate}の記録よ！因果関係を暴いてちょうだい！\n\n## 記録データ\n${JSON.stringify(logsForPrompt, null, 2)}`;

  const summary = await chatCompletion({
    systemPrompt,
    userContent: userPrompt,
    fallbackMessage: '今週の分析結果を出せなかったわ。もう少し記録が溜まったら試してね。',
  });

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
