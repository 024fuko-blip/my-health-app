import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getVapidPublicKey } from '@/lib/web-push';
import { parseJsonBody, withSession, errorResponse } from '@/lib/api-utils';
import { pushSubscribePostSchema, pushSubscribeDeleteSchema } from '@/lib/validations/api-schemas';

/** GET: VAPID 公開鍵と購読状況を返す（通知機能が有効かどうか） */
export async function GET() {
  return withSession(async (session) => {
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
  });
}

/** POST: プッシュ購読を保存 */
export async function POST(req: Request) {
  return withSession(async (session) => {
    const publicKey = getVapidPublicKey();
    if (!publicKey) {
      return errorResponse('Push notifications are not configured', 503);
    }

    const parsed = await parseJsonBody(req, pushSubscribePostSchema);
    if (!parsed.ok) return parsed.error;
    const { endpoint, keys } = parsed.data;

    await prisma.pushSubscription.upsert({
      where: {
        userId_endpoint: {
          userId: session.userId,
          endpoint,
        },
      },
      create: {
        userId: session.userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    });

    return NextResponse.json({ ok: true });
  });
}

/** DELETE: プッシュ購読を削除（endpoint を Body で送る） */
export async function DELETE(req: Request) {
  return withSession(async (session) => {
    const parsed = await parseJsonBody(req, pushSubscribeDeleteSchema);
    if (!parsed.ok) return parsed.error;
    const { endpoint } = parsed.data;

    await prisma.pushSubscription.deleteMany({
      where: {
        userId: session.userId,
        endpoint,
      },
    });

    return NextResponse.json({ ok: true });
  });
}
