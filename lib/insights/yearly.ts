/**
 * 年次インサイト生成: 12ヶ月分の月次要約のみを参照して年次総括を作成
 */

import OpenAI from 'openai';
import prisma from '@/lib/prisma';
import { getServerEnv } from '@/lib/env';
import { getCharaPrompt } from '@/lib/chara-settings';
import { buildYearlySystemPrompt, type UserContext } from './prompts';
import type { GenerateResult, YearlyMetadata } from './types';

export async function generateYearlyInsight(
  userId: string,
  startDate: string,
  endDate: string
): Promise<GenerateResult> {
  const monthlyInsights = await prisma.insight.findMany({
    where: {
      userId,
      level: 'monthly',
      startDate: { gte: startDate },
      endDate: { lte: endDate },
    },
    orderBy: { startDate: 'asc' },
  });

  const userSettings = await prisma.userSettings.findUnique({
    where: { userId },
  });

  const userContext: UserContext = userSettings
    ? {
        medicalHistory: userSettings.medicalHistory ?? 'なし',
        currentMedications: userSettings.currentMedications ?? 'なし',
        modeIbd: userSettings.modeIbd,
        modeDiet: userSettings.modeDiet,
        modeAlcohol: userSettings.modeAlcohol,
        modeMental: userSettings.modeMental,
      }
    : {
        medicalHistory: 'なし',
        currentMedications: 'なし',
        modeIbd: false,
        modeDiet: false,
        modeAlcohol: false,
        modeMental: false,
      };

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

  const env = getServerEnv();
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY が未設定です');
  }

  const chara = getCharaPrompt(userSettings?.aiPersonality ?? 'tsundere', 'advice');
  const systemPrompt = buildYearlySystemPrompt(chara, userContext);
  const userPrompt = `これが${startDate}〜${endDate}の月次要約よ！年全体の傾向・バイオリズムを分析してちょうだい！\n\n## 月次要約\n${JSON.stringify(monthlySummariesForPrompt, null, 2)}`;

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
    '今年の分析結果を出せなかったわ。月次分析がもう少し溜まったら試してね。';

  return {
    startDate,
    endDate,
    summary,
    metadata,
  };
}
