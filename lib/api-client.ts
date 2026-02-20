/**
 * クライアント側の API 呼び出し用ユーティリティ。
 * 認証チェック・credentials・401 ハンドリングを共通化。
 */
import type { AppRouterInstance } from 'next/navigation';

const DEFAULT_OPTIONS: RequestInit = {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
};

export interface SessionUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

/** セッション取得。未認証の場合は router があれば /login へリダイレクト */
export async function ensureSession(
  router?: AppRouterInstance
): Promise<{ user: SessionUser } | null> {
  const res = await fetch('/api/auth/session', { credentials: 'include' });
  const data = (await res.json()) as { user?: SessionUser };
  if (!data?.user) {
    if (router) router.replace('/login');
    return null;
  }
  return { user: data.user };
}

/** credentials + JSON ヘッダ付きで fetch */
export function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, { ...DEFAULT_OPTIONS, ...init });
}

/**
 * JSON ボディで POST。401 時は handleUnauthorized を呼ぶ想定。
 */
export async function apiPost<T>(
  url: string,
  body: unknown
): Promise<{ ok: true; data: T } | { ok: false; status: number; error?: string }> {
  const res = await fetch(url, {
    method: 'POST',
    ...DEFAULT_OPTIONS,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, status: res.status, error: err.error ?? res.statusText };
  }
  return { ok: true, data: (await res.json()) as T };
}

/** 401 時の共通処理（alert + /login へリダイレクト） */
export function handleUnauthorized(router?: AppRouterInstance): void {
  if (typeof window !== 'undefined') {
    alert('セッションが切れました。再度ログインしてください。');
    router?.replace('/login');
  }
}
