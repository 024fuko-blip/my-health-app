/**
 * 汎用 API レート制限。
 * userId あたり、指定秒数内の最大リクエスト数を超えたら制限する。
 * Cloud Run はインスタンスごとにメモリが分かれるが、同一インスタンス内では有効。
 */

const store = new Map<string, { count: number; windowStart: number }>();

export interface RateLimitConfig {
  windowMs?: number;
  maxRequests?: number;
}

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 30;

/** レート制限超過時は true を返す */
export function isApiRateLimited(
  userId: string,
  config: RateLimitConfig = {}
): boolean {
  const { windowMs = DEFAULT_WINDOW_MS, maxRequests = DEFAULT_MAX_REQUESTS } = config;
  const now = Date.now();
  const entry = store.get(userId);

  if (!entry || now - entry.windowStart > windowMs) {
    store.set(userId, { count: 1, windowStart: now });
    return false;
  }

  entry.count++;
  if (entry.count > maxRequests) return true;

  if (Math.random() < 0.01) {
    for (const [k, v] of store.entries()) {
      if (now - v.windowStart > windowMs * 2) store.delete(k);
    }
  }
  return false;
}
