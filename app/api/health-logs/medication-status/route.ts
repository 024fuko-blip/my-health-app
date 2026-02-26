/**
 * 指定日の medication_taken_detail を即時保存する。
 * 記録画面で薬チェックを押したときに呼び、リマインダースキップ判定に使う。
 */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { parseJsonBody, withSession } from '@/lib/api-utils';
import { medicationStatusPutSchema } from '@/lib/validations/api-schemas';
import { safeParseJson } from '@/lib/json-utils';

export async function PUT(req: Request) {
  return withSession(async (session) => {
    const parsed = await parseJsonBody(req, medicationStatusPutSchema);
    if (!parsed.ok) return parsed.error;
    const { date, med_key, taken } = parsed.data;

    const existing = await prisma.healthLog.findUnique({
      where: { userId_date: { userId: session.userId, date } },
    });

    const detail = safeParseJson<Record<string, boolean>>(
      existing?.medicationTakenDetail ?? null,
      {}
    );
    detail[med_key] = taken;

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
  });
}
