/**
 * 年次インサイト生成: 12ヶ月分の月次要約のみを参照して年次総括を作成
 */

import prisma from '@/lib/prisma';
import { getCharaPrompt } from '@/lib/chara-settings';
import { chatCompletion } from '@/lib/openai-client';
import { buildYearlySystemPrompt } from './prompts';
import { buildUserContext } from './user-context';
import type { GenerateResult, YearlyMetadata } from './types';

export async function generateYearlyInsight(
  userId: string,
  startDate: string,
  endDate: string
): Promise<GenerateResult> {
  const [monthlyInsights, userContext] = await Promise.all([
    prisma.insight.findMany({
      where: { userId, level: 'monthly', startDate: { gte: startDate }, endDate: { lte: endDate } },
      orderBy: { startDate: 'asc' },
    }),
    buildUserContext(userId),
  ]);

  const metadata: YearlyMetadata = {
    monthlyCount: monthlyInsights.length,
  };

  if (monthlyInsights.length === 0) {
    return {
      startDate,
      endDate,
      summary: 'この年の月次分析がまだないわ。先に月次分析を生成してから年次を試してね。',
      metadata,
    };
  }

  const monthlySummariesForPrompt = monthlyInsights.map((m) => ({
    period: `${m.startDate}〜${m.endDate}`,
    summary: m.summary,
    metadata: m.metadata as Record<string, unknown> | null,
  }));

  const chara = getCharaPrompt(userContext.aiPersonality, 'advice');
  const systemPrompt = buildYearlySystemPrompt(chara, userContext);
  const userPrompt = `これが${startDate}〜${endDate}の月次要約よ！年全体の傾向・バイオリズムを分析してちょうだい！\n\n## 月次要約\n${JSON.stringify(monthlySummariesForPrompt, null, 2)}`;

  const summary = await chatCompletion({
    systemPrompt,
    userContent: userPrompt,
    fallbackMessage: '今年の分析結果を出せなかったわ。月次分析がもう少し溜まったら試してね。',
  });

  return {
    startDate,
    endDate,
    summary,
    metadata,
  };
}
