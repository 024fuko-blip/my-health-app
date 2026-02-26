/**
 * LINE Webhook 用の簡易レート制限。
 * lineUserId あたり、指定秒数内の最大リクエスト数を超えたら制限する。
 * ※ Cloud Run はインスタンスごとにメモリが分かれるが、同一インスタンス内では有効。
 */

const WINDOW_MS = 60_000; // 1分
const MAX_REQUESTS_PER_USER = 30;
const store = new Map<string, { count: number; windowStart: number }>();

/** レート制限超過時は true を返す */
export function isRateLimited(lineUserId: string): boolean {
  maybeCleanup();
  const now = Date.now();
  const entry = store.get(lineUserId);

  if (!entry) {
    store.set(lineUserId, { count: 1, windowStart: now });
    return false;
  }

  if (now - entry.windowStart > WINDOW_MS) {
    store.set(lineUserId, { count: 1, windowStart: now });
    return false;
  }

  entry.count++;
  if (entry.count > MAX_REQUESTS_PER_USER) {
    return true;
  }
  return false;
}

/** 古いエントリをクリーンアップ（メモリ肥大化防止） */
function cleanup(): void {
  const now = Date.now();
  for (const [key, val] of store.entries()) {
    if (now - val.windowStart > WINDOW_MS * 2) store.delete(key);
  }
}

/** レート制限チェック（内部でクリーンアップを 1% の確率で実行） */
function maybeCleanup(): void {
  if (Math.random() < 0.01) cleanup();
}
