import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

const DEFAULT_MEDICATION_TIMES: Record<string, string> = {
  朝: '08:00',
  昼: '12:00',
  晩: '18:00',
  眠前: '22:00',
};

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
      let medicationSchedule: Array<{ time: string; label: string; medications: string[] }> = [];
      if (settings?.currentMedications) {
        let times: Record<string, string> = DEFAULT_MEDICATION_TIMES;
        try {
          if (settings.medicationReminderTimes) {
            const parsed = JSON.parse(settings.medicationReminderTimes) as Record<string, string>;
            times = { ...DEFAULT_MEDICATION_TIMES, ...parsed };
          }
        } catch {
          // use defaults
        }
        let medications: Array<{ name: string; timings: string[] }> = [];
        try {
          const medData = JSON.parse(settings.currentMedications) as { medications?: Array<{ name: string; timings: string[] }> };
          if (medData.medications && Array.isArray(medData.medications)) {
            medications = medData.medications;
          }
        } catch {
          // ignore
        }
        const timeToMeds: Record<string, string[]> = {};
        for (const med of medications) {
          for (const t of med.timings) {
            const time = times[t] ?? t;
            if (!timeToMeds[time]) timeToMeds[time] = [];
            timeToMeds[time].push(med.name);
          }
        }
        medicationSchedule = Object.entries(timeToMeds)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([time, meds]) => ({ time, label: time, medications: meds }));
      }

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
      let medicationSchedule: Array<{ time: string; medications: string[] }> = [];
      if (settings?.currentMedications) {
        let times: Record<string, string> = DEFAULT_MEDICATION_TIMES;
        try {
          if (settings.medicationReminderTimes) {
            const parsed = JSON.parse(settings.medicationReminderTimes) as Record<string, string>;
            times = { ...DEFAULT_MEDICATION_TIMES, ...parsed };
          }
        } catch {
          // use defaults
        }
        let medications: Array<{ name: string; timings: string[] }> = [];
        try {
          const medData = JSON.parse(settings.currentMedications) as { medications?: Array<{ name: string; timings: string[] }> };
          if (medData.medications && Array.isArray(medData.medications)) {
            medications = medData.medications;
          }
        } catch {
          // ignore
        }
        const timeToMeds: Record<string, string[]> = {};
        for (const med of medications) {
          for (const t of med.timings) {
            const time = times[t] ?? t;
            if (!timeToMeds[time]) timeToMeds[time] = [];
            timeToMeds[time].push(med.name);
          }
        }
        medicationSchedule = Object.entries(timeToMeds)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([time, meds]) => ({ time, medications: meds }));
      }
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

    const body = await req.json();
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
