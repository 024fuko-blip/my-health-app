/**
 * LINE Messaging API 用ユーティリティ。
 * 環境変数 LINE_CHANNEL_ID, LINE_CHANNEL_SECRET, LINE_CHANNEL_ACCESS_TOKEN で設定。
 */

import { getServerEnv } from './env';

export function getLineConfig() {
  const env = getServerEnv();
  const channelId = env.LINE_CHANNEL_ID;
  const channelSecret = env.LINE_CHANNEL_SECRET;
  const accessToken = env.LINE_CHANNEL_ACCESS_TOKEN;

  return {
    channelId: channelId ?? null,
    channelSecret: channelSecret ?? null,
    accessToken: accessToken ?? null,
    isConfigured: !!(channelId && channelSecret && accessToken),
  };
}

/** LINE プッシュメッセージを送信 */
export async function sendLinePush(lineUserId: string, text: string): Promise<boolean> {
  const { accessToken } = getLineConfig();
  if (!accessToken) return false;
  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [{ type: 'text', text }],
      }),
    });
    return res.ok;
  } catch (e) {
    console.error('LINE push error:', e);
    return false;
  }
}
