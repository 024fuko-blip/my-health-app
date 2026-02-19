import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSession } from '@/lib/auth';

/** DELETE: LINE連携を解除 */
export async function DELETE() {
  try {
    const session = await requireSession();
    if (session instanceof NextResponse) return session;

    await prisma.lineLink.deleteMany({ where: { userId: session.userId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('line unlink error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
