import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getVapidPublicKey } from '@/lib/web-push';
import { parseJsonBody, withSession } from '@/lib/api-utils';

/** GET: VAPID 公開鍵と購読状況を返す（通知機能が有効かどうか） */
export async function GET() {
  return withSession(async (session) => {
    try {
      const publicKey = getVapidPublicKey();
      if (!publicKey) {
        return NextResponse.json({
          enabled: false,
          vapid_public_key: null,
          subscribed: false,
        });
      }

      const count = await prisma.pushSubscription.count({
      where: { userId: session.userId },
    });

      return NextResponse.json({
        enabled: true,
        vapid_public_key: publicKey,
        subscribed: count > 0,
      });
    } catch (error) {
      console.error('push-subscribe GET error:', error);
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  });
}

/** POST: プッシュ購読を保存 */
export async function POST(req: Request) {
  return withSession(async (session) => {
    try {
      const publicKey = getVapidPublicKey();
      if (!publicKey) {
        return NextResponse.json(
          { error: 'Push notifications are not configured' },
          { status: 503 }
        );
      }

      const parsed = await parseJsonBody<{ endpoint?: string; keys?: { p256dh?: string; auth?: string } }>(req);
      if (!parsed.ok) return parsed.error;
      const { endpoint, keys } = parsed.data;
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return NextResponse.json(
          { error: 'Bad Request: endpoint and keys required' },
          { status: 400 }
        );
      }

      await prisma.pushSubscription.upsert({
      where: {
        userId_endpoint: {
          userId: session.userId,
          endpoint: String(endpoint),
        },
      },
      create: {
        userId: session.userId,
        endpoint: String(endpoint),
        p256dh: String(keys.p256dh),
        auth: String(keys.auth),
      },
      update: {
        p256dh: String(keys.p256dh),
        auth: String(keys.auth),
      },
    });

      return NextResponse.json({ ok: true });
    } catch (error) {
      console.error('push-subscribe POST error:', error);
      const message = error instanceof Error ? error.message : 'Internal error';
      return NextResponse.json(
        { error: message.includes('does not exist') ? 'データベースの準備ができていません。しばらく待ってからもう一度お試しください。' : 'サーバーエラーが発生しました。' },
        { status: 500 }
      );
    }
  });
}

/** DELETE: プッシュ購読を削除（endpoint を Body で送る） */
export async function DELETE(req: Request) {
  return withSession(async (session) => {
    try {
      const parsed = await parseJsonBody<{ endpoint?: string }>(req);
      const endpoint = parsed.ok ? parsed.data.endpoint : undefined;
      if (!endpoint) {
        return NextResponse.json(
          { error: 'Bad Request: endpoint required' },
          { status: 400 }
        );
      }

      await prisma.pushSubscription.deleteMany({
      where: {
        userId: session.userId,
        endpoint: String(endpoint),
      },
    });

      return NextResponse.json({ ok: true });
    } catch (error) {
      console.error('push-subscribe DELETE error:', error);
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  });
}
