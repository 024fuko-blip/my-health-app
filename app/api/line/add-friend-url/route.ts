import { NextResponse } from 'next/server';
import { withSession } from '@/lib/api-utils';
import { getServerEnv } from '@/lib/env';

/** GET: LINE友だち追加URLを返す。LINE_ADD_FRIEND_URL または LINE_BOT_BASIC_ID の設定が必要。 */
export async function GET() {
  return withSession(async () => {
    const env = getServerEnv();
    const fromUrl = env.LINE_ADD_FRIEND_URL?.trim();
    const basicId = env.LINE_BOT_BASIC_ID?.trim()?.replace(/^@/, '');

    const url =
      fromUrl && (fromUrl.startsWith('http://') || fromUrl.startsWith('https://'))
        ? fromUrl
        : basicId
          ? `https://line.me/R/ti/p/@${basicId}`
          : null;

    return NextResponse.json({ url });
  });
}
