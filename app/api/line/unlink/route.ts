import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withSession } from '@/lib/api-utils';

/** DELETE: LINE連携を解除 */
export async function DELETE() {
  return withSession(async (session) => {
    await prisma.lineLink.deleteMany({ where: { userId: session.userId } });
    return NextResponse.json({ ok: true });
  });
}
