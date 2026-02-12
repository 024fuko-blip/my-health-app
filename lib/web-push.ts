/**
 * Web Push 通知送信用ユーティリティ。
 * VAPID キーは環境変数 VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY で設定。
 * 未設定時は push 送信をスキップ（通知機能オフ）。
 */

import webPush from 'web-push';

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

let configured = false;

function ensureConfigured(): boolean {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) {
    return false;
  }
  try {
    webPush.setVapidDetails('mailto:app@my-health-app.local', publicKey, privateKey);
    configured = true;
    return true;
  } catch {
    return false;
  }
}

/** クライアントに渡す公開鍵（購読時に使用） */
export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY?.trim() ?? null;
}

/** プッシュ通知を送信。失敗時はログのみ（購読が無効になった場合は throw しない） */
export async function sendPushNotification(
  subscription: PushSubscriptionPayload,
  payload: { title: string; body?: string; url?: string }
): Promise<boolean> {
  if (!ensureConfigured()) return false;

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body ?? '',
    url: payload.url ?? '/',
  });

  try {
    await webPush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      },
      body,
      {
        TTL: 60 * 60 * 24, // 24時間
      }
    );
    return true;
  } catch (err) {
    // 410 Gone / 404 等は購読無効 → DB から削除したいが、ここではログのみ
    console.error('[web-push] send failed:', err);
    return false;
  }
}
