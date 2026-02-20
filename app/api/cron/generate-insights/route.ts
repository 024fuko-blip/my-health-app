/**
 * Cloud Scheduler から毎日（例: 3:00 JST）に呼び出されるエンドポイント。
 * 週次・月次・年次のインサイトを自動生成する。
 * 月曜 → 前週の weekly、毎月1日 → 前月の monthly、1月1日 → 前年の yearly
 * 環境変数 CRON_SECRET をヘッダー X-Cron-Secret で送信して保護。
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerEnv } from '@/lib/env';
import { generateAndSaveInsight } from '@/lib/insights/generate';
import {
  getTodayJST,
  getPreviousWeekRange,
  getPreviousMonthRange,
  getPreviousYearRange,
} from '@/lib/date-utils';

export async function POST(req: Request) {
  try {
    const cronSecret = getServerEnv().CRON_SECRET;
    const headerSecret = req.headers.get('X-Cron-Secret');
    if (!cronSecret || headerSecret !== cronSecret) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const today = getTodayJST();
    const jstNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    const dayOfWeek = jstNow.getDay();
    const dayOfMonth = jstNow.getDate();

    const [, month, day] = today.split('-').map(Number);
    const isFirstOfMonth = dayOfMonth === 1;
    const isJanFirst = month === 1 && dayOfMonth === 1;
    const isMonday = dayOfWeek === 1;

    const lineLinks = await prisma.lineLink.findMany({
      select: { userId: true },
    });
    const userIds = [...new Set(lineLinks.map((l) => l.userId))];

    if (userIds.length === 0) {
      return NextResponse.json({ generated: 0, message: 'No users to process' });
    }

    let generated = 0;

    for (const userId of userIds) {
      try {
        if (isMonday) {
          const range = getPreviousWeekRange();
          await generateAndSaveInsight(userId, 'weekly', range.startDate, range.endDate);
          generated += 1;
        }
        if (isFirstOfMonth) {
          const range = getPreviousMonthRange();
          await generateAndSaveInsight(userId, 'monthly', range.startDate, range.endDate);
          generated += 1;
        }
        if (isJanFirst) {
          const range = getPreviousYearRange();
          await generateAndSaveInsight(userId, 'yearly', range.startDate, range.endDate);
          generated += 1;
        }
      } catch (e) {
        console.error(`generate-insights error for user ${userId}:`, e);
      }
    }

    return NextResponse.json({ generated });
  } catch (error) {
    console.error('cron generate-insights error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
