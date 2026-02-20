import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { parseJsonBody, withSession } from '@/lib/api-utils';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withSession(async (session) => {
    try {
      const { id } = await params;
    const parsed = await parseJsonBody<{
      name?: string;
      due_date?: string;
      scheduled_time?: string | null;
      memo?: string;
    }>(req);
    if (!parsed.ok) return parsed.error;
    const { name, due_date, scheduled_time, memo } = parsed.data;

    const existing = await prisma.checkupReminder.findFirst({
      where: { id, userId: session.userId },
    });
    if (!existing) return new NextResponse('Not Found', { status: 404 });

    const data: {
      name?: string;
      dueDate?: string;
      scheduledTime?: string | null;
      memo?: string | null;
    } = {};
    if (name !== undefined) data.name = String(name);
    if (due_date !== undefined) data.dueDate = String(due_date);
    if (scheduled_time !== undefined)
      data.scheduledTime =
        scheduled_time != null && /^\d{1,2}:\d{2}$/.test(scheduled_time) ? scheduled_time : null;
    if (memo !== undefined) data.memo = memo === '' ? null : String(memo);

    const updated = await prisma.checkupReminder.update({
      where: { id },
      data,
    });
      return NextResponse.json({
        id: updated.id,
        name: updated.name,
        due_date: updated.dueDate,
        scheduled_time: updated.scheduledTime,
        memo: updated.memo,
        created_at: updated.createdAt,
      });
    } catch (error) {
      console.error('reminders PATCH error:', error);
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withSession(async (session) => {
    try {
      const { id } = await params;
    const existing = await prisma.checkupReminder.findFirst({
      where: { id, userId: session.userId },
    });
    if (!existing) return new NextResponse('Not Found', { status: 404 });

      await prisma.checkupReminder.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    } catch (error) {
      console.error('reminders DELETE error:', error);
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  });
}
