/**
 * 指定日の period_status だけを即時保存する。
 * 記録画面で生理ボタンを押したときに呼び、再表示時も選択が保持されるようにする。
 */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { parseJsonBody, withSession } from '@/lib/api-utils';
import { isValidDateStr } from '@/lib/date-utils';

const ALLOWED_VALUES = ['なし', '生理中', '生理終了'] as const;

export async function PUT(req: Request) {
  return withSession(async (session) => {
    try {
      const parsed = await parseJsonBody<{ date?: string; period_status?: string }>(req);
      if (!parsed.ok) return parsed.error;
      const { date, period_status } = parsed.data;

      if (!date || typeof date !== 'string') {
        return new NextResponse('Bad Request: date required', { status: 400 });
      }
      if (!isValidDateStr(date)) {
        return new NextResponse('Bad Request: invalid date format', { status: 400 });
      }
      const value =
      period_status != null && ALLOWED_VALUES.includes(period_status as (typeof ALLOWED_VALUES)[number])
        ? (period_status as (typeof ALLOWED_VALUES)[number])
        : 'なし';

      const existing = await prisma.healthLog.findUnique({
        where: { userId_date: { userId: session.userId, date } },
      });

      if (existing) {
        await prisma.healthLog.update({
          where: { userId_date: { userId: session.userId, date } },
          data: { periodStatus: value },
        });
      } else {
        await prisma.healthLog.create({
          data: {
            userId: session.userId,
            date,
            periodStatus: value,
            medicationTaken: false,
          },
        });
      }

      return NextResponse.json({ ok: true });
    } catch (error) {
      console.error('period-status PUT error:', error);
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  });
}
