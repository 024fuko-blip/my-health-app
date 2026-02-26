/**
 * ダッシュボード用型定義。
 */

export type PeriodDays = 7 | 30;
export type InsightTab = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface InsightRow {
  id: string;
  level: string;
  startDate: string;
  endDate: string;
  summary: string;
  metadata: Record<string, unknown> | null;
}

export interface SectionOpen {
  report: boolean;
  chart: boolean;
  mindBody: boolean;
  correlation: boolean;
  triggers: boolean;
}

export interface MedicationWithNdb {
  id: number;
  name: string;
  timings: string[];
  ndb?: { drugCode: string; categoryName: string; price: number | null; isGeneric: boolean };
}
