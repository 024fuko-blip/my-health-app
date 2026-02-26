/**
 * 生理周期の部分更新（記録画面のボタンから呼び出し）
 * lastPeriodDate（生理開始日）または periodDuration（生理期間）を更新。
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { parseJsonBody, withSession, errorResponse } from '@/lib/api-utils';
import { periodPatchSchema } from '@/lib/validations/api-schemas';
import { safeParseJson } from '@/lib/json-utils';

export async function PATCH(req: Request) {
  return withSession(async (session) => {
    const parsed = await parseJsonBody(req, periodPatchSchema);
    if (!parsed.ok) return parsed.error;
    const { last_period_date, period_duration } = parsed.data;

    const row = await prisma.userSettings.findUnique({
      where: { userId: session.userId },
    });
    if (!row) return errorResponse('Not Found', 404);

    const medicalHistory = safeParseJson<Record<string, unknown>>(row.medicalHistory, {});

    if (last_period_date) {
      medicalHistory.lastPeriodDate = last_period_date;
    }
    if (period_duration !== undefined) {
      medicalHistory.periodDuration = period_duration;
    }

    await prisma.userSettings.update({
      where: { userId: session.userId },
      data: { medicalHistory: JSON.stringify(medicalHistory) },
    });

    return NextResponse.json({ ok: true });
  });
}
