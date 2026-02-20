/**
 * インサイト API: 一覧取得・手動生成
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withSession, parseJsonBody } from '@/lib/api-utils';
import { generateAndSaveInsight, type InsightLevel } from '@/lib/insights/generate';
import {
  getPreviousWeekRange,
  getPreviousMonthRange,
  getPreviousYearRange,
  getWeekRangeFromDate,
  getMonthRangeFromDate,
  getYearRangeFromDate,
  isValidDateStr,
} from '@/lib/date-utils';

export async function GET(req: NextRequest) {
  return withSession(async (session) => {
    try {
      const { searchParams } = new URL(req.url);
      const level = searchParams.get('level') as InsightLevel | null;
      const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10) || 20, 100);

      const where: { userId: string; level?: string } = { userId: session.userId };
      if (level && ['weekly', 'monthly', 'yearly'].includes(level)) {
        where.level = level;
      }

      const insights = await prisma.insight.findMany({
        where,
        orderBy: { startDate: 'desc' },
        take: limit,
      });

      return NextResponse.json({ insights });
    } catch (error) {
      console.error('Insights GET error:', error);
      return NextResponse.json(
        { error: 'インサイトの取得に失敗しました' },
        { status: 500 }
      );
    }
  });
}

export async function POST(req: Request) {
  return withSession(async (session) => {
    try {
      const parsed = await parseJsonBody<{ level: InsightLevel; startDate?: string }>(req);
      if (!parsed.ok) return parsed.error;
      const { level, startDate } = parsed.data;

      if (!level || !['weekly', 'monthly', 'yearly'].includes(level)) {
        return NextResponse.json(
          { error: 'level は weekly, monthly, yearly のいずれかで指定してください' },
          { status: 400 }
        );
      }

      let range: { startDate: string; endDate: string };
      if (startDate && isValidDateStr(startDate)) {
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
    } catch (error) {
      console.error('Insights POST error:', error);
      const msg = error instanceof Error ? error.message : String(error);
      return NextResponse.json(
        { error: `インサイトの生成に失敗しました: ${msg}` },
        { status: 500 }
      );
    }
  });
}
