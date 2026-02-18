/**
 * LINE Messaging API 用ユーティリティ。
 * 環境変数 LINE_CHANNEL_ID, LINE_CHANNEL_SECRET, LINE_CHANNEL_ACCESS_TOKEN で設定。
 */

export function getLineConfig() {
  const channelId = process.env.LINE_CHANNEL_ID?.trim();
  const channelSecret = process.env.LINE_CHANNEL_SECRET?.trim();
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();

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
