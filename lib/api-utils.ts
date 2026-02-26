import { z, type ZodSchema } from 'zod';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireSession } from '@/lib/auth';
import type { Session } from '@/lib/auth';
import { isApiRateLimited, type RateLimitConfig } from '@/lib/rate-limit';
import { OpenAIKeyMissingError } from '@/lib/openai-client';

/** JSON 形式の統一エラーレスポンス */
export function errorResponse(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/** タイミングセーフな文字列比較（Cron Secret 等の保護用） */
export function timingSafeCompare(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export interface WithSessionOptions {
  rateLimit?: RateLimitConfig;
}

/**
 * 認証が必要な API ルートで使用。未認証の場合は 401 を返す。
 * handler には認証済みの session が渡される。
 * 未捕捉の例外は自動で 500 を返す（DRY: 各ルートの try/catch を省略可）。
 * OpenAIKeyMissingError は自動で 503 を返す。
 */
export async function withSession(
  handler: (session: Session) => Promise<NextResponse>,
  options?: WithSessionOptions
): Promise<NextResponse> {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  if (options?.rateLimit && isApiRateLimited(session.userId, options.rateLimit)) {
    return errorResponse('リクエスト回数が上限に達しました。しばらくお待ちください。', 429);
  }
  try {
    return await handler(session);
  } catch (error) {
    if (error instanceof OpenAIKeyMissingError) {
      return errorResponse('AI機能は現在利用できません', 503);
    }
    console.error('[withSession] Uncaught error:', error);
    return errorResponse('処理に失敗しました', 500);
  }
}

/**
 * req.json() を安全にパースする。
 * 不正 JSON の場合は 400 を返し、500 にならないようにする。
 * schema を渡すと Zod で検証し、不正な場合は 400 を返す。
 */
export async function parseJsonBody<T = Record<string, unknown>>(
  req: Request,
  schema?: ZodSchema<T>
): Promise<{ ok: true; data: T } | { ok: false; error: NextResponse }> {
  try {
    const raw = await req.json();
    if (schema) {
      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        const msg =
          parsed.error.issues
            .map((e) => `${e.path.join('.')}: ${e.message}`)
            .join('; ') || 'Validation failed';
        return {
          ok: false,
          error: new NextResponse(
            JSON.stringify({ error: msg }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          ),
        };
      }
      return { ok: true, data: parsed.data as T };
    }
    return { ok: true, data: raw as T };
  } catch {
    return {
      ok: false,
      error: new NextResponse(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }
}
