/**
 * 月次インサイト生成: 当月の週次要約のみを参照して月次総括を作成
 */

import OpenAI from 'openai';
import prisma from '@/lib/prisma';
import { getServerEnv } from '@/lib/env';
import { getCharaPrompt } from '@/lib/chara-settings';
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

  if (weeklyInsights.length === 0) {
    return {
      startDate,
      endDate,
      summary: 'この月の週次分析がまだないわ。先に週次分析を生成してから月次を試してね。',
      metadata,
    };
  }

  const weeklySummariesForPrompt = weeklyInsights.map((w) => ({
    period: `${w.startDate}〜${w.endDate}`,
    summary: w.summary,
    metadata: w.metadata as Record<string, unknown> | null,
  }));

  const env = getServerEnv();
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY が未設定です');
  }

  const chara = getCharaPrompt(userContext.aiPersonality, 'advice');
  const systemPrompt = buildMonthlySystemPrompt(chara, userContext);
  const userPrompt = `これが${startDate}〜${endDate}の週次要約よ！月全体の傾向を分析してちょうだい！\n\n## 週次要約\n${JSON.stringify(weeklySummariesForPrompt, null, 2)}`;

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
    '今月の分析結果を出せなかったわ。週次分析がもう少し溜まったら試してね。';

  return {
    startDate,
    endDate,
    summary,
    metadata,
  };
}
