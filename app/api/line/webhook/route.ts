/**
 * LINE Messaging API Webhook。
 * 友だち追加・メッセージ受信を処理。認証は LINE 署名検証で行う。
 */

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { getLineConfig } from '@/lib/line';

function verifySignature(body: string, signature: string | null, channelSecret: string): boolean {
  if (!signature || !channelSecret) return false;
  const hash = crypto.createHmac('sha256', channelSecret).update(body).digest('base64');
  return hash === signature;
}

export async function POST(req: Request) {
  try {
    const config = getLineConfig();
    if (!config.channelSecret) {
      return new NextResponse('LINE not configured', { status: 503 });
    }

    const rawBody = await req.text();
    const signature = req.headers.get('x-line-signature');
    if (!verifySignature(rawBody, signature, config.channelSecret)) {
      return new NextResponse('Invalid signature', { status: 401 });
    }

    const body = JSON.parse(rawBody) as { events?: Array<{
      type: string;
      replyToken?: string;
      source?: { userId?: string };
      message?: { type: string; text?: string };
    }> };

    const events = body.events ?? [];
    for (const event of events) {
      const lineUserId = event.source?.userId;
      const replyToken = event.replyToken;
      if (!lineUserId) continue;

      if (event.type === 'message' && event.message?.type === 'text') {
        const text = (event.message.text ?? '').trim();

        // 連携: 「連携 123456」形式
        const linkMatch = text.match(/^連携\s*(\d{6})$/);
        if (linkMatch) {
          const code = linkMatch[1];
          const req = await prisma.lineLinkRequest.findUnique({
            where: { code },
          });
          if (req && new Date() < req.expiresAt) {
            await prisma.$transaction([
              prisma.lineLinkRequest.delete({ where: { code } }),
              prisma.lineLink.upsert({
                where: { userId: req.userId },
                create: { userId: req.userId, lineUserId },
                update: { lineUserId },
              }),
            ]);
            if (replyToken && config.accessToken) {
              await replyLine(config.accessToken, replyToken, '連携完了！服薬リマインダーと記録がLINEで受け取れるようになったわ。');
            }
          }
          continue;
        }

        // 記録: 「記録」「体調4」「食事: サラダ」などを簡易記録
        const linked = await prisma.lineLink.findFirst({
          where: { lineUserId },
        });
        if (linked) {
          const today = getTodayJST();
          if (/^記録$|^体調\s*\d|^食事|^眠れ|^メモ/i.test(text) || text.length <= 100) {
            const log = await prisma.healthLog.findUnique({
              where: { userId_date: { userId: linked.userId, date: today } },
            });
            const moodMatch = text.match(/体調\s*(\d)/);
            const mealMatch = text.match(/食事[：:]\s*(.+)/);
            const memo = mealMatch ? mealMatch[1].trim() : (text.startsWith('記録') || text.startsWith('メモ') ? text.replace(/^(記録|メモ)[：:\s]*/i, '').trim() : text);
            const update: { mealDescription?: string; generalMood?: number; memo?: string } = {};
            if (mealMatch) update.mealDescription = memo;
            else if (moodMatch) update.generalMood = parseInt(moodMatch[1], 10);
            else if (memo) update.memo = memo;

            if (log) {
              await prisma.healthLog.update({
                where: { id: log.id },
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
              await replyLine(config.accessToken, replyToken, '記録しておいたわ。');
            }
          }
        }
      }
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('line webhook error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

function getTodayJST(): string {
  const formatter = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(new Date());
  const y = parts.find((p) => p.type === 'year')!.value;
  const m = parts.find((p) => p.type === 'month')!.value;
  const d = parts.find((p) => p.type === 'day')!.value;
  return `${y}-${m}-${d}`;
}

async function replyLine(accessToken: string, replyToken: string, text: string) {
  try {
    await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        replyToken,
        messages: [{ type: 'text', text }],
      }),
    });
  } catch (e) {
    console.error('LINE reply error:', e);
  }
}
