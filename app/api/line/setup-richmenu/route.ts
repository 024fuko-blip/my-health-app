/**
 * Rich Menu をセットアップする API。
 * LINE 設定済みかつ認証済みユーザーが実行可能。
 * 実行: POST /api/line/setup-richmenu
 */
import { NextResponse } from 'next/server';
import { withSession } from '@/lib/api-utils';
import { getServerEnv } from '@/lib/env';
import {
  createRichMenu,
  uploadRichMenuImage,
  setDefaultRichMenu,
} from '@/lib/line-richmenu';
import { generateRichMenuImage } from '@/lib/line-richmenu-image';

export async function POST() {
  return withSession(async () => {
    try {
      const baseUrl = getServerEnv().NEXTAUTH_URL ?? '';
      if (!baseUrl) {
        return NextResponse.json(
          { error: 'NEXTAUTH_URL が設定されていません' },
          { status: 500 }
        );
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
    } catch (error) {
      console.error('Rich Menu setup error:', error);
      const msg = error instanceof Error ? error.message : String(error);
      return NextResponse.json(
        { error: `Rich Menu セットアップ失敗: ${msg}` },
        { status: 500 }
      );
    }
  });
}
