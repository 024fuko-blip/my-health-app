/**
 * LINE Messaging API Webhook。
 * 友だち追加・メッセージ受信・postback を処理。認証は LINE 署名検証で行う。
 */

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { getLineConfig, replyLineMessages } from '@/lib/line';
import { getLineFallback } from '@/lib/line-fallback-messages';
import { isRateLimited } from '@/lib/line-rate-limit';
import { errorResponse } from '@/lib/api-utils';
import { HTTP_STATUS } from '@/lib/constants';
import {
  handleFollowEvent,
  handleLinkCommand,
  handleHealthPrediction,
  handleRecordCommand,
  handleAIChat,
  handlePostback,
  type LineEventContext,
} from '@/lib/line-handlers';

interface LineEvent {
  type: string;
  replyToken?: string;
  source?: { userId?: string };
  message?: { type: string; text?: string };
  postback?: { data?: string };
}

function verifySignature(body: string, signature: string | null, channelSecret: string): boolean {
  if (!signature || !channelSecret) return false;
  const hashBuf = Buffer.from(
    crypto.createHmac('sha256', channelSecret).update(body).digest('base64'),
    'base64',
  );
  let sigBuf: Buffer;
  try {
    sigBuf = Buffer.from(signature, 'base64');
  } catch {
    return false;
  }
  if (hashBuf.length !== sigBuf.length) return false;
  try {
    return crypto.timingSafeEqual(hashBuf, sigBuf);
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const config = getLineConfig();
    if (!config.channelSecret || !config.accessToken) {
      return errorResponse('LINE not configured', HTTP_STATUS.SERVICE_UNAVAILABLE);
    }

    const rawBody = await req.text();
    const signature = req.headers.get('x-line-signature');
    if (!verifySignature(rawBody, signature, config.channelSecret)) {
      return errorResponse('Invalid signature', HTTP_STATUS.UNAUTHORIZED);
    }

    let body: { events?: LineEvent[] };
    try {
      body = JSON.parse(rawBody);
    } catch {
      return errorResponse('Invalid JSON', HTTP_STATUS.BAD_REQUEST);
    }

    const events = body.events ?? [];
    for (const event of events) {
      const lineUserId = event.source?.userId;
      if (!lineUserId) continue;
      if (isRateLimited(lineUserId)) continue;

      const ctx: LineEventContext = {
        lineUserId,
        replyToken: event.replyToken,
        accessToken: config.accessToken!,
      };

      // テキスト・postback で再利用するため、イベントごとに1回だけ lineLink を取得
      const needsLinked = (event.type === 'message' && event.message?.type === 'text') || event.type === 'postback';
      const linked = needsLinked
        ? await prisma.lineLink.findFirst({
            where: { lineUserId },
            include: { user: { include: { userSettings: true } } },
          })
        : null;
      const personality = linked?.user?.userSettings?.aiPersonality ?? null;

      // 友だち追加
      if (event.type === 'follow' && config.accessToken) {
        await handleFollowEvent(ctx);
        continue;
      }

      // テキストメッセージ
      if (event.type === 'message' && event.message?.type === 'text') {
        const text = (event.message.text ?? '').trim();
        if (text.length > 500) {
          if (ctx.replyToken && config.accessToken) {
            await replyLineMessages(config.accessToken, ctx.replyToken, [
              { type: 'text', text: getLineFallback('message_too_long', personality) },
            ]);
          }
          continue;
        }

        // 連携コード
        if (await handleLinkCommand(text, lineUserId, ctx)) continue;

        // 体調予想
        if (text === '今日の体調予想') {
          await handleHealthPrediction(linked as Parameters<typeof handleHealthPrediction>[0], ctx);
          continue;
        }

        // 連携済みユーザーのみ
        if (linked) {
          // 記録コマンド
          if (await handleRecordCommand(text, linked as Parameters<typeof handleRecordCommand>[1], ctx)) continue;
          // AI チャット
          await handleAIChat(text, linked as Parameters<typeof handleAIChat>[1], ctx);
        }
      }

      // Postback
      if (event.type === 'postback' && event.postback?.data && ctx.replyToken && config.accessToken) {
        await handlePostback(event.postback.data, personality, ctx);
      }
    }

    return new NextResponse('OK', { status: HTTP_STATUS.OK });
  } catch (error) {
    console.error('line webhook error:', error);
    return errorResponse('Internal Server Error', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}
