import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { parseJsonBody, withSession, errorResponse } from '@/lib/api-utils';
import { reminderPostSchema } from '@/lib/validations/api-schemas';
import { buildMedicationSchedule } from '@/lib/medication-schedule';
import type { CheckupReminder } from '@prisma/client';

function toCheckupApi(c: CheckupReminder) {
  return {
    id: c.id,
    name: c.name,
    due_date: c.dueDate,
    scheduled_time: c.scheduledTime,
    memo: c.memo,
    created_at: c.createdAt,
  };
}

function extractHospitalNames(checkups: CheckupReminder[]): string[] {
  return [...new Set(checkups.map((c) => c.name).filter(Boolean))].sort();
}

/** GET: 今日の服薬スケジュール + 検診リマインダー一覧 */
export async function GET(req: Request) {
  return withSession(async (session) => {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    if (type === 'checkup' || !type) {
      const checkups = await prisma.checkupReminder.findMany({
        where: { userId: session.userId },
        orderBy: { dueDate: 'asc' },
      });
      const checkupsApi = checkups.map(toCheckupApi);
      const hospitalNames = extractHospitalNames(checkups);

      if (type === 'checkup') {
        return NextResponse.json({ checkups: checkupsApi, hospital_names: hospitalNames });
      }

      const settings = await prisma.userSettings.findUnique({
        where: { userId: session.userId },
      });
      const medicationSchedule = buildMedicationSchedule(
        settings?.medicationReminderTimes ?? null,
        settings?.currentMedications ?? null,
        { includeLabel: true }
      );

      return NextResponse.json({
        medication_schedule: medicationSchedule,
        checkups: checkupsApi,
        hospital_names: hospitalNames,
      });
    }

    if (type === 'medication') {
      const settings = await prisma.userSettings.findUnique({
        where: { userId: session.userId },
      });
      const medicationSchedule = buildMedicationSchedule(
        settings?.medicationReminderTimes ?? null,
        settings?.currentMedications ?? null,
        { includeLabel: false }
      );
      return NextResponse.json(medicationSchedule);
    }

    return errorResponse('Bad Request', 400);
  });
}

/** POST: 検診リマインダー追加 */
export async function POST(req: Request) {
  return withSession(async (session) => {
    const parsed = await parseJsonBody(req, reminderPostSchema);
    if (!parsed.ok) return parsed.error;
    const { name, due_date, scheduled_time, memo } = parsed.data;

    const created = await prisma.checkupReminder.create({
      data: {
        userId: session.userId,
        name: name.trim(),
        dueDate: due_date,
        scheduledTime: scheduled_time ?? null,
        memo: memo?.trim() || null,
      },
    });
    return NextResponse.json(toCheckupApi(created));
  });
}
