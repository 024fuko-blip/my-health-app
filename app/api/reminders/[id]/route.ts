import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { name, due_date, memo } = body;

    const existing = await prisma.checkupReminder.findFirst({
      where: { id, userId: session.userId },
    });
    if (!existing) return new NextResponse('Not Found', { status: 404 });

    const data: { name?: string; dueDate?: string; memo?: string | null } = {};
    if (name !== undefined) data.name = String(name);
    if (due_date !== undefined) data.dueDate = String(due_date);
    if (memo !== undefined) data.memo = memo === '' ? null : String(memo);

    const updated = await prisma.checkupReminder.update({
      where: { id },
      data,
    });
    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      due_date: updated.dueDate,
      memo: updated.memo,
      created_at: updated.createdAt,
    });
  } catch (error) {
    console.error('reminders PATCH error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

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
}
