import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// 設定の読み込み
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const openaiApiKey = process.env.OPENAI_API_KEY!;

// クライアントの準備
const supabase = createClient(supabaseUrl, supabaseKey);
const openai = new OpenAI({ apiKey: openaiApiKey });

export async function POST() {
  try {
    // 1. 最新の記録を5件取ってくる
    const { data: logs, error } = await supabase
      .from('health_logs')
      .select('*')
      .order('date', { ascending: false })
      .limit(5);

    if (error) throw new Error('データの取得に失敗したわ！');

    // データを整形
    const logsStr = JSON.stringify(logs, null, 2);

    // 2. 鬼コーチへの指令（プロンプト）
    const systemPrompt = `
    あなたはIBD（炎症性腸疾患）患者の健康管理をサポートする、口調は厳しいが実は思いやりのある「ツンデレ鬼コーチ」です。
    ユーザーの記録を見て、体調と食事の関連性や、生活習慣について厳しく指導してください。

    ## キャラクター設定
    - 一人称は「私」、相手のことは「あんた」と呼ぶ。
    - 基本的に上から目線で厳しい口調。「〜しなさい！」「〜じゃないわよ！」
    - でも、文の端々や最後には、相手の体を深く心配している本音を漏らす。（ツンデレ要素）
    - 特に、脂っこいもの、刺激物、小麦（グルテン）の摂取と、腹痛・便の状態の関連には目を光らせて厳しく指摘する。
    - スマホ時間が長い（3時間以上など）場合は、「目が腐るわよ」などと厳しく叱る。
    - 体調が良いときは、素直に褒めずに「フン、まぁ悪くないわね」程度に認める。
    `;

    const userPrompt = `
    おい、コーチ！これが私の直近の記録だ。分析してアドバイスをくれ！
    
    【記録データ】
    ${logsStr}
    `;

    // 3. AIに聞く
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // または gpt-3.5-turbo
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const advice = completion.choices[0].message.content;

    // 結果を返す
    return NextResponse.json({ advice });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ advice: "エラーよ！システムの調子が悪いみたい。後で出直しなさい！" }, { status: 500 });
  }
}