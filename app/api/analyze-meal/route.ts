import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getSession } from '@/lib/auth';
import { getServerEnv } from '@/lib/env';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const body = await req.json();
    const { image_base64 } = body;

    if (!image_base64 || typeof image_base64 !== 'string' || !image_base64.startsWith('data:image')) {
      return NextResponse.json({ error: '画像データが必要です' }, { status: 400 });
    }

    const env = getServerEnv();
    if (!env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'API未設定' }, { status: 503 });
    }

    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

    const systemPrompt = `
あなたは食事画像から栄養成分を推定する専門家です。
画像に写っている食事を分析し、以下の形式でJSON形式のみを返してください。
推定が難しい場合は null としてください。

{
  "foods": ["食品名1", "食品名2", ...],
  "calories": 推定カロリー(kcal),
  "protein": 推定タンパク質(g),
  "fat": 推定脂質(g),
  "carbs": 推定炭水化物(g),
  "fiber": 推定食物繊維(g),
  "salt": 推定塩分(g),
  "notes": "IBDや健康に関する簡潔なメモ（脂質が多い、消化に良いなど）"
}

注意:
- 数値は整数または小数点1桁まで
- 見た目の量から合理的に推定すること
- 複数の食品がある場合は合計値
- JSON以外のテキストは出力しないこと
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'この食事画像を分析して、栄養成分を推定してください。' },
            { type: 'image_url', image_url: { url: image_base64 } },
          ],
        },
      ],
      temperature: 0.3,
    });

    const responseText = completion.choices[0]?.message?.content ?? '';
    
    // JSONを抽出
    let nutritionData;
    try {
      // マークダウンのコードブロックを除去
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        nutritionData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('JSON not found');
      }
    } catch {
      console.error('Failed to parse nutrition data:', responseText);
      return NextResponse.json({ 
        error: '分析結果の解析に失敗しました',
        raw: responseText 
      }, { status: 500 });
    }

    return NextResponse.json(nutritionData);

  } catch (error) {
    console.error('Meal analysis error:', error);
    return NextResponse.json({ error: '分析エラー' }, { status: 500 });
  }
}
