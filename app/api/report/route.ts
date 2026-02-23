import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import prisma from '@/lib/prisma';
import { getServerEnv } from '@/lib/env';
import { parseJsonBody, withSession } from '@/lib/api-utils';
import { getCharaPrompt } from '@/lib/chara-settings';
import { formatMedicationsFromSettings } from '@/lib/medication-prompt';

const DAILY_REPORT_LEVEL_PREFIX = 'daily_report_';

export async function POST(req: Request) {
  return withSession(async (session) => {
    try {
      const parsed = await parseJsonBody<{ period?: number }>(req);
      if (!parsed.ok) return parsed.error;
      const body = parsed.data;
      const period = body.period === 30 ? 30 : 7;

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - period);
      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      const userSettings = await prisma.userSettings.findUnique({
        where: { userId: session.userId },
      });
      const aiPersonality = userSettings?.aiPersonality ?? 'tsundere';
      const charaSetting = getCharaPrompt(aiPersonality, 'advice');
      const medicationsFormatted = formatMedicationsFromSettings(userSettings?.currentMedications);

      // 同一期間・同一人格のキャッシュを確認
      const cacheLevel = `${DAILY_REPORT_LEVEL_PREFIX}${period}_${aiPersonality}`;
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

    const settings = userSettings
      ? {
          medical_history: userSettings.medicalHistory ?? 'なし',
          current_medications: medicationsFormatted,
          mode_ibd: userSettings.modeIbd,
          mode_diet: userSettings.modeDiet,
          mode_alcohol: userSettings.modeAlcohol,
          mode_mental: userSettings.modeMental,
        }
      : {
          medical_history: 'なし',
          current_medications: medicationsFormatted || 'なし',
          mode_ibd: false,
          mode_diet: false,
          mode_alcohol: false,
          mode_mental: false,
        };

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
`;

    const logsForPrompt = logs.map((l) => ({
      date: l.date,
      memo: l.memo,
      medication_taken: l.medicationTaken,
      general_mood: l.generalMood,
      meal_description: l.mealDescription,
      period_status: l.periodStatus,
      pain_level: l.painLevel,
      stool_type: l.stoolType,
      alcohol_amount: l.alcoholAmount,
      stress_level: l.stressLevel,
      sleep_quality: l.sleepQuality,
      spending: l.spending,
      weight: l.weight,
      steps: l.steps,
      ai_comment: l.aiComment,
    }));
    const userPrompt = `以下が過去${period}日分の記録です。因果関係を分析してください。\n\n## ユーザー情報（API側でDBから取得）\n- 既往歴: ${settings.medical_history}\n- 薬: ${settings.current_medications}\n- 関心: IBD=${settings.mode_ibd} / ボディメイク=${settings.mode_diet} / アルコール=${settings.mode_alcohol} / メンタル=${settings.mode_mental}\n\n## 記録データ\n${JSON.stringify(logsForPrompt, null, 2)}`;

    const env = getServerEnv();
    if (!env.OPENAI_API_KEY) {
      return NextResponse.json(
        { report: '相棒が休憩中です。OPENAI_API_KEY を設定してからもう一度お試しください。' },
        { status: 503 }
      );
    }
    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
    });

      const report = completion.choices[0]?.message?.content ?? '分析結果を出せませんでした。もう一度お試しください。';

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
        { status: 500 }
      );
    }
  });
}
