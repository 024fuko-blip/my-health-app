/**
 * インサイト単一取得・削除
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withSession } from '@/lib/api-utils';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withSession(async (session) => {
    try {
      const { id } = await params;
      const insight = await prisma.insight.findFirst({
        where: { id, userId: session.userId },
      });
      if (!insight) {
        return NextResponse.json({ error: 'インサイトが見つかりません' }, { status: 404 });
      }
      return NextResponse.json(insight);
    } catch (error) {
      console.error('Insight GET error:', error);
      return NextResponse.json(
        { error: 'インサイトの取得に失敗しました' },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withSession(async (session) => {
    try {
      const { id } = await params;
      const deleted = await prisma.insight.deleteMany({
        where: { id, userId: session.userId },
      });
      if (deleted.count === 0) {
        return NextResponse.json({ error: 'インサイトが見つかりません' }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
    } catch (error) {
      console.error('Insight DELETE error:', error);
      return NextResponse.json(
        { error: 'インサイトの削除に失敗しました' },
        { status: 500 }
      );
    }
  });
}
