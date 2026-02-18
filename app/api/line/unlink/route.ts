import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

/** DELETE: LINE連携を解除 */
export async function DELETE() {
  try {
    const session = await getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    await prisma.lineLink.deleteMany({ where: { userId: session.userId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('line unlink error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
