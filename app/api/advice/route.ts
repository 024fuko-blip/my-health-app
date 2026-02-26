import { NextResponse } from 'next/server';
import type { ChatCompletionContentPart } from 'openai/resources/chat/completions';
import { getServerEnv } from '@/lib/env';
import { parseJsonBody, withSession } from '@/lib/api-utils';
import { advicePostSchema } from '@/lib/validations/api-schemas';
import { HTTP_STATUS } from '@/lib/constants';
import { getCharaPrompt } from '@/lib/chara-settings';
import { MEDICATION_AI_CAUTION_RULE } from '@/lib/medication-prompt';
import { chatCompletion } from '@/lib/openai-client';
import { buildUserContext, getActiveModesText } from '@/lib/insights/user-context';
import { MAX_IMAGE_BASE64 } from '@/lib/constants';

const RECORD_LABELS: Record<string, string> = {
  meal_description: '食事メモ',
  general_mood: '体調・気分(1〜5)',
  pain_level: '腹痛レベル(1〜5)',
  stool_type: '便の状態',
  weight: '体重(kg)',
  body_fat: '体脂肪(%)',
  calories: 'カロリー',
  protein: 'タンパク質(g)',
  steps: '歩数',
  exercise_minutes: '運動(分)',
  alcohol_amount: 'アルコール量(ml)',
  alcohol_reason: '飲酒理由',
  medication_taken: '服薬',
  stress_level: 'ストレス(1〜10)',
  sleep_quality: '睡眠の質',
  spending: '出費',
  period_status: '生理',
};

const PRIORITY_RULES = `
## 【絶対厳守】優先順位ルール

1. **【最優先】体調の急変・危険信号**
   腹痛レベルが高い（3以上）、血便・下痢・粘液便などIBD症状がある、または体調・気分が悪い（2以下）場合は、
   **ボディメイク・食事・運動の話は一切しないこと。**
   消化に良い食事・安静・服薬の確認を最優先し、お母さんのように優しく接しなさい。

2. **【高優先】悪い生活習慣の指摘**
   体調が悪いのにアルコールを飲んでいる、脂っこい・刺激物を食べている、薬を飲み忘れている等の「矛盾」があれば、
   厳しくツッコミを入れなさい。因果関係（例：酒を飲んだから腹痛が起きた）を指摘してよい。

3. **【通常】日常のフィードバック**
   上記の問題がなければ、食事内容・運動量・記録の習慣について褒める、またはアドバイスしなさい。
   ユーザーが特に関心を持っている項目（下記「関心分野」）を特に見てコメントしなさい。

4. **【デレ】頑張った日は素直に褒める**
   ユーザーの行動が模範的、または以前より改善されていると判断した場合は、いつもの厳しい口調を封印し、
   「...まぁ、やるじゃない。」「今日は見直したわよ。」といった、少し照れくさそうだが素直に褒める（デレる）トーンで労うこと。
   判定基準の例: アルコールを我慢した（0ml）、体調が良いのに運動した、食事内容がヘルシー（画像やテキストから判断）。
`;

function buildTodayRecordText(dailyInput: Record<string, unknown>): string {
  const lines: string[] = [];
  for (const [key, label] of Object.entries(RECORD_LABELS)) {
    const v = dailyInput[key];
    if (v === undefined || v === null || v === '') continue;
    try {
      const text =
        key === 'medication_taken'
          ? v
            ? '飲んだ'
            : 'まだ'
          : typeof v === 'object'
            ? JSON.stringify(v)
            : String(v);
      lines.push(`${label}: ${text}`);
    } catch {
      continue;
    }
  }
  return lines.length > 0 ? lines.join('\n') : '（記録なし）';
}

function buildAdviceSystemPrompt(params: {
  charaSetting: string;
  settings: { medical_history: string; current_medications: string };
  activeModesText: string;
  mode: string;
  hasImage: boolean;
}): string {
  const { charaSetting, settings, activeModesText, mode, hasImage } = params;
  const imageInstruction = hasImage
    ? '\n**画像がある場合**: その食事写真の内容（品目・量・カロリーや栄養バランスの目安）を解析し、IBDやボディメイクの観点からフィードバックを行うこと。'
    : '';
  if (mode === 'weekly') {
    return `${charaSetting}
あなたは渡された1週間分の記録を、**全体を総合的に**分析する「超・敏腕探偵」よ。
食事・便・腹痛・アルコール・運動・ストレスなどを繋げて、体調不良の原因や悪い習慣のパターンを指摘しなさい。

## ユーザー情報
- 既往歴: ${settings.medical_history}
- 薬: ${settings.current_medications}
- 関心分野: ${activeModesText}

${MEDICATION_AI_CAUTION_RULE}

${PRIORITY_RULES}
分析結果は250文字以内でまとめなさい。
`;
  }
  return `${charaSetting}
渡された「今日の記録」は、食事・便・腹痛・アルコール・運動・メンタルなど**すべてを繋げて**総合的に判断しなさい。
「モードごとの縦割り」は禁止。因果関係（例：酒を飲んだから腹痛、脂っこい食事で便が悪い）を指摘してよい。
${imageInstruction}

## ユーザー情報
- 既往歴: ${settings.medical_history}
- 薬: ${settings.current_medications}（飲み忘れがないか確認すること）
- 関心分野（ユーザーが特に関心を持っていること）: ${activeModesText}

${MEDICATION_AI_CAUTION_RULE}

${PRIORITY_RULES}
150文字以内で、上記優先順位に従ってコメントしなさい。
`;
}

export async function POST(req: Request) {
  return withSession(async (session) => {
    try {
      const parsed = await parseJsonBody(req, advicePostSchema);
      if (!parsed.ok) return parsed.error;
      const body = parsed.data;
      const { mode, logs, meal_image_base64: mealImageBase64, ...dailyInput } = body;

      const userContext = await buildUserContext(session.userId);
      const charaSetting = getCharaPrompt(userContext.aiPersonality, 'advice');
      const activeModesText = getActiveModesText(userContext);
      const todayRecordText = buildTodayRecordText(dailyInput as Record<string, unknown>);

      const hasImage =
        typeof mealImageBase64 === 'string' &&
        mealImageBase64.startsWith('data:image') &&
        mealImageBase64.length <= MAX_IMAGE_BASE64;

      const systemPrompt = buildAdviceSystemPrompt({
        charaSetting,
        settings: {
          medical_history: userContext.medicalHistory,
          current_medications: userContext.currentMedications,
        },
        activeModesText,
        mode: String(mode ?? 'daily'),
        hasImage,
      });

      const userPrompt =
        mode === 'weekly'
          ? `これが1週間分の記録よ！ 総合的に分析してちょうだい！\n${JSON.stringify(logs)}`
          : `今日の記録よ。全部見てコメントしなさい！\n\n${todayRecordText}`;

      const env = getServerEnv();
      if (!env.OPENAI_API_KEY) {
        return NextResponse.json(
          { advice: 'オネエが休憩中よ！OPENAI_API_KEY を設定してからもう一度試してちょうだい！' },
          { status: HTTP_STATUS.SERVICE_UNAVAILABLE },
        );
      }

      const isDailyWithImage = mode === 'daily' && hasImage;
      const model = isDailyWithImage ? 'gpt-4o' : 'gpt-4o-mini';
      const userContent: string | ChatCompletionContentPart[] = isDailyWithImage
        ? [
            { type: 'text', text: userPrompt },
            { type: 'image_url', image_url: { url: mealImageBase64 as string } },
          ]
        : userPrompt;

      const advice = await chatCompletion({
        systemPrompt,
        userContent,
        model,
        fallbackMessage: 'あら、返事が出せなかったわ。もう一度送ってちょうだい！',
      });
      return NextResponse.json({ advice });
    } catch (error) {
      console.error('API Error:', error);
      return NextResponse.json(
        { advice: 'あらヤダ、サーバーのエラーよ！システム管理者を呼んできて！', error: String(error) },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
      );
    }
  });
}