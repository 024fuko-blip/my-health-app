import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerEnv } from '@/lib/env';
import { parseJsonBody, withSession } from '@/lib/api-utils';
import { reportPostSchema } from '@/lib/validations/api-schemas';
import { HTTP_STATUS } from '@/lib/constants';
import { getCharaPrompt } from '@/lib/chara-settings';
import { MEDICATION_AI_CAUTION_RULE } from '@/lib/medication-prompt';
import { chatCompletion } from '@/lib/openai-client';
import { healthLogToPromptShape } from '@/lib/health-log-prompt';
import { buildUserContext, getActiveModesText } from '@/lib/insights/user-context';

const DAILY_REPORT_LEVEL_PREFIX = 'daily_report_';

export async function POST(req: Request) {
  return withSession(async (session) => {
    try {
      const parsed = await parseJsonBody(req, reportPostSchema);
      if (!parsed.ok) return parsed.error;
      const body = parsed.data;
      const period = body.period === 30 ? 30 : 7;

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - period);
      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      const userContext = await buildUserContext(session.userId);
      const charaSetting = getCharaPrompt(userContext.aiPersonality, 'advice');

      // 同一期間・同一人格のキャッシュを確認
      const cacheLevel = `${DAILY_REPORT_LEVEL_PREFIX}${period}_${userContext.aiPersonality}`;
      const cached = await prisma.insight.findUnique({
        where: {
          userId_level_startDate: {
            userId: session.userId,
            level: cacheLevel,
            startDate: startStr,
          },
        },
      });
      if (cached) {
        return NextResponse.json({ report: cached.summary });
      }

      const logs = await prisma.healthLog.findMany({
      where: {
        userId: session.userId,
        date: { gte: startStr, lte: endStr },
      },
      orderBy: { date: 'asc' },
    });

    const activeModesText = getActiveModesText(userContext);

    const systemPrompt = `
${charaSetting}

## あなたの使命
渡された「過去${period}日分の記録」を**因果関係を突き止める探偵**のように分析し、選ばれた人格の口調で答えなさい。
ただの要約や平均値の羅列は禁止。次のような**気づきを与えるアドバイス**を出しなさい。

### 最優先で見る因果の例
1. **生理周期とメンタル・体調**: period_status（生理前/生理中）と体調・ストレス・便の相関を指摘しなさい。
2. **食事と翌日以降の症状**: meal_description と翌日の pain_level・stool_type の関係を指摘しなさい。
3. **アルコールと睡眠・体調**: 飲酒量(alcohol_amount)と翌日の sleep_quality・general_mood の相関を指摘しなさい。

### 出力ルール
- 因果がはっきりしたパターンは具体的に断じなさい。
- データが少ない・相関が不明な部分は正直に言いなさい。
- 400文字以内で、読みやすく改行を入れなさい。

${MEDICATION_AI_CAUTION_RULE}
`;

    const logsForPrompt = logs.map(healthLogToPromptShape);
    const userPrompt = `以下が過去${period}日分の記録です。因果関係を分析してください。\n\n## ユーザー情報（API側でDBから取得）\n- 既往歴: ${userContext.medicalHistory}\n- 薬: ${userContext.currentMedications}\n- 関心: ${activeModesText}\n\n## 記録データ\n${JSON.stringify(logsForPrompt, null, 2)}`;

    const env = getServerEnv();
    if (!env.OPENAI_API_KEY) {
      return NextResponse.json(
        { report: '相棒が休憩中です。OPENAI_API_KEY を設定してからもう一度お試しください。' },
        { status: HTTP_STATUS.SERVICE_UNAVAILABLE },
      );
    }

      const report = await chatCompletion({
        systemPrompt,
        userContent: userPrompt,
        fallbackMessage: '分析結果を出せませんでした。もう一度お試しください。',
      });

      // キャッシュ保存（同一期間の次回以降はDBから返す）
      await prisma.insight.upsert({
        where: {
          userId_level_startDate: {
            userId: session.userId,
            level: cacheLevel,
            startDate: startStr,
          },
        },
        create: {
          userId: session.userId,
          level: cacheLevel,
          startDate: startStr,
          endDate: endStr,
          summary: report,
          metadata: { period },
        },
        update: {
          endDate: endStr,
          summary: report,
          metadata: { period },
        },
      });

      return NextResponse.json({ report });
    } catch (error) {
      console.error('Report API Error:', error);
      return NextResponse.json(
        { report: 'サーバーエラーが発生しました。しばらくしてからもう一度お試しください。', error: String(error) },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
    }
  });
}
