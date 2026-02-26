import { z, type ZodSchema } from 'zod';
import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import type { Session } from '@/lib/auth';

/**
 * 認証が必要な API ルートで使用。未認証の場合は 401 を返す。
 * handler には認証済みの session が渡される。
 * 未捕捉の例外は自動で 500 を返す（DRY: 各ルートの try/catch を省略可）。
 */
export async function withSession(
  handler: (session: Session) => Promise<NextResponse>
): Promise<NextResponse> {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  try {
    return await handler(session);
  } catch (error) {
    console.error('[withSession] Uncaught error:', error);
    return new NextResponse(
      JSON.stringify({ error: '処理に失敗しました' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
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
          parsed.error.errors
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
