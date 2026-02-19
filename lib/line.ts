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

/** 返信用メッセージ型（LINE Messaging API） */
export type LineMessage = 
  | { type: 'text'; text: string }
  | { type: 'text'; text: string; quickReply?: { items: Array<{ type: 'action'; action: { type: 'uri' | 'message'; label: string; uri?: string; text?: string } }> } }
  | Record<string, unknown>;

/** 複数メッセージを reply で送信 */
export async function replyLineMessages(
  accessToken: string,
  replyToken: string,
  messages: LineMessage[]
): Promise<boolean> {
  try {
    const res = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ replyToken, messages }),
    });
    return res.ok;
  } catch (e) {
    console.error('LINE reply error:', e);
    return false;
  }
}

/** テキストを reply で送信（従来互換） */
export async function replyLine(accessToken: string, replyToken: string, text: string): Promise<boolean> {
  return replyLineMessages(accessToken, replyToken, [{ type: 'text', text }]);
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
