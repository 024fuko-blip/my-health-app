/**
 * Rich Menu をセットアップする API。
 * LINE 設定済みかつ認証済みユーザーが実行可能。
 * 実行: POST /api/line/setup-richmenu
 */
import { NextResponse } from 'next/server';
import { withSession, errorResponse } from '@/lib/api-utils';
import { getServerEnv } from '@/lib/env';
import {
  createRichMenu,
  uploadRichMenuImage,
  setDefaultRichMenu,
} from '@/lib/line-richmenu';
import { generateRichMenuImage } from '@/lib/line-richmenu-image';

export async function POST() {
  return withSession(async (session) => {
    const env = getServerEnv();
    const adminEmails = (env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean);
    if (adminEmails.length > 0 && !adminEmails.includes(session.email ?? '')) {
      return errorResponse('この操作は管理者のみ実行できます', 403);
    }

    const baseUrl = env.NEXTAUTH_URL ?? '';
    if (!baseUrl) {
      return errorResponse('NEXTAUTH_URL が設定されていません', 500);
    }

    const imageBuffer = await generateRichMenuImage();
    const richMenuId = await createRichMenu(baseUrl);
    await uploadRichMenuImage(richMenuId, imageBuffer);
    await setDefaultRichMenu(richMenuId);

    return NextResponse.json({
      ok: true,
      richMenuId,
      message: 'Rich Menu をセットアップしました。LINE アプリで確認してください。',
    });
  });
}
