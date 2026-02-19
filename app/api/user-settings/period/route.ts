/**
 * 生理周期の部分更新（記録画面のボタンから呼び出し）
 * lastPeriodDate（生理開始日）または periodDuration（生理期間）を更新。
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { parseJsonBody } from '@/lib/api-utils';
import { safeParseJson } from '@/lib/json-utils';

export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const parsed = await parseJsonBody<{ last_period_date?: string; period_duration?: number }>(req);
    const body = parsed.ok ? parsed.data : {};
    const { last_period_date, period_duration } = body;

    const row = await prisma.userSettings.findUnique({
      where: { userId: session.userId },
    });
    if (!row) return new NextResponse('Not Found', { status: 404 });

    const medicalHistory = safeParseJson<Record<string, unknown>>(row.medicalHistory, {});

    if (typeof last_period_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(last_period_date)) {
      medicalHistory.lastPeriodDate = last_period_date;
    }
    if (typeof period_duration === 'number' && period_duration >= 1 && period_duration <= 14) {
      medicalHistory.periodDuration = period_duration;
    }

    await prisma.userSettings.update({
      where: { userId: session.userId },
      data: { medicalHistory: JSON.stringify(medicalHistory) },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('period PATCH error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
