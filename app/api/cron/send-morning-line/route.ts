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
import { getCharaPrompt } from '@/lib/chara-settings';
import { getCoordsFromPrefecture } from '@/lib/prefectures';
import { getPastDates } from '@/lib/date-utils';
import OpenAI from 'openai';

const DEFAULT_LAT = 35.6762;
const DEFAULT_LON = 139.6503;

/** Open-Meteo で天気取得（API キー不要） */
async function fetchWeather(lat = DEFAULT_LAT, lon = DEFAULT_LON): Promise<{
  temp: number;
  weatherCode: number;
  desc: string;
} | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=Asia%2FTokyo`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      current?: { temperature_2m?: number; weather_code?: number };
    };
    const temp = data.current?.temperature_2m ?? 0;
    const code = data.current?.weather_code ?? 0;
    const descMap: Record<number, string> = {
      0: '晴れ',
      1: 'ほぼ晴れ',
      2: '晴れ時々曇り',
      3: '曇り',
      45: '霧',
      48: '霧',
      51: '小雨',
      61: '雨',
      80: 'にわか雨',
      95: '雷雨',
    };
    return {
      temp,
      weatherCode: code,
      desc: descMap[code] ?? `天候コード${code}`,
    };
  } catch (e) {
    console.error('weather fetch error:', e);
    return null;
  }
}

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
    if (!cronSecret || headerSecret !== cronSecret) {
      return new NextResponse('Forbidden', { status: 403 });
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

    const env = getServerEnv();
    if (!env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY required for morning message' },
        { status: 503 }
      );
    }

    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    const pastDates = getPastDates(7);
    const now = new Date();
    const jstMonth = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' })).getMonth() + 1;
    const weather = await fetchWeather();

    let sent = 0;

    for (const link of lineLinks) {
      try {
        const settings = link.user.userSettings;
        let lat = settings?.latitude ?? null;
        let lon = settings?.longitude ?? null;
        const pref = settings?.prefecture?.trim();
        if ((lat == null || lon == null) && pref) {
          const coords = getCoordsFromPrefecture(pref);
          if (coords) [lat, lon] = coords;
        }
        if (lat == null || lon == null) {
          lat = DEFAULT_LAT;
          lon = DEFAULT_LON;
        }
        const weather = await fetchWeather(lat, lon);
        const pollenNote = getPollenNote(jstMonth);
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
          aiPersonality: link.user.userSettings?.aiPersonality ?? 'asuka',
          weather,
          pollenNote,
          prefectureLabel: prefLabel,
          healthLogs: logs,
        });

        const fullMessage = `おはよう！今朝の相棒メッセージだよ。\n\n${message}`;
        if (await sendLinePush(link.lineUserId, fullMessage)) {
          sent++;
        }
      } catch (e) {
        console.error(`morning-line error for user ${link.userId}:`, e);
      }
    }

    return NextResponse.json({ sent });
  } catch (error) {
    console.error('cron send-morning-line error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
