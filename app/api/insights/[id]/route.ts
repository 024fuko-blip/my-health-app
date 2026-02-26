/**
 * インサイト単一取得・削除
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withSession, errorResponse } from '@/lib/api-utils';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withSession(async (session) => {
    const { id } = await params;
    const insight = await prisma.insight.findFirst({
      where: { id, userId: session.userId },
    });
    if (!insight) {
      return errorResponse('インサイトが見つかりません', 404);
    }
    return NextResponse.json(insight);
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withSession(async (session) => {
    const { id } = await params;
    const deleted = await prisma.insight.deleteMany({
      where: { id, userId: session.userId },
    });
    if (deleted.count === 0) {
      return errorResponse('インサイトが見つかりません', 404);
    }
    return NextResponse.json({ ok: true });
  });
}
