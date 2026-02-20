import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { parseJsonBody, withSession } from '@/lib/api-utils';
import { buildMedicationSchedule } from '@/lib/medication-schedule';

/** GET: 今日の服薬スケジュール + 検診リマインダー一覧 */
export async function GET(req: Request) {
  return withSession(async (session) => {
    try {
      const { searchParams } = new URL(req.url);
      const type = searchParams.get('type'); // 'medication' | 'checkup' | null(両方)

      if (type === 'checkup' || !type) {
        const checkups = await prisma.checkupReminder.findMany({
          where: { userId: session.userId },
          orderBy: { dueDate: 'asc' },
        });
        if (type === 'checkup') {
          return NextResponse.json({
            checkups: checkups.map((c) => ({
              id: c.id,
              name: c.name,
              due_date: c.dueDate,
              scheduled_time: c.scheduledTime,
              memo: c.memo,
              created_at: c.createdAt,
            })),
            hospital_names: [...new Set(checkups.map((c) => c.name).filter(Boolean))].sort(),
          });
        }

        const settings = await prisma.userSettings.findUnique({
          where: { userId: session.userId },
        });
        const medicationSchedule = buildMedicationSchedule(
          settings?.medicationReminderTimes ?? null,
          settings?.currentMedications ?? null,
          { includeLabel: true }
        );

        const hospitalNames = [...new Set(checkups.map((c) => c.name).filter(Boolean))].sort();
        return NextResponse.json({
          medication_schedule: medicationSchedule,
          checkups: checkups.map((c) => ({
            id: c.id,
            name: c.name,
            due_date: c.dueDate,
            scheduled_time: c.scheduledTime,
            memo: c.memo,
            created_at: c.createdAt,
          })),
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

      return new NextResponse('Bad Request', { status: 400 });
    } catch (error) {
      console.error('reminders GET error:', error);
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  });
}

/** POST: 検診リマインダー追加 */
export async function POST(req: Request) {
  return withSession(async (session) => {
    try {
      const parsed = await parseJsonBody<{
        name?: string;
        due_date?: string;
        scheduled_time?: string;
        memo?: string;
      }>(req);
      if (!parsed.ok) return parsed.error;
      const body = parsed.data;
      const { name, due_date, scheduled_time, memo } = body;
      if (!name || !due_date) {
        return new NextResponse('Bad Request: name and due_date required', { status: 400 });
      }
      const scheduledTime =
        scheduled_time != null && typeof scheduled_time === 'string' && /^\d{1,2}:\d{2}$/.test(scheduled_time)
          ? scheduled_time
          : null;

      const created = await prisma.checkupReminder.create({
        data: {
          userId: session.userId,
          name: String(name).trim(),
          dueDate: String(due_date),
          scheduledTime,
          memo: memo != null ? String(memo).trim() || null : null,
        },
      });
      return NextResponse.json({
        id: created.id,
        name: created.name,
        due_date: created.dueDate,
        scheduled_time: created.scheduledTime,
        memo: created.memo,
        created_at: created.createdAt,
      });
    } catch (error) {
      console.error('reminders POST error:', error);
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  });
}
