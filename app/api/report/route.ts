import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' });

interface ReportRequestBody {
  period: 7 | 30;
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            try { cookieStore.set({ name, value, ...options }); } catch {}
          },
          remove(name: string, options: CookieOptions) {
            try { cookieStore.set({ name, value: '', ...options }); } catch {}
          },
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const body = (await req.json()) as ReportRequestBody;
    const period = body.period === 30 ? 30 : 7;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const { data: logs, error: logsError } = await supabase
      .from('health_logs')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('date', startStr)
      .lte('date', endStr)
      .order('date', { ascending: true });

    if (logsError) {
      console.error('Report API logs fetch error:', logsError);
      return NextResponse.json(
        { report: '記録の取得に失敗したわ。もう一度試してちょうだい！', error: logsError.message },
        { status: 500 }
      );
    }

    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle();

    const settings = userSettings || {
      medical_history: 'なし',
      current_medications: 'なし',
      mode_ibd: false,
      mode_diet: false,
      mode_alcohol: false,
      mode_mental: false,
    };

    const charaSetting = `
あなたはIBDとボディメイクを指導する「ツンデレオネエの鬼コーチ」であり、今回だけは**敏腕のヘルスケア・探偵オネエ**として振る舞いなさい。
口調は強めのオネエ言葉（「〜じゃないの！」「〜だわ」「アンタ」）。激辛口だけど、本当は誰よりもユーザーの体を心配している愛のある相棒よ。
`;

    const systemPrompt = `
${charaSetting}

## あなたの使命
渡された「過去${period}日分の記録」を**因果関係を突き止める探偵**のように分析しなさい。
ただの要約や平均値の羅列は禁止。次のような**気づきを与えるアドバイス**を出しなさい。

### 最優先で見る因果の例
1. **生理周期とメンタル・体調**: 「生理前だからイライラするのは仕方ないわ、肌荒れもそのせいね」のように、period_status（生理前/生理中）と体調・ストレス・便の相関を指摘しなさい。
2. **食事と翌日以降の症状**: 「アンタ、〇〇（小麦粉・脂っこいもの・刺激物など）食べた翌日は決まってお腹壊してるわよ！」のように、meal_description と翌日の pain_level・stool_type の関係を指摘しなさい。
3. **アルコールと睡眠・体調**: 飲酒量(alcohol_amount)と翌日の sleep_quality・general_mood の相関をズバッと言いなさい。

### 出力ルール
- 因果がはっきりしたパターンは、具体的に「〇〇の日は△△になってる」と断じなさい。
- データが少ない・相関が不明な部分は「もう少し記録を続けないとわからないわ」と正直に言いなさい。
- 400文字以内で、読みやすく改行を入れなさい。
`;

    const userPrompt = `これが過去${period}日分の記録よ！ 因果関係を暴いてちょうだい！\n\n## ユーザー情報（API側でDBから取得）\n- 既往歴: ${settings.medical_history}\n- 薬: ${settings.current_medications}\n- 関心: IBD=${settings.mode_ibd} / ダイエット=${settings.mode_diet} / アルコール=${settings.mode_alcohol} / メンタル=${settings.mode_mental}\n\n## 記録データ\n${JSON.stringify(logs ?? [], null, 2)}`;

    if (!process.env.OPENAI_API_KEY?.trim()) {
      return NextResponse.json(
        { report: 'オネエが休憩中よ！OPENAI_API_KEY を設定してからもう一度試してちょうだい！' },
        { status: 503 }
      );
    }
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
    });

    const report = completion.choices[0]?.message?.content ?? '分析結果を出せなかったわ。ごめんなさい！';
    return NextResponse.json({ report });
  } catch (error) {
    console.error('Report API Error:', error);
    return NextResponse.json(
      { report: 'あらヤダ、サーバーのエラーよ！しばらくしてからもう一度試してちょうだい！', error: String(error) },
      { status: 500 }
    );
  }
}
