/**
 * 指定日の medication_taken_detail を即時保存する。
 * 記録画面で薬チェックを押したときに呼び、リマインダースキップ判定に使う。
 */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { parseJsonBody, withSession } from '@/lib/api-utils';
import { isValidDateStr } from '@/lib/date-utils';
import { safeParseJson } from '@/lib/json-utils';

export async function PUT(req: Request) {
  return withSession(async (session) => {
    try {
      const parsed = await parseJsonBody<{
        date?: string;
        med_key?: string;
        taken?: boolean;
      }>(req);
      if (!parsed.ok) return parsed.error;
      const { date, med_key, taken } = parsed.data;

      if (!date || typeof date !== 'string') {
        return new NextResponse('Bad Request: date required', { status: 400 });
      }
      if (!isValidDateStr(date)) {
        return new NextResponse('Bad Request: invalid date format', { status: 400 });
      }
      if (!med_key || typeof med_key !== 'string' || !med_key.includes('_')) {
        return new NextResponse('Bad Request: med_key required (e.g. 123_朝)', { status: 400 });
      }
      const value = taken === true;

      const existing = await prisma.healthLog.findUnique({
        where: { userId_date: { userId: session.userId, date } },
      });

      const detail = safeParseJson<Record<string, boolean>>(
        existing?.medicationTakenDetail ?? null,
        {}
      );
      detail[med_key] = value;

      const allTaken =
        Object.keys(detail).length > 0 && Object.values(detail).every((v) => v === true);

      if (existing) {
        await prisma.healthLog.update({
          where: { userId_date: { userId: session.userId, date } },
          data: {
            medicationTakenDetail: JSON.stringify(detail),
            medicationTaken: allTaken,
          },
        });
      } else {
        await prisma.healthLog.create({
          data: {
            userId: session.userId,
            date,
            medicationTaken: allTaken,
            medicationTakenDetail: JSON.stringify(detail),
          },
        });
      }

      return NextResponse.json({ ok: true });
    } catch (error) {
      console.error('medication-status PUT error:', error);
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  });
}
