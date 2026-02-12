import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getVapidPublicKey } from '@/lib/web-push';

/** GET: VAPID 公開鍵と購読状況を返す（通知機能が有効かどうか） */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

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
}

/** POST: プッシュ購読を保存 */
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const publicKey = getVapidPublicKey();
    if (!publicKey) {
      return NextResponse.json(
        { error: 'Push notifications are not configured' },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { endpoint, keys } = body;
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
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/** DELETE: プッシュ購読を削除（endpoint を Body で送る） */
export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const body = await req.json().catch(() => ({}));
    const endpoint = body?.endpoint;
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
}
