/**
 * Cloud Scheduler から毎日（例: 3:00 JST）に呼び出されるエンドポイント。
 * 週次・月次・年次のインサイトを自動生成する。
 * 月曜 → 前週の weekly、毎月1日 → 前月の monthly、1月1日 → 前年の yearly
 * 環境変数 CRON_SECRET をヘッダー X-Cron-Secret で送信して保護。
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerEnv } from '@/lib/env';
import { timingSafeCompare, errorResponse } from '@/lib/api-utils';
import { generateAndSaveInsight } from '@/lib/insights/generate';
import {
  getTodayJST,
  getPreviousWeekRange,
  getPreviousMonthRange,
  getPreviousYearRange,
} from '@/lib/date-utils';

const BATCH_SIZE = 5;

export async function POST(req: Request) {
  try {
    const cronSecret = getServerEnv().CRON_SECRET;
    const headerSecret = req.headers.get('X-Cron-Secret');
    if (!timingSafeCompare(headerSecret, cronSecret)) {
      return errorResponse('Forbidden', 403);
    }

    const today = getTodayJST();
    const jstNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    const dayOfWeek = jstNow.getDay();
    const dayOfMonth = jstNow.getDate();

    const [, month] = today.split('-').map(Number);
    const isFirstOfMonth = dayOfMonth === 1;
    const isJanFirst = month === 1 && dayOfMonth === 1;
    const isMonday = dayOfWeek === 1;

    if (!isMonday && !isFirstOfMonth && !isJanFirst) {
      return NextResponse.json({ generated: 0, message: 'No insight generation needed today' });
    }

    const users = await prisma.user.findMany({
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);

    if (userIds.length === 0) {
      return NextResponse.json({ generated: 0, message: 'No users to process' });
    }

    let generated = 0;

    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batch = userIds.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (userId) => {
          let count = 0;
          if (isMonday) {
            const range = getPreviousWeekRange();
            await generateAndSaveInsight(userId, 'weekly', range.startDate, range.endDate);
            count += 1;
          }
          if (isFirstOfMonth) {
            const range = getPreviousMonthRange();
            await generateAndSaveInsight(userId, 'monthly', range.startDate, range.endDate);
            count += 1;
          }
          if (isJanFirst) {
            const range = getPreviousYearRange();
            await generateAndSaveInsight(userId, 'yearly', range.startDate, range.endDate);
            count += 1;
          }
          return count;
        })
      );
      for (const r of results) {
        if (r.status === 'fulfilled') generated += r.value;
        else console.error('generate-insights batch error:', r.reason);
      }
    }

    return NextResponse.json({ generated });
  } catch (error) {
    console.error('cron generate-insights error:', error);
    return errorResponse('Internal Server Error', 500);
  }
}
