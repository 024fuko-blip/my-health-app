/**
 * ダッシュボード用定数。
 * グラフ項目・相関ラベルなどを一元管理。
 */

const CHART_COLOR_PRIMARY = '#475569';
const CHART_COLOR_ACCENT = '#7c3aed';

export const CHART_ITEMS = [
  { key: '体調', color: CHART_COLOR_PRIMARY, label: '体調', mode: null },
  { key: '腹痛', color: CHART_COLOR_ACCENT, label: '腹痛', mode: 'mode_ibd' },
  { key: 'トイレ', color: CHART_COLOR_PRIMARY, label: 'トイレ', mode: 'mode_ibd' },
  { key: '気分', color: CHART_COLOR_ACCENT, label: '気分', mode: 'mode_mental' },
  { key: '体重', color: CHART_COLOR_PRIMARY, label: '体重', mode: 'mode_diet' },
  { key: 'アルコール', color: CHART_COLOR_ACCENT, label: 'アルコール', mode: 'mode_alcohol' },
] as const;

export const CORRELATION_LABELS: Record<string, string> = {
  sleep_mood: '睡眠↔体調',
  stress_mood: 'ストレス↔体調',
  period_mood: '生理↔体調',
  alcohol_pain_next: '飲酒→翌日腹痛',
  stress_mood_next: 'ストレス→翌日体調',
};
