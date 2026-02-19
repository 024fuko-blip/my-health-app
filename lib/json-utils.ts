/**
 * JSON 文字列を安全にパースする。
 * 不正 JSON や空文字の場合は fallback を返す。
 */
export function safeParseJson<T = unknown>(
  str: string | null | undefined,
  fallback: T
): T {
  if (!str || str.trim() === '') return fallback;
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}
