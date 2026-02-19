import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { parseJsonBody } from '@/lib/api-utils';
import { buildMedicationSchedule } from '@/lib/medication-schedule';

/** GET: 今日の服薬スケジュール + 検診リマインダー一覧 */
export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'medication' | 'checkup' | null(両方)

    if (type === 'checkup' || !type) {
      const checkups = await prisma.checkupReminder.findMany({
        where: { userId: session.userId },
        orderBy: { dueDate: 'asc' },
      });
      if (type === 'checkup') {
        return NextResponse.json(
          checkups.map((c) => ({
            id: c.id,
            name: c.name,
            due_date: c.dueDate,
            memo: c.memo,
            created_at: c.createdAt,
          }))
        );
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
        checkups: checkups.map((c) => ({
          id: c.id,
          name: c.name,
          due_date: c.dueDate,
          memo: c.memo,
          created_at: c.createdAt,
        })),
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
}

/** POST: 検診リマインダー追加 */
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const parsed = await parseJsonBody<{ name?: string; due_date?: string; memo?: string }>(req);
    if (!parsed.ok) return parsed.error;
    const body = parsed.data;
    const { name, due_date, memo } = body;
    if (!name || !due_date) {
      return new NextResponse('Bad Request: name and due_date required', { status: 400 });
    }

    const created = await prisma.checkupReminder.create({
      data: {
        userId: session.userId,
        name: String(name),
        dueDate: String(due_date),
        memo: memo != null ? String(memo) : null,
      },
    });
    return NextResponse.json({
      id: created.id,
      name: created.name,
      due_date: created.dueDate,
      memo: created.memo,
      created_at: created.createdAt,
    });
  } catch (error) {
    console.error('reminders POST error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
