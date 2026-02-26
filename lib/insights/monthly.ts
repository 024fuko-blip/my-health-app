/**
 * 月次インサイト生成: 当月の週次要約のみを参照して月次総括を作成
 */

import prisma from '@/lib/prisma';
import { getCharaPrompt, getSystemMessages } from '@/lib/chara-settings';
import { chatCompletion } from '@/lib/openai-client';
import { buildMonthlySystemPrompt } from './prompts';
import { buildUserContext } from './user-context';
import type { GenerateResult, MonthlyMetadata } from './types';

export async function generateMonthlyInsight(
  userId: string,
  startDate: string,
  endDate: string
): Promise<GenerateResult> {
  const [weeklyInsights, userContext] = await Promise.all([
    prisma.insight.findMany({
      where: { userId, level: 'weekly', startDate: { gte: startDate }, endDate: { lte: endDate } },
      orderBy: { startDate: 'asc' },
    }),
    buildUserContext(userId),
  ]);

  const metadata: MonthlyMetadata = {
    weeklyCount: weeklyInsights.length,
  };

  const sysMsg = getSystemMessages(userContext.aiPersonality);

  if (weeklyInsights.length === 0) {
    return {
      startDate,
      endDate,
      summary: sysMsg.monthlyNoWeekly,
      metadata,
    };
  }

  const weeklySummariesForPrompt = weeklyInsights.map((w) => ({
    period: `${w.startDate}〜${w.endDate}`,
    summary: w.summary,
    metadata: w.metadata as Record<string, unknown> | null,
  }));

  const chara = getCharaPrompt(userContext.aiPersonality, 'advice');
  const systemPrompt = buildMonthlySystemPrompt(chara, userContext);
  const userPrompt = `これが${startDate}〜${endDate}の週次要約よ！月全体の傾向を分析してちょうだい！\n\n## 週次要約\n${JSON.stringify(weeklySummariesForPrompt, null, 2)}`;

  const summary = await chatCompletion({
    systemPrompt,
    userContent: userPrompt,
    fallbackMessage: sysMsg.insightApiError,
  });

  return {
    startDate,
    endDate,
    summary,
    metadata,
  };
}
