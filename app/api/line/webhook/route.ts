/**
 * LINE Messaging API Webhook。
 * 友だち追加・メッセージ受信・postback を処理。認証は LINE 署名検証で行う。
 */

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { getLineConfig, replyLineMessages } from '@/lib/line';
import { getTodayJST } from '@/lib/date-utils';
import { buildWelcomeMessage, buildWelcomeButtons } from '@/lib/line-messages';
import {
  replyAsCompanion,
  buildChatContextFromSettings,
} from '@/lib/line-chat';
import { getLineFallback } from '@/lib/line-fallback-messages';
import { generateHealthPrediction } from '@/lib/line-health-prediction';
import {
  createRichMenu,
  uploadRichMenuImage,
  setDefaultRichMenu,
} from '@/lib/line-richmenu';
import { generateRichMenuImage } from '@/lib/line-richmenu-image';
import { getServerEnv } from '@/lib/env';
import { isRateLimited } from '@/lib/line-rate-limit';
import { HTTP_STATUS } from '@/lib/constants';

function verifySignature(body: string, signature: string | null, channelSecret: string): boolean {
  if (!signature || !channelSecret) return false;
  const hash = crypto.createHmac('sha256', channelSecret).update(body).digest('base64');
  return hash === signature;
}

export async function POST(req: Request) {
  try {
    const config = getLineConfig();
    if (!config.channelSecret) {
      return new NextResponse('LINE not configured', { status: HTTP_STATUS.SERVICE_UNAVAILABLE });
    }

    const rawBody = await req.text();
    const signature = req.headers.get('x-line-signature');
    if (!verifySignature(rawBody, signature, config.channelSecret)) {
      return new NextResponse('Invalid signature', { status: HTTP_STATUS.UNAUTHORIZED });
    }

    let body: { events?: Array<{
      type: string;
      replyToken?: string;
      source?: { userId?: string };
      message?: { type: string; text?: string };
      postback?: { data?: string };
    }> };
    try {
      body = JSON.parse(rawBody);
    } catch {
      return new NextResponse('Invalid JSON', { status: HTTP_STATUS.BAD_REQUEST });
    }

    const events = body.events ?? [];
    for (const event of events) {
      const lineUserId = event.source?.userId;
      const replyToken = event.replyToken;
      if (!lineUserId) continue;

      if (isRateLimited(lineUserId)) {
        continue; // レート制限超過時はイベントをスキップ
      }

      // 友だち追加: 挨拶＋使い方＋ボタン＋Rich Menu を全員に設定
      if (event.type === 'follow' && config.accessToken) {
        if (replyToken) {
          await replyLineMessages(config.accessToken, replyToken, [
            buildWelcomeMessage(),
            buildWelcomeButtons(),
          ]);
        }
        // Rich Menu を自動作成して全ユーザーに表示（初回・毎回で確実に表示）
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
        continue;
      }

      // テキストメッセージ
      if (event.type === 'message' && event.message?.type === 'text') {
        let text = (event.message.text ?? '').trim();
        if (text.length > 500) {
          if (replyToken && config.accessToken) {
            const linkedForLimit = await prisma.lineLink.findFirst({
              where: { lineUserId },
              include: { user: { include: { userSettings: true } } },
            });
            const personality = linkedForLimit?.user?.userSettings?.aiPersonality ?? null;
            await replyLineMessages(config.accessToken, replyToken, [
              { type: 'text', text: getLineFallback('message_too_long', personality) },
            ]);
          }
          continue;
        }

        // 連携: 「連携 123456」形式
        const linkMatch = text.match(/^連携\s*(\d{6})$/);
        if (linkMatch) {
          const code = linkMatch[1];
          const linkReq = await prisma.lineLinkRequest.findUnique({
            where: { code },
          });
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
            if (replyToken && config.accessToken) {
              const personality = userSettings?.aiPersonality ?? null;
              await replyLineMessages(config.accessToken, replyToken, [
                {
                  type: 'text',
                  text: getLineFallback('link_complete', personality),
                },
                buildWelcomeButtons(),
              ]);
            }
          }
          continue;
        }

        // 今日の体調予想（未連携時は案内）
        if (text === '今日の体調予想') {
          const linked = await prisma.lineLink.findFirst({
            where: { lineUserId },
            include: { user: { include: { userSettings: true } } },
          });
          if (!linked && replyToken && config.accessToken) {
            await replyLineMessages(config.accessToken, replyToken, [
              { type: 'text', text: '体調予想を使うにはアプリで連携してね。設定→LINE連携から。' },
            ]);
          } else if (linked) {
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
            if (replyToken && config.accessToken) {
              await replyLineMessages(config.accessToken, replyToken, [
                { type: 'text', text: prediction },
              ]);
            }
          }
          continue;
        }

        // 連携済みユーザー
        const linked = await prisma.lineLink.findFirst({
          where: { lineUserId },
          include: { user: { include: { userSettings: true } } },
        });
        if (linked) {
          const today = getTodayJST();
          const isRecordCommand =
            /^記録$|^記録\s|^体調\s*\d|^食事|^眠れ|^メモ$/i.test(text) ||
            (/^(体調|食事|眠れ|メモ)/i.test(text) && text.length <= 80);

          if (isRecordCommand) {
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
                data: {
                  userId: linked.userId,
                  date: today,
                  ...update,
                },
              });
            }
            if (replyToken && config.accessToken) {
              const personality = linked.user.userSettings?.aiPersonality ?? null;
              await replyLineMessages(config.accessToken, replyToken, [
                { type: 'text', text: getLineFallback('recorded', personality) },
              ]);
            }
            continue;
          }

          // AI チャット（記録コマンド以外のテキスト）
          const settings = linked.user.userSettings;
          const context = buildChatContextFromSettings({
            medicalHistory: settings?.medicalHistory ?? null,
            currentMedications: settings?.currentMedications ?? null,
            gender: settings?.gender ?? null,
            birthDate: settings?.birthDate ?? null,
            modeIbd: settings?.modeIbd ?? true,
            aiPersonality: settings?.aiPersonality ?? null,
          });
          const aiReply = await replyAsCompanion(text, context);
          if (replyToken && config.accessToken) {
            await replyLineMessages(config.accessToken, replyToken, [
              { type: 'text', text: aiReply },
            ]);
          }
        }
      }

      // Postback（ボタン押下で data が送られてくる場合）
      if (event.type === 'postback' && event.postback?.data && replyToken && config.accessToken) {
        const data = event.postback.data;
        if (data === 'record' || data === 'pet') {
          const linkedForPostback = await prisma.lineLink.findFirst({
            where: { lineUserId },
            include: { user: { include: { userSettings: true } } },
          });
          const personality = linkedForPostback?.user?.userSettings?.aiPersonality ?? null;
          await replyLineMessages(config.accessToken, replyToken, [
            { type: 'text', text: getLineFallback('open_app', personality) },
          ]);
        }
      }
    }

    return new NextResponse('OK', { status: HTTP_STATUS.OK });
  } catch (error) {
    console.error('line webhook error:', error);
    return new NextResponse('Internal Server Error', { status: HTTP_STATUS.INTERNAL_SERVER_ERROR });
  }
}
