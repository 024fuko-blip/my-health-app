/**
 * LINE 用「今日の体調予想」。
 * 過去1週間の健康記録・天気・花粉・黄砂・生理情報から AI が今日の体調を予測。
 */

import prisma from '@/lib/prisma';
import { chatCompletion, isOpenAIAvailable } from '@/lib/openai-client';
import { getCharaPrompt } from '@/lib/chara-settings';
import { getLineFallback } from '@/lib/line-fallback-messages';
import { getCoordsFromPrefecture } from '@/lib/prefectures';
import { getPastDates } from '@/lib/date-utils';
import { fetchWeather } from '@/lib/weather';
import { DEFAULT_COORDS } from '@/lib/constants';

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
  if (!isOpenAIAvailable()) {
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
    lat = DEFAULT_COORDS.lat;
    lon = DEFAULT_COORDS.lon;
  }

  const weather = await fetchWeather(lat, lon);
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

  return chatCompletion({
    systemPrompt,
    userContent: userPrompt,
    fallbackMessage: getLineFallback('prediction_failed', settings.aiPersonality ?? null),
  });
}
