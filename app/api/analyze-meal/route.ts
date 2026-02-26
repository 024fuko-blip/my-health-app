import { NextResponse } from 'next/server';
import { sanitizeForPrompt } from '@/lib/prompt-utils';
import { parseJsonBody, withSession, errorResponse } from '@/lib/api-utils';
import { chatCompletion } from '@/lib/openai-client';
import { analyzeMealPostSchema } from '@/lib/validations/api-schemas';
import { MAX_IMAGE_BASE64, HTTP_STATUS } from '@/lib/constants';

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
  return withSession(async () => {
    const parsed = await parseJsonBody(req, analyzeMealPostSchema);
    if (!parsed.ok) return parsed.error;
    const body = parsed.data;
    const imageBase64 = body.image_base64;
    const mealDescription =
      typeof body.meal_description === 'string' ? body.meal_description.trim() : '';

    const hasImage =
      imageBase64 &&
      typeof imageBase64 === 'string' &&
      imageBase64.startsWith('data:image');

    if (hasImage && typeof imageBase64 === 'string' && imageBase64.length > MAX_IMAGE_BASE64) {
      return errorResponse('画像サイズは3MBまでです', HTTP_STATUS.BAD_REQUEST);
    }

    const responseText = hasImage
      ? await chatCompletion({
          systemPrompt: NUTRITION_JSON_PROMPT + '\n画像に写っている食事を分析すること。見た目の量から合理的に推定すること。',
          userContent: [
            { type: 'text', text: 'この食事画像を分析して、栄養成分を推定してください。' },
            { type: 'image_url', image_url: { url: imageBase64 as string } },
          ],
          model: 'gpt-4o',
          temperature: 0.3,
          fallbackMessage: '',
        })
      : await chatCompletion({
          systemPrompt: NUTRITION_JSON_PROMPT + '\nユーザーが書いた食事の文字説明から、一般的な一食分の量を想定して栄養成分を推定すること。',
          userContent: `以下の食事内容から栄養成分を推定してください。\n\n${sanitizeForPrompt(mealDescription)}`,
          model: 'gpt-4o-mini',
          temperature: 0.3,
          fallbackMessage: '',
        });

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
      return errorResponse('分析結果の解析に失敗しました', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    return NextResponse.json(nutritionData);
  }, { rateLimit: { windowMs: 60_000, maxRequests: 10 } });
}
