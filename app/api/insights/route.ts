/**
 * インサイト API: 一覧取得・手動生成
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withSession, parseJsonBody } from '@/lib/api-utils';
import { insightPostSchema } from '@/lib/validations/api-schemas';
import { generateAndSaveInsight, type InsightLevel } from '@/lib/insights/generate';
import {
  getPreviousWeekRange,
  getPreviousMonthRange,
  getPreviousYearRange,
  getWeekRangeFromDate,
  getMonthRangeFromDate,
  getYearRangeFromDate,
} from '@/lib/date-utils';

const INSIGHT_LEVELS = ['weekly', 'monthly', 'yearly'] as const;

export async function GET(req: NextRequest) {
  return withSession(async (session) => {
    const { searchParams } = new URL(req.url);
    const rawLevel = searchParams.get('level');
    const level: InsightLevel | null =
      rawLevel && INSIGHT_LEVELS.includes(rawLevel as InsightLevel) ? (rawLevel as InsightLevel) : null;
    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10) || 20),
      100
    );

    const where: { userId: string; level?: string } = { userId: session.userId };
    if (level) where.level = level;

    const insights = await prisma.insight.findMany({
      where,
      orderBy: { startDate: 'desc' },
      take: limit,
    });

    return NextResponse.json({ insights });
  });
}

export async function POST(req: Request) {
  return withSession(async (session) => {
    const parsed = await parseJsonBody(req, insightPostSchema);
    if (!parsed.ok) return parsed.error;
    const { level, startDate } = parsed.data;

    let range: { startDate: string; endDate: string };
    if (startDate) {
      if (level === 'weekly') range = getWeekRangeFromDate(startDate);
      else if (level === 'monthly') range = getMonthRangeFromDate(startDate);
      else range = getYearRangeFromDate(startDate);
    } else {
      if (level === 'weekly') range = getPreviousWeekRange();
      else if (level === 'monthly') range = getPreviousMonthRange();
      else range = getPreviousYearRange();
    }

    const result = await generateAndSaveInsight(
      session.userId,
      level,
      range.startDate,
      range.endDate
    );

    return NextResponse.json({ ok: true, id: result.id, ...range });
  });
}
