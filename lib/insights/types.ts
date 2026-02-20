/**
 * 重層的データ分析（Hierarchical Insight）の型定義。
 */

export type InsightLevel = 'weekly' | 'monthly' | 'yearly';

/** 週次 metadata の構造 */
export interface WeeklyMetadata {
  avgMood?: number;
  avgPainLevel?: number;
  totalSteps?: number;
  daysRecorded?: number;
  alcoholDays?: number;
  periodStatus?: string;
  avgStressLevel?: number;
  totalAlcoholAmount?: number;
}

/** 月次 metadata の構造 */
export interface MonthlyMetadata {
  weeklyCount?: number;
  avgMoodTrend?: number;
  dominantPeriodPhase?: string;
}

/** 年次 metadata の構造 */
export interface YearlyMetadata {
  monthlyCount?: number;
  seasonPatterns?: string[];
}

export type InsightMetadata = WeeklyMetadata | MonthlyMetadata | YearlyMetadata;

/** 生成結果（DB upsert 用） */
export interface GenerateResult {
  startDate: string;
  endDate: string;
  summary: string;
  metadata?: InsightMetadata;
}
