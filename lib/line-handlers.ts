/**
 * LINE Webhook イベントハンドラー。
 * webhook/route.ts の巨大 POST 関数を分解し、各イベント種別を独立関数で処理する。
 */

import prisma from '@/lib/prisma';
import type { LineMessage } from '@/lib/line';
import { replyLineMessages } from '@/lib/line';
import { getTodayJST } from '@/lib/date-utils';
import { buildWelcomeMessage, buildWelcomeButtons } from '@/lib/line-messages';
import { replyAsCompanion, buildChatContextFromSettings } from '@/lib/line-chat';
import { getLineFallback } from '@/lib/line-fallback-messages';
import { generateHealthPrediction } from '@/lib/line-health-prediction';
import { createRichMenu, uploadRichMenuImage, setDefaultRichMenu } from '@/lib/line-richmenu';
import { generateRichMenuImage } from '@/lib/line-richmenu-image';
import { getServerEnv } from '@/lib/env';
import { sanitizeForPrompt } from '@/lib/prompt-utils';

export interface LineEventContext {
  lineUserId: string;
  replyToken: string | undefined;
  accessToken: string;
}

type LinkedUser = Awaited<ReturnType<typeof prisma.lineLink.findFirst>> & {
  user: { userSettings: {
    aiPersonality: string | null;
    prefecture: string | null;
    latitude: number | null;
    longitude: number | null;
    medicalHistory: string | null;
    currentMedications: string | null;
    gender: string | null;
    birthDate: string | null;
    modeIbd: boolean;
  } | null };
};

async function reply(ctx: LineEventContext, messages: LineMessage[]): Promise<void> {
  if (ctx.replyToken && ctx.accessToken) {
    await replyLineMessages(ctx.accessToken, ctx.replyToken, messages);
  }
}

/** 友だち追加イベント */
export async function handleFollowEvent(ctx: LineEventContext): Promise<void> {
  await reply(ctx, [buildWelcomeMessage(), buildWelcomeButtons()]);
  try {
    const baseUrl = getServerEnv().NEXTAUTH_URL ?? '';
    if (baseUrl) {
      const imageBuffer = await generateRichMenuImage();
      const richMenuId = await createRichMenu(baseUrl);
      await uploadRichMenuImage(richMenuId, imageBuffer);
      await setDefaultRichMenu(richMenuId);
    }
  } catch (e) {
    console.error('[LINE] Rich Menu auto-setup error:', e);
  }
}

/** 連携コード処理。handled=true なら後続処理をスキップ */
export async function handleLinkCommand(
  text: string,
  lineUserId: string,
  ctx: LineEventContext,
): Promise<boolean> {
  const linkMatch = text.match(/^連携\s*(\d{6})$/);
  if (!linkMatch) return false;

  const code = linkMatch[1];
  const linkReq = await prisma.lineLinkRequest.findUnique({ where: { code } });
  if (linkReq && new Date() < linkReq.expiresAt) {
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: linkReq.userId },
    });
    await prisma.$transaction([
      prisma.lineLinkRequest.delete({ where: { code } }),
      prisma.lineLink.upsert({
        where: { userId: linkReq.userId },
        create: { userId: linkReq.userId, lineUserId },
        update: { lineUserId },
      }),
    ]);
    const personality = userSettings?.aiPersonality ?? null;
    await reply(ctx, [
      { type: 'text', text: getLineFallback('link_complete', personality) },
      buildWelcomeButtons(),
    ]);
  }
  return true;
}

/** 体調予想コマンド */
export async function handleHealthPrediction(
  linked: LinkedUser | null,
  ctx: LineEventContext,
): Promise<boolean> {
  if (!linked) {
    await reply(ctx, [
      { type: 'text', text: '体調予想を使うにはアプリで連携してね。設定→LINE連携から。' },
    ]);
    return true;
  }

  const prediction = await generateHealthPrediction({
    userId: linked.userId,
    settings: {
      prefecture: linked.user.userSettings?.prefecture ?? null,
      latitude: linked.user.userSettings?.latitude ?? null,
      longitude: linked.user.userSettings?.longitude ?? null,
      aiPersonality: linked.user.userSettings?.aiPersonality ?? null,
      medicalHistory: linked.user.userSettings?.medicalHistory ?? null,
    },
  });
  await reply(ctx, [{ type: 'text', text: prediction }]);
  return true;
}

/** 記録コマンド（体調・食事・メモ等） */
export async function handleRecordCommand(
  text: string,
  linked: LinkedUser,
  ctx: LineEventContext,
): Promise<boolean> {
  const isRecordCommand =
    /^記録$|^記録\s|^体調\s*\d|^食事|^眠れ|^メモ$/i.test(text) ||
    (/^(体調|食事|眠れ|メモ)/i.test(text) && text.length <= 80);

  if (!isRecordCommand) return false;

  const today = getTodayJST();
  const log = await prisma.healthLog.findUnique({
    where: { userId_date: { userId: linked.userId, date: today } },
  });

  const moodMatch = text.match(/体調\s*(\d)/);
  const mealMatch = text.match(/食事[：:]\s*(.+)/);
  const memo = mealMatch
    ? mealMatch[1].trim()
    : text.startsWith('記録') || text.startsWith('メモ')
      ? text.replace(/^(記録|メモ)[：:\s]*/i, '').trim()
      : text;
  const update: { mealDescription?: string; generalMood?: number; memo?: string } = {};
  if (mealMatch) update.mealDescription = memo;
  else if (moodMatch) update.generalMood = parseInt(moodMatch[1], 10);
  else if (memo) update.memo = memo;

  if (log) {
    await prisma.healthLog.update({
      where: { id: log.id, userId: linked.userId },
      data: update,
    });
  } else {
    await prisma.healthLog.create({
      data: { userId: linked.userId, date: today, ...update },
    });
  }

  const personality = linked.user.userSettings?.aiPersonality ?? null;
  await reply(ctx, [{ type: 'text', text: getLineFallback('recorded', personality) }]);
  return true;
}

/** AI チャット（記録コマンド以外のフリーテキスト） */
export async function handleAIChat(
  text: string,
  linked: LinkedUser,
  ctx: LineEventContext,
): Promise<void> {
  const settings = linked.user.userSettings;
  const context = buildChatContextFromSettings({
    medicalHistory: settings?.medicalHistory ?? null,
    currentMedications: settings?.currentMedications ?? null,
    gender: settings?.gender ?? null,
    birthDate: settings?.birthDate ?? null,
    modeIbd: settings?.modeIbd ?? true,
    aiPersonality: settings?.aiPersonality ?? null,
  });
  const aiReply = await replyAsCompanion(sanitizeForPrompt(text), context);
  await reply(ctx, [{ type: 'text', text: aiReply }]);
}

/** Postback イベント */
export async function handlePostback(
  data: string,
  personality: string | null,
  ctx: LineEventContext,
): Promise<void> {
  if (data === 'record' || data === 'pet') {
    await reply(ctx, [{ type: 'text', text: getLineFallback('open_app', personality) }]);
  }
}
