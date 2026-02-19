import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withSession } from '@/lib/api-utils';
import { getLineConfig } from '@/lib/line';

/** POST: 連携用の6桁コードを発行 */
export async function POST() {
  return withSession(async (session) => {
    try {
      const config = getLineConfig();
      if (!config.isConfigured) {
        return NextResponse.json(
          { error: 'LINE連携は現在利用できません' },
          { status: 503 }
        );
      }

      const existing = await prisma.lineLink.findUnique({
        where: { userId: session.userId },
      });
      if (existing) {
        return NextResponse.json({ linked: true, code: null });
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10分

      await prisma.lineLinkRequest.deleteMany({ where: { userId: session.userId } });
      await prisma.lineLinkRequest.create({
        data: { userId: session.userId, code, expiresAt },
      });

      return NextResponse.json({ code, expiresIn: 600 });
    } catch (error) {
      console.error('line link-request error:', error);
      return NextResponse.json(
        { error: 'サーバーエラーが発生しました。DBのテーブルが作成されているか確認してください。（npx prisma db push）' },
        { status: 500 }
      );
    }
  });
}
