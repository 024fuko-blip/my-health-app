import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { parseJsonBody, withSession, errorResponse } from '@/lib/api-utils';
import { reminderPatchSchema } from '@/lib/validations/api-schemas';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withSession(async (session) => {
    const { id } = await params;
    const parsed = await parseJsonBody(req, reminderPatchSchema);
    if (!parsed.ok) return parsed.error;
    const { name, due_date, scheduled_time, memo } = parsed.data;

    const existing = await prisma.checkupReminder.findFirst({
      where: { id, userId: session.userId },
    });
    if (!existing) return errorResponse('Not Found', 404);

    const data: {
      name?: string;
      dueDate?: string;
      scheduledTime?: string | null;
      memo?: string | null;
    } = {};
    if (name !== undefined) data.name = name;
    if (due_date !== undefined) data.dueDate = due_date;
    if (scheduled_time !== undefined) data.scheduledTime = scheduled_time ?? null;
    if (memo !== undefined) data.memo = memo === '' ? null : (memo ?? null);

    const updated = await prisma.checkupReminder.update({
      where: { id, userId: session.userId },
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
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withSession(async (session) => {
    const { id } = await params;
    const existing = await prisma.checkupReminder.findFirst({
      where: { id, userId: session.userId },
    });
    if (!existing) return errorResponse('Not Found', 404);

    await prisma.checkupReminder.delete({
      where: { id, userId: session.userId },
    });
    return NextResponse.json({ ok: true });
  });
}
