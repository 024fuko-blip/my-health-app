/** unknown を string | null に変換（API body 用） */
export function toStringOrNull(v: unknown): string | null {
  if (v == null || v === '') return null;
  return typeof v === 'string' ? v : String(v);
}

/** unknown を number | null に変換（API body 用） */
export function toNumOrNull(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

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
