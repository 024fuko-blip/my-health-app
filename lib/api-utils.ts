import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import type { Session } from '@/lib/auth';

/**
 * 認証が必要な API ルートで使用。未認証の場合は 401 を返す。
 * handler には認証済みの session が渡される。
 */
export async function withSession(
  handler: (session: Session) => Promise<NextResponse>
): Promise<NextResponse> {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  return handler(session);
}

/**
 * req.json() を安全にパースする。
 * 不正 JSON の場合は 400 を返し、500 にならないようにする。
 */
export async function parseJsonBody<T = Record<string, unknown>>(
  req: Request
): Promise<{ ok: true; data: T } | { ok: false; error: NextResponse }> {
  try {
    const data = (await req.json()) as T;
    return { ok: true, data };
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
