import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireSession } from '@/lib/auth';
import { getServerEnv } from '@/lib/env';
import { parseJsonBody } from '@/lib/api-utils';

const NUTRITION_JSON_PROMPT = `
あなたは食事から栄養成分を推定する専門家です。
以下の形式でJSON形式のみを返してください。推定が難しい場合は null としてください。

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
- 複数の食品がある場合は合計値
- JSON以外のテキストは出力しないこと
`;

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    if (session instanceof NextResponse) return session;

    const parsed = await parseJsonBody<{ image_base64?: string; meal_description?: string }>(req);
    if (!parsed.ok) return parsed.error;
    const body = parsed.data;
    const imageBase64 = body.image_base64;
    const mealDescription =
      typeof body.meal_description === 'string' ? body.meal_description.trim() : '';

    const hasImage =
      imageBase64 &&
      typeof imageBase64 === 'string' &&
      imageBase64.startsWith('data:image');
    const hasText = mealDescription.length > 0;

    if (!hasImage && !hasText) {
      return NextResponse.json(
        { error: '画像データまたは食事の文字説明が必要です' },
        { status: 400 }
      );
    }

    const env = getServerEnv();
    if (!env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'API未設定' }, { status: 503 });
    }

    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

    let responseText: string;

    if (hasImage) {
      // 画像から推定（従来どおり Vision）
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: NUTRITION_JSON_PROMPT + '\n画像に写っている食事を分析すること。見た目の量から合理的に推定すること。' },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'この食事画像を分析して、栄養成分を推定してください。' },
              { type: 'image_url', image_url: { url: imageBase64 } },
            ],
          },
        ],
        temperature: 0.3,
      });
      responseText = completion.choices[0]?.message?.content ?? '';
    } else {
      // 文字説明から推定
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: NUTRITION_JSON_PROMPT + '\nユーザーが書いた食事の文字説明から、一般的な一食分の量を想定して栄養成分を推定すること。' },
          {
            role: 'user',
            content: `以下の食事内容から栄養成分を推定してください。\n\n「${mealDescription}」`,
          },
        ],
        temperature: 0.3,
      });
      responseText = completion.choices[0]?.message?.content ?? '';
    }

    let nutritionData: Record<string, unknown>;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        nutritionData = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      } else {
        throw new Error('JSON not found');
      }
    } catch {
      console.error('Failed to parse nutrition data:', responseText);
      return NextResponse.json(
        { error: '分析結果の解析に失敗しました', raw: responseText },
        { status: 500 }
      );
    }

    return NextResponse.json(nutritionData);
  } catch (error) {
    console.error('Meal analysis error:', error);
    return NextResponse.json({ error: '分析エラー' }, { status: 500 });
  }
}
