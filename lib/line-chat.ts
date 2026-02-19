/**
 * LINE チャット用 AI 相棒。
 * 既往歴・薬・年齢・性別・生理周期・IBD 等を前提に返信。
 */

import OpenAI from 'openai';
import { getServerEnv } from './env';

export interface LineChatContext {
  medicalHistory: string;
  currentMedications: string;
  gender: string;
  ageYears: number | null;
  /** 女性かつ生理周期データありの場合の説明文 */
  periodInfo: string;
  modeIbd: boolean;
  aiPersonality: string;
}

function parseAgeFromBirthDate(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const m = birthDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const birth = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now < new Date(birth.getFullYear(), birth.getMonth(), birth.getDate())) age--;
  return age >= 0 && age <= 150 ? age : null;
}

export function buildChatContextFromSettings(settings: {
  medicalHistory: string | null;
  currentMedications: string | null;
  gender: string | null;
  birthDate: string | null;
  modeIbd: boolean;
  aiPersonality: string | null;
}): LineChatContext {
  let medText = 'なし';
  try {
    const parsed = JSON.parse(settings.medicalHistory || '{}');
    medText = parsed.text || 'なし';
  } catch {
    if (settings.medicalHistory) medText = String(settings.medicalHistory);
  }

  let medsText = 'なし';
  try {
    const parsed = JSON.parse(settings.currentMedications || '{}');
    if (parsed.medications?.length) {
      medsText = parsed.medications.map((m: { name: string }) => m.name).join('、');
    } else if (parsed.name) medsText = parsed.name;
  } catch {
    if (settings.currentMedications) medsText = String(settings.currentMedications);
  }

  let periodInfo = '';
  if (settings.gender === 'female') {
    try {
      const h = JSON.parse(settings.medicalHistory || '{}');
      const cycle = h.periodCycle ?? 28;
      const last = h.lastPeriodDate;
      if (last) {
        periodInfo = `- 生理: 最終${last}、周期${cycle}日。PMS・生理前の体調変化に配慮すること。`;
      } else {
        periodInfo = '- 性別は女性。生理周期データが登録されていればPMS等に配慮すること。';
      }
    } catch {
      periodInfo = '- 性別は女性。';
    }
  }

  const age = parseAgeFromBirthDate(settings.birthDate);
  return {
    medicalHistory: medText,
    currentMedications: medsText,
    gender: settings.gender || '不明',
    ageYears: age,
    periodInfo,
    modeIbd: settings.modeIbd,
    aiPersonality: settings.aiPersonality ?? 'tsundere',
  };
}

const CHARA_SETTINGS: Record<string, string> = {
  tsundere: `あなたはユーザーの「健康相棒」であるツンデレオネエの鬼コーチよ。口調は強めのオネエ言葉。本当は心配している愛のある相棒として、簡潔に答えること。`,
  amayama: `あなたはユーザーの「健康相棒」である優しい看護師のような存在。温かい口調で、ねぎらいの言葉を忘れずに答えること。`,
  ikemen: `あなたはユーザーの「健康相棒」であるクールで頼れる男性。簡潔に、でもちゃんと気を配るアドバイスをすること。`,
};

const MAX_MESSAGE_LENGTH = 500;

export async function replyAsCompanion(
  userMessage: string,
  context: LineChatContext
): Promise<string> {
  const truncated = userMessage.length > MAX_MESSAGE_LENGTH
    ? userMessage.slice(0, MAX_MESSAGE_LENGTH) + '…'
    : userMessage;

  const env = getServerEnv();
  if (!env.OPENAI_API_KEY) return '申し訳ない、今は相談に乗れないの。あとで試してね。';

  const chara = CHARA_SETTINGS[context.aiPersonality] ?? CHARA_SETTINGS.tsundere;

  const systemPrompt = `
${chara}

## 【絶対に考慮すること】
あなたは以下のユーザー情報を**必ず**前提として答えること。勝手に無視・軽視しないこと。

- 既往歴: ${context.medicalHistory}
- 服薬中: ${context.currentMedications}（副作用・飲み合わせに配慮すること）
- 性別: ${context.gender}
- 年齢: ${context.ageYears ?? '不明'}
${context.periodInfo}
${context.modeIbd ? '- IBD（炎症性腸疾患）あり。腸に負担のかかる食事・生活のアドバイスに注意すること。' : ''}

## 注意
- 医療診断や治療の代替ではない。不安なときは医師に相談するよう促すこと。
- 150文字以内で簡潔に。
`;

  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: truncated },
    ],
    temperature: 0.7,
  });

  return completion.choices[0]?.message?.content?.trim() ?? 'ごめん、ちょっと考えがまとまらなかった。もう一度聞いてくれる？';
}
