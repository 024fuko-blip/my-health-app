import { createServerClient, type CookieOptions } from '@supabase/ssr'; // ★ここが最新版
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    // ---------------------------------------------------------
    // 1. セキュリティ & ユーザー特定 (Supabase Auth / SSR)
    // ---------------------------------------------------------
    const cookieStore = await cookies(); // ★Next.js 15以降は await が必須

    // ★あなたが貼ってくれたコードはここに入ります
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            try { cookieStore.set({ name, value, ...options }); } catch (error) {}
          },
          remove(name: string, options: CookieOptions) {
            try { cookieStore.set({ name, value: '', ...options }); } catch (error) {}
          },
        },
      }
    );
    
    // セッションチェック
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    // ---------------------------------------------------------
    // 2. データ準備
    // ---------------------------------------------------------
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new NextResponse(
        JSON.stringify({ advice: 'リクエストの解析に失敗したわ。送り直してちょうだい！' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const { mode, logs, meal_image_base64: mealImageBase64, ...dailyInput } = body;

    // DBから設定取得（モードフラグ含む）
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    const settings = userSettings || {
      medical_history: 'なし',
      current_medications: 'なし',
      gender: '不明',
      mode_ibd: false,
      mode_diet: false,
      mode_alcohol: false,
      mode_mental: false,
    };

    // 値が存在する項目だけを「今日の記録」に含める（ホリスティック用）
    const recordLabels: Record<string, string> = {
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
    const todayRecord: string[] = [];
    for (const [key, label] of Object.entries(recordLabels)) {
      const v = (dailyInput as Record<string, unknown>)[key];
      if (v === undefined || v === null || v === '') continue;
      if (key === 'medication_taken') {
        todayRecord.push(`${label}: ${v ? '飲んだ' : 'まだ'}`);
      } else {
        todayRecord.push(`${label}: ${v}`);
      }
    }
    const todayRecordText = todayRecord.length > 0 ? todayRecord.join('\n') : '（記録なし）';

    // ユーザーが特に関心を持っている項目（ONになっているモード）
    const activeModes: string[] = [];
    if (settings.mode_ibd) activeModes.push('IBD（腸の症状・便・腹痛）');
    if (settings.mode_diet) activeModes.push('ボディメイク・食事・運動');
    if (settings.mode_alcohol) activeModes.push('アルコール');
    if (settings.mode_mental) activeModes.push('メンタル・睡眠・ストレス');
    const activeModesText = activeModes.length > 0 ? activeModes.join('、') : '特になし';

    // ---------------------------------------------------------
    // 3. プロンプト構築（ホリスティック・超敏腕オネエ）
    // ---------------------------------------------------------
    const charaSetting = `
あなたはIBDとボディメイクを指導する「ツンデレオネエの鬼コーチ」よ。
口調は強めのオネエ言葉（「〜しなさい！」「〜じゃないの！」「〜だわ」）。
激辛口だけど、本当は誰よりもユーザーの体を心配している愛のある相棒として振る舞いなさい。
`;

    const priorityRules = `
## 【絶対厳守】優先順位ルール

1. **【最優先】体調の急変・危険信号**
   腹痛レベルが高い（3以上）、血便・下痢・粘液便などIBD症状がある、または体調・気分が悪い（2以下）場合は、
   **ダイエット・ボディメイク・運動の話は一切しないこと。**
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

    let systemPrompt: string;
    let userPrompt: string;

    if (mode === 'weekly') {
      systemPrompt = `
${charaSetting}
あなたは渡された1週間分の記録を、**全体を総合的に**分析する「超・敏腕探偵」よ。
食事・便・腹痛・アルコール・運動・ストレスなどを繋げて、体調不良の原因や悪い習慣のパターンを指摘しなさい。

## ユーザー情報
- 既往歴: ${settings.medical_history}
- 薬: ${settings.current_medications}
- 関心分野: ${activeModesText}

${priorityRules}
分析結果は250文字以内でまとめなさい。
`;
      userPrompt = `これが1週間分の記録よ！ 総合的に分析してちょうだい！\n${JSON.stringify(logs)}`;
    } else {
      const hasImage = typeof mealImageBase64 === 'string' && mealImageBase64.startsWith('data:image');
      const imageInstruction = hasImage
        ? '\n**画像がある場合**: その食事写真の内容（品目・量・カロリーや栄養バランスの目安）を解析し、IBDやダイエットの観点からフィードバックを行うこと。'
        : '';
      systemPrompt = `
${charaSetting}
渡された「今日の記録」は、食事・便・腹痛・アルコール・運動・メンタルなど**すべてを繋げて**総合的に判断しなさい。
「モードごとの縦割り」は禁止。因果関係（例：酒を飲んだから腹痛、脂っこい食事で便が悪い）を指摘してよい。
${imageInstruction}

## ユーザー情報
- 既往歴: ${settings.medical_history}
- 薬: ${settings.current_medications}（飲み忘れがないか確認すること）
- 関心分野（ユーザーが特に関心を持っていること）: ${activeModesText}

${priorityRules}
150文字以内で、上記優先順位に従ってコメントしなさい。
`;
      userPrompt = `今日の記録よ。全部見てコメントしなさい！\n\n${todayRecordText}`;
    }

    // ---------------------------------------------------------
    // 4. OpenAI API コール（画像ありなら Vision = gpt-4o）
    // ---------------------------------------------------------
    const isDailyWithImage = mode === 'daily'
      && typeof mealImageBase64 === 'string' && mealImageBase64.startsWith('data:image');
    const model = isDailyWithImage ? 'gpt-4o' : 'gpt-4o-mini';

    const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = isDailyWithImage
      ? [
          { type: 'text', text: userPrompt },
          { type: 'image_url', image_url: { url: mealImageBase64 as string } },
        ]
      : [{ type: 'text', text: userPrompt }];

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent.length === 1 ? userPrompt : userContent },
      ],
      temperature: 0.7,
    });

    const advice = completion.choices[0]?.message?.content ?? 'あら、返事が出せなかったわ。もう一度送ってちょうだい！';
    return NextResponse.json({ advice });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { advice: "あらヤダ、サーバーのエラーよ！システム管理者を呼んできて！", error: String(error) }, 
      { status: 500 }
    );
  }
}