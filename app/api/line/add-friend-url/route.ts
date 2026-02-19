import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getServerEnv } from '@/lib/env';

/** GET: LINE友だち追加URLを返す（ランタイム環境変数から。Cloud Run で設定可能） */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

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
  } catch (error) {
    console.error('line add-friend-url error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
