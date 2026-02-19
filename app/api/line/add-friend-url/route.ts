import { NextResponse } from 'next/server';
import { withSession } from '@/lib/api-utils';
import { getServerEnv } from '@/lib/env';

/** Basic ID 未設定時のフォールバック（LINE Developers の Bot basic ID を設定すれば不要） */
const FALLBACK_BASIC_ID = '156ipswe';

/** GET: LINE友だち追加URLを返す（env → フォールバック） */
export async function GET() {
  return withSession(async () => {
    try {
      const env = getServerEnv();
      const fromUrl = env.LINE_ADD_FRIEND_URL?.trim();
    const basicId =
      env.LINE_BOT_BASIC_ID?.trim()?.replace(/^@/, '') || FALLBACK_BASIC_ID;

    const url =
      fromUrl && (fromUrl.startsWith('http://') || fromUrl.startsWith('https://'))
        ? fromUrl
        : `https://line.me/R/ti/p/@${basicId}`;

      return NextResponse.json({ url });
    } catch (error) {
      console.error('line add-friend-url error:', error);
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  });
}
