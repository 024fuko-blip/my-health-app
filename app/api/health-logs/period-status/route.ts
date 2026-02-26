/**
 * 指定日の period_status だけを即時保存する。
 * 記録画面で生理ボタンを押したときに呼び、再表示時も選択が保持されるようにする。
 */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { parseJsonBody, withSession } from '@/lib/api-utils';
import { periodStatusPutSchema } from '@/lib/validations/api-schemas';

export async function PUT(req: Request) {
  return withSession(async (session) => {
    const parsed = await parseJsonBody(req, periodStatusPutSchema);
    if (!parsed.ok) return parsed.error;
    const { date, period_status } = parsed.data;

    const existing = await prisma.healthLog.findUnique({
      where: { userId_date: { userId: session.userId, date } },
    });

    if (existing) {
      await prisma.healthLog.update({
        where: { userId_date: { userId: session.userId, date } },
        data: { periodStatus: period_status },
      });
    } else {
      await prisma.healthLog.create({
        data: {
          userId: session.userId,
          date,
          periodStatus: period_status,
          medicationTaken: false,
        },
      });
    }

    return NextResponse.json({ ok: true });
  });
}
