import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withSession } from '@/lib/api-utils';
import { getLineConfig } from '@/lib/line';

/** GET: LINE連携状態を返す */
export async function GET() {
  return withSession(async (session) => {
    try {
      const config = getLineConfig();
    let linked = false;
    try {
      const link = await prisma.lineLink.findUnique({
        where: { userId: session.userId },
      });
      linked = !!link;
    } catch (dbError) {
      console.error('line status DB error:', dbError);
      // テーブル未作成等でDBエラーでも、config だけで enabled を返す
    }

      return NextResponse.json({
        enabled: config.isConfigured,
        linked,
      });
    } catch (error) {
      console.error('line status error:', error);
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  });
}
