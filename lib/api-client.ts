/**
 * クライアント側の API 呼び出し用ユーティリティ。
 * 認証チェック・credentials・401 ハンドリングを共通化。
 */

import { PATH } from '@/lib/constants';

/** useRouter() 互換型。next/navigation の AppRouterInstance は非公開のため自前定義 */
export interface RouterLike {
  replace(url: string): void;
  push(url: string): void;
}

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
  router?: RouterLike
): Promise<{ user: SessionUser } | null> {
  const res = await fetch('/api/auth/session', { credentials: 'include' });
  const data = (await res.json()) as { user?: SessionUser };
  if (!data?.user) {
    if (router) router.replace(PATH.LOGIN);
    return null;
  }
  return { user: data.user };
}

/** credentials + JSON ヘッダ付きで fetch */
export function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, { ...DEFAULT_OPTIONS, ...init });
}

type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error?: string };

/** JSON ボディで任意 HTTP メソッドを送信する基底関数 */
async function apiMutate<T>(
  method: string,
  url: string,
  body: unknown
): Promise<ApiResult<T>> {
  const res = await fetch(url, {
    method,
    ...DEFAULT_OPTIONS,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, status: res.status, error: err.error ?? res.statusText };
  }
  return { ok: true, data: (await res.json()) as T };
}

export function apiPost<T>(url: string, body: unknown): Promise<ApiResult<T>> {
  return apiMutate<T>('POST', url, body);
}

export function apiPut<T>(url: string, body: unknown): Promise<ApiResult<T>> {
  return apiMutate<T>('PUT', url, body);
}

export function apiPatch<T>(url: string, body: unknown): Promise<ApiResult<T>> {
  return apiMutate<T>('PATCH', url, body);
}

/** DELETE リクエスト。credentials 付き。 */
export async function apiDelete(
  url: string
): Promise<{ ok: true } | { ok: false; status: number }> {
  const res = await apiFetch(url, { method: 'DELETE' });
  return res.ok ? { ok: true } : { ok: false, status: res.status };
}

/** 401 時の共通処理（alert + ログインページへリダイレクト） */
export function handleUnauthorized(router?: RouterLike): void {
  if (typeof window !== 'undefined') {
    alert('セッションが切れました。再度ログインしてください。');
    router?.replace(PATH.LOGIN);
  }
}
