/**
 * correlation モジュール共通のユーティリティ関数。
 * index.ts / triggers.ts で重複していたロジックを一元化。
 */

/** 睡眠品質を数値化 (悪い=1, 普通=2, 良い=3) */
export function sleepToNum(s: string | null | undefined): number | null {
  if (!s) return null;
  if (s.includes('悪') || s === '悪い') return 1;
  if (s.includes('普') || s === '普通') return 2;
  if (s.includes('良') || s === '良い') return 3;
  return null;
}

/** 生理中を 1、それ以外を 0 */
export function periodToNum(s: string | null | undefined): number | null {
  if (!s) return null;
  return s === '生理中' ? 1 : 0;
}

/** 日付文字列(YYYY-MM-DD)の翌日を YYYY-MM-DD で返す */
export function nextDateStr(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}
