/**
 * 相関スコア・トリガー取得 API
 * ダッシュボードで心身相関の分析結果を表示するため
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withSession } from '@/lib/api-utils';

export async function GET() {
  return withSession(async (session) => {
    try {
      const stats = await prisma.userCorrelationStats.findUnique({
        where: { userId: session.userId },
      });

      return NextResponse.json({
        correlations: stats?.correlations ?? {},
        triggers: (stats?.triggers as Array<{ label: string; ratio: number; description: string }>) ?? [],
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
