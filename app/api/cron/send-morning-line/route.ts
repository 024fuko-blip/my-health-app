/**
 * Cloud Scheduler から毎朝（例: 7:00 JST）に呼び出されるエンドポイント。
 * LINE連携済みユーザーに「おはよう相棒」メッセージを送信。
 * 服装・花粉・直近の健康データからAIが気分・体調の波を予測。
 * 環境変数 CRON_SECRET をヘッダー X-Cron-Secret で送信して保護。
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendLinePush } from '@/lib/line';
import { getServerEnv } from '@/lib/env';
import { timingSafeCompare, errorResponse } from '@/lib/api-utils';
import { getCharaPrompt } from '@/lib/chara-settings';
import { getCoordsFromPrefecture } from '@/lib/prefectures';
import { getPastDates } from '@/lib/date-utils';
import { fetchWeather } from '@/lib/weather';
import { DEFAULT_COORDS } from '@/lib/constants';
import { getOpenAIClient } from '@/lib/openai-client';
import type OpenAI from 'openai';

/** 月から花粉の簡易アドバイス */
function getPollenNote(month: number): string {
  if (month >= 2 && month <= 5) {
    return '花粉シーズンよ。マスク・メガネで予防してね。';
  }
  return '';
}

/** AI でおはようメッセージ生成 */
async function generateMorningMessage(
  openai: OpenAI,
  params: {
    aiPersonality: string;
    weather: { temp: number; desc: string } | null;
    pollenNote: string;
    prefectureLabel: string;
    healthLogs: Array<{
      date: string;
      generalMood?: number | null;
      painLevel?: number | null;
      mealDescription?: string | null;
      memo?: string | null;
    }>;
  }
): Promise<string> {
  const chara = getCharaPrompt(params.aiPersonality, 'morning');

  const weatherText = params.weather
    ? `【天気${params.prefectureLabel}】${params.weather.desc}、気温${Math.round(params.weather.temp)}度`
    : '（天気データなし）';
  const logsText =
    params.healthLogs.length > 0
      ? JSON.stringify(params.healthLogs, null, 0)
      : '（直近の記録なし）';

  const systemPrompt = `
${chara}

## タスク
渡された「天気」「花粉」「直近の健康記録」から、200文字以内でおはようメッセージを1つ作りなさい。

## 含めること
1. 挨拶（おはよう）
2. 服装のアドバイス（気温・天候に基づいて）
3. 花粉がある時期なら一言
4. 直近の記録がある場合、気分の波・体調の傾向を分析し、今日の過ごし方のヒントを一言
5. 記録が続いていれば褒める。体調悪い日が続いていたら優しく励ます。
`;

  const userPrompt = `
${weatherText}
花粉: ${params.pollenNote || '特になし'}

直近の健康記録:
${logsText}
`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
  });

  return completion.choices[0]?.message?.content?.trim() ?? 'おはよう！今日も頑張ってね。';
}

export async function POST(req: Request) {
  try {
    const cronSecret = getServerEnv().CRON_SECRET;
    const headerSecret = req.headers.get('X-Cron-Secret');
    if (!timingSafeCompare(headerSecret, cronSecret)) {
      return errorResponse('Forbidden', 403);
    }

    const lineLinks = await prisma.lineLink.findMany({
      include: {
        user: {
          include: { userSettings: true },
        },
      },
    });

    if (lineLinks.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No LINE links' });
    }

    const openai = getOpenAIClient();
    const pastDates = getPastDates(7);
    const now = new Date();
    const jstMonth = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' })).getMonth() + 1;
    const pollenNote = getPollenNote(jstMonth);

    const results = await Promise.allSettled(
      lineLinks.map(async (link) => {
        const settings = link.user.userSettings;
        let lat = settings?.latitude ?? null;
        let lon = settings?.longitude ?? null;
        const pref = settings?.prefecture?.trim();
        if ((lat == null || lon == null) && pref) {
          const coords = getCoordsFromPrefecture(pref);
          if (coords) [lat, lon] = coords;
        }
        if (lat == null || lon == null) {
          lat = DEFAULT_COORDS.lat;
          lon = DEFAULT_COORDS.lon;
        }
        const weather = await fetchWeather(lat, lon);
        const prefLabel = pref ? `（${pref}）` : '';

        const logs = await prisma.healthLog.findMany({
          where: {
            userId: link.userId,
            date: { in: pastDates },
          },
          orderBy: { date: 'desc' },
          select: {
            date: true,
            generalMood: true,
            painLevel: true,
            mealDescription: true,
            memo: true,
          },
        });

        const message = await generateMorningMessage(openai, {
          aiPersonality: link.user.userSettings?.aiPersonality ?? 'tsundere',
          weather,
          pollenNote,
          prefectureLabel: prefLabel,
          healthLogs: logs,
        });

        const fullMessage = `おはよう！今朝の相棒メッセージだよ。\n\n${message}`;
        return sendLinePush(link.lineUserId, fullMessage);
      })
    );

    const sent = results.filter(
      (r): r is PromiseFulfilledResult<boolean> => r.status === 'fulfilled' && r.value === true
    ).length;

    const rejected = results.filter((r) => r.status === 'rejected');
    for (const r of rejected) {
      if (r.status === 'rejected') {
        console.error('morning-line error:', r.reason);
      }
    }

    return NextResponse.json({ sent });
  } catch (error) {
    console.error('cron send-morning-line error:', error);
    return errorResponse('Internal Server Error', 500);
  }
}
