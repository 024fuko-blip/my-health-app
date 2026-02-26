import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { withSession, errorResponse } from '@/lib/api-utils';
import { getLineConfig } from '@/lib/line';
import { NextResponse } from 'next/server';

/** POST: 連携用の6桁コードを発行 */
export async function POST() {
  return withSession(async (session) => {
    const config = getLineConfig();
    if (!config.isConfigured) {
      return errorResponse('LINE連携は現在利用できません', 503);
    }

    const existing = await prisma.lineLink.findUnique({
      where: { userId: session.userId },
    });
    if (existing) {
      return NextResponse.json({ linked: true, code: null });
    }

    const code = String(crypto.randomInt(100000, 999999));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.lineLinkRequest.deleteMany({ where: { userId: session.userId } });
    await prisma.lineLinkRequest.create({
      data: { userId: session.userId, code, expiresAt },
    });

    return NextResponse.json({ code, expiresIn: 600 });
  });
}
