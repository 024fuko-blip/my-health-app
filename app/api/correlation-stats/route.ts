/**
 * 相関スコア・トリガー取得 API
 * ダッシュボードで心身相関の分析結果を表示するため
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withSession } from '@/lib/api-utils';

type Trigger = { label: string; ratio: number; description: string };

/** Prisma Json 型の triggers を型安全にパース */
function parseTriggers(val: unknown): Trigger[] {
  if (!Array.isArray(val)) return [];
  return val.filter(
    (t): t is Trigger =>
      t != null &&
      typeof t === 'object' &&
      typeof (t as { label?: unknown }).label === 'string' &&
      typeof (t as { ratio?: unknown }).ratio === 'number' &&
      typeof (t as { description?: unknown }).description === 'string'
  );
}

export async function GET() {
  return withSession(async (session) => {
    try {
      const stats = await prisma.userCorrelationStats.findUnique({
        where: { userId: session.userId },
      });

      return NextResponse.json({
        correlations: stats?.correlations ?? {},
        triggers: parseTriggers(stats?.triggers),
      });
    } catch (error) {
      console.error('Correlation stats GET error:', error);
      return NextResponse.json(
        { correlations: {}, triggers: [] },
        { status: 200 }
      );
    }
  });
}
