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

/** 明日の日付を JST で YYYY-MM-DD */
export function getTomorrowJST(): string {
  const formatter = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const parts = formatter.formatToParts(tomorrow);
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

/** 前週月曜〜日曜の開始日・終了日を返す（JST）。今日が月曜なら「先週」の月〜日 */
export function getPreviousWeekRange(): { startDate: string; endDate: string } {
  const today = getTodayJST();
  const [y, m, day] = today.split('-').map(Number);
  const date = new Date(y, m - 1, day);
  const dayOfWeek = date.getDay(); // 0=Sun .. 6=Sat
  const daysToLastMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const lastMonday = new Date(date);
  lastMonday.setDate(date.getDate() - daysToLastMonday - 7);
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    startDate: `${lastMonday.getFullYear()}-${pad(lastMonday.getMonth() + 1)}-${pad(lastMonday.getDate())}`,
    endDate: `${lastSunday.getFullYear()}-${pad(lastSunday.getMonth() + 1)}-${pad(lastSunday.getDate())}`,
  };
}

/** 前月の1日〜末日を返す（JST） */
export function getPreviousMonthRange(): { startDate: string; endDate: string } {
  const today = getTodayJST();
  const [y, m] = today.split('-').map(Number);
  const prevMonth = m === 1 ? 12 : m - 1;
  const prevYear = m === 1 ? y - 1 : y;
  const lastDay = new Date(prevYear, prevMonth, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    startDate: `${prevYear}-${pad(prevMonth)}-01`,
    endDate: `${prevYear}-${pad(prevMonth)}-${pad(lastDay)}`,
  };
}

/** 前年の1月1日〜12月31日を返す（JST） */
export function getPreviousYearRange(): { startDate: string; endDate: string } {
  const today = getTodayJST();
  const y = parseInt(today.slice(0, 4), 10) - 1;
  return { startDate: `${y}-01-01`, endDate: `${y}-12-31` };
}

/** 指定日を含む週の月曜〜日曜を返す。dateStr は YYYY-MM-DD */
export function getWeekRangeFromDate(dateStr: string): { startDate: string; endDate: string } {
  if (!isValidDateStr(dateStr)) throw new Error(`Invalid date: ${dateStr}`);
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dayOfWeek = date.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(date);
  monday.setDate(date.getDate() - daysToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    startDate: `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`,
    endDate: `${sunday.getFullYear()}-${pad(sunday.getMonth() + 1)}-${pad(sunday.getDate())}`,
  };
}

/** 指定日を含む月の1日〜末日を返す。dateStr は YYYY-MM-DD */
export function getMonthRangeFromDate(dateStr: string): { startDate: string; endDate: string } {
  if (!isValidDateStr(dateStr)) throw new Error(`Invalid date: ${dateStr}`);
  const [y, m] = dateStr.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    startDate: `${y}-${pad(m)}-01`,
    endDate: `${y}-${pad(m)}-${pad(lastDay)}`,
  };
}

/** 指定日を含む年の1月1日〜12月31日を返す。dateStr は YYYY-MM-DD */
export function getYearRangeFromDate(dateStr: string): { startDate: string; endDate: string } {
  if (!isValidDateStr(dateStr)) throw new Error(`Invalid date: ${dateStr}`);
  const y = dateStr.slice(0, 4);
  return { startDate: `${y}-01-01`, endDate: `${y}-12-31` };
}

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
