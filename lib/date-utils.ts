/**
 * JST 日付ユーティリティ。
 * cron・webhook・health-logs で共通利用。
 */

/** 今日の日付を JST で YYYY-MM-DD */
export function getTodayJST(): string {
  const formatter = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(new Date());
  const y = parts.find((p) => p.type === 'year')!.value;
  const m = parts.find((p) => p.type === 'month')!.value;
  const d = parts.find((p) => p.type === 'day')!.value;
  return `${y}-${m}-${d}`;
}

/** 過去 N 日分の日付リスト（YYYY-MM-DD） */
export function getPastDates(days: number): string[] {
  const formatter = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dates: string[] = [];
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const parts = formatter.formatToParts(d);
    const y = parts.find((p) => p.type === 'year')!.value;
    const m = parts.find((p) => p.type === 'month')!.value;
    const day = parts.find((p) => p.type === 'day')!.value;
    dates.push(`${y}-${m}-${day}`);
  }
  return dates;
}

const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** YYYY-MM-DD 形式かつ有効な日付か（月・日の範囲も検証） */
export function isValidDateStr(s: string): boolean {
  if (!DATE_REGEX.test(s)) return false;
  const [y, m, day] = s.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1, day));
  return (
    !isNaN(d.getTime()) &&
    d.getUTCFullYear() === y &&
    d.getUTCMonth() + 1 === m &&
    d.getUTCDate() === day
  );
}
