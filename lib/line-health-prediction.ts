/**
 * LINE 用「今日の体調予想」。
 * 過去1週間の健康記録・天気・花粉・黄砂・生理情報から AI が今日の体調を予測。
 */

import OpenAI from 'openai';
import prisma from '@/lib/prisma';
import { getCharaPrompt } from '@/lib/chara-settings';
import { getCoordsFromPrefecture } from '@/lib/prefectures';
import { getPastDates } from '@/lib/date-utils';
import { getServerEnv } from '@/lib/env';

const DEFAULT_LAT = 35.6762;
const DEFAULT_LON = 139.6503;

interface WeatherInfo {
  temp: number;
  desc: string;
}

/** Open-Meteo で天気取得（API キー不要） */
async function fetchWeather(lat = DEFAULT_LAT, lon = DEFAULT_LON): Promise<WeatherInfo | null> {
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
    return { temp, desc: descMap[code] ?? `天候コード${code}` };
  } catch (e) {
    console.error('weather fetch error:', e);
    return null;
  }
}

/** 月から花粉・黄砂の簡易アドバイス */
function getEnvironmentNote(month: number): string {
  const parts: string[] = [];
  if (month >= 2 && month <= 5) {
    parts.push('花粉シーズン。マスク・メガネで予防してね。');
  }
  if (month >= 3 && month <= 5) {
    parts.push('黄砂が飛びやすい時期。気になる日は外出を控えるか対策してね。');
  }
  return parts.join(' ') || '特になし';
}

/** 今日の体調予想を AI で生成 */
export async function generateHealthPrediction(params: {
  userId: string;
  settings: {
    prefecture: string | null;
    latitude: number | null;
    longitude: number | null;
    aiPersonality: string | null;
    medicalHistory: string | null;
  };
}): Promise<string> {
  const env = getServerEnv();
  if (!env.OPENAI_API_KEY) {
    return '申し訳ない、今は体調予想に答えられないの。あとで試してね。';
  }

  const { userId, settings } = params;
  const pastDates = getPastDates(7);
  const now = new Date();
  const jstMonth = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' })).getMonth() + 1;
  const envNote = getEnvironmentNote(jstMonth);

  let lat = settings.latitude ?? null;
  let lon = settings.longitude ?? null;
  const pref = settings.prefecture?.trim();
  if ((lat == null || lon == null) && pref) {
    const coords = getCoordsFromPrefecture(pref);
    if (coords) [lat, lon] = coords;
  }
  if (lat == null || lon == null) {
    lat = DEFAULT_LAT;
    lon = DEFAULT_LON;
  }

  const weather = await fetchWeather(lat!, lon!);
  const prefLabel = pref ? `（${pref}）` : '';

  const logs = await prisma.healthLog.findMany({
    where: { userId, date: { in: pastDates } },
    orderBy: { date: 'desc' },
    select: {
      date: true,
      generalMood: true,
      painLevel: true,
      mealDescription: true,
      memo: true,
      periodStatus: true,
      stoolType: true,
    },
  });

  const weatherText = weather
    ? `【天気${prefLabel}】${weather.desc}、気温${Math.round(weather.temp)}度`
    : '（天気データなし）';

  const logsText =
    logs.length > 0
      ? logs
          .map((l) => {
            const parts = [`${l.date}:`];
            if (l.generalMood != null) parts.push(`体調${l.generalMood}`);
            if (l.painLevel != null) parts.push(`腹痛${l.painLevel}`);
            if (l.stoolType) parts.push(`便${l.stoolType}`);
            if (l.periodStatus) parts.push(`生理${l.periodStatus}`);
            if (l.mealDescription) parts.push(`食事${l.mealDescription}`);
            if (l.memo) parts.push(`メモ${l.memo}`);
            return parts.join(' ');
          })
          .join('\n')
      : '（直近の記録なし）';

  const chara = getCharaPrompt(settings.aiPersonality ?? 'tsundere', 'line');

  const systemPrompt = `
${chara}

## タスク
渡された「過去1週間の健康記録」「今日の天気・気温」「花粉・黄砂情報」から、**今日の体調がどうなりそうか**を200文字以内で予想しなさい。

## 含めること
1. 記録の傾向（体調・腹痛・便・生理など）から今日のリスクや注意点
2. 天気・気温に応じた服装や過ごし方のヒント
3. 花粉・黄砂がある時期なら一言
4. 生理情報があればPMS・体調の波への配慮
5. 既往歴（${settings.medicalHistory || 'なし'}）があるなら関連しそうな注意も
6. 励ましや気をつけるポイントを簡潔に
`;

  const userPrompt = `
${weatherText}
花粉・黄砂: ${envNote}

過去1週間の健康記録:
${logsText}
`;

  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
  });

  return completion.choices[0]?.message?.content?.trim() ?? '今日の体調予想ができなかったわ。あとで試してね。';
}
