/**
 * Cloud Scheduler から定期呼び出しされるエンドポイント。
 * 服薬リマインダー・検診リマインダーをプッシュ通知で送信。
 * 環境変数 CRON_SECRET をヘッダー X-Cron-Secret で送信して保護。
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendPushNotification } from '@/lib/web-push';
import { sendLinePush } from '@/lib/line';
import { getServerEnv } from '@/lib/env';
import { getTodayJST, getTomorrowJST } from '@/lib/date-utils';
import { buildMedicationSchedule } from '@/lib/medication-schedule';
import { safeParseJson } from '@/lib/json-utils';

/** 現在時刻を JST で "HH:00" ～ "HH:45" の15分単位に丸める */
function getCurrentTimeSlotJST(): string {
  const now = new Date();
  const jst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  const hours = jst.getHours();
  const mins = jst.getMinutes();
  const slot = Math.floor(mins / 15) * 15;
  const h = hours.toString().padStart(2, '0');
  const m = slot.toString().padStart(2, '0');
  return `${h}:${m}`;
}

/** 検診リマインダーを送るべきか（毎日8時台の先頭実行時のみ） */
function shouldSendCheckupReminders(): boolean {
  const now = new Date();
  const jst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  return jst.getHours() === 8 && jst.getMinutes() < 15;
}

export async function POST(req: Request) {
  try {
    const cronSecret = getServerEnv().CRON_SECRET;
    const headerSecret = req.headers.get('X-Cron-Secret');
    if (!cronSecret || headerSecret !== cronSecret) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const subscriptions = await prisma.pushSubscription.findMany({
      include: { user: true },
    });
    if (subscriptions.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No subscriptions' });
    }

    const timeSlot = getCurrentTimeSlotJST();
    const today = getTodayJST();
    const tomorrow = getTomorrowJST();
    const sendCheckups = shouldSendCheckupReminders();
    let sent = 0;

    // userId ごとにまとめる（1ユーザー複数デバイス対応）
    const byUser = new Map<string, typeof subscriptions>();
    for (const sub of subscriptions) {
      const list = byUser.get(sub.userId) ?? [];
      list.push(sub);
      byUser.set(sub.userId, list);
    }

    for (const [userId, subs] of byUser) {
      const settings = await prisma.userSettings.findUnique({
        where: { userId },
      });

      // 服薬リマインダー
      const medicationSchedule = buildMedicationSchedule(
        settings?.medicationReminderTimes ?? null,
        settings?.currentMedications ?? null,
        { includeLabel: false }
      );

      const medsAtSlot = medicationSchedule.find((m) => m.time === timeSlot);
      if (medsAtSlot && medsAtSlot.medications.length > 0) {
        const todayLog = await prisma.healthLog.findUnique({
          where: { userId_date: { userId, date: today } },
          select: { medicationTakenDetail: true, aiComment: true },
        });
        const detail = safeParseJson<Record<string, boolean>>(
          todayLog?.medicationTakenDetail ?? null,
          {}
        );
        const medKeys = medsAtSlot.medKeys ?? [];
        const untakenNames: string[] = [];
        if (medKeys.length > 0) {
          medsAtSlot.medications.forEach((name, i) => {
            const key = medKeys[i];
            if (key == null || detail[key] !== true) {
              untakenNames.push(name);
            }
          });
        } else {
          untakenNames.push(...medsAtSlot.medications);
        }
        if (untakenNames.length === 0) continue;

        let body = `${untakenNames.join('、')} の時間です`;
        const latestLog = await prisma.healthLog.findFirst({
          where: { userId, aiComment: { not: null } },
          orderBy: { date: 'desc' },
          select: { aiComment: true },
        });
        if (latestLog?.aiComment && latestLog.aiComment.trim()) {
          const comment = latestLog.aiComment.trim().replace(/\s+/g, ' ');
          const truncated = comment.length > 60 ? comment.slice(0, 57) + '…' : comment;
          body += `\n\nオネエより: ${truncated}`;
        }
        const title = '💊 服薬リマインダー';
        for (const sub of subs) {
          const ok = await sendPushNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            { title, body, url: '/reminders' }
          );
          if (ok) sent++;
        }
        const lineLink = await prisma.lineLink.findUnique({ where: { userId } });
        if (lineLink && (await sendLinePush(lineLink.lineUserId, `${title}\n${body}`))) sent++;
      }

      // 検診リマインダー（8時台の最初の実行時のみ）前日・当日の両方
      if (sendCheckups) {
        const todayCheckups = await prisma.checkupReminder.findMany({
          where: { userId, dueDate: today },
        });
        const tomorrowCheckups = await prisma.checkupReminder.findMany({
          where: { userId, dueDate: tomorrow },
        });
        const formatBody = (c: { name: string; scheduledTime: string | null; memo: string | null }) => {
          const timePart = c.scheduledTime ? ` 予約${c.scheduledTime}` : '';
          const memoPart = c.memo ? `（${c.memo}）` : '';
          return `${c.name}${timePart}${memoPart}`;
        };
        const sendCheckupReminder = async (title: string, body: string) => {
          for (const sub of subs) {
            const ok = await sendPushNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              { title, body, url: '/reminders' }
            );
            if (ok) sent++;
          }
          const lineLink = await prisma.lineLink.findUnique({ where: { userId } });
          if (lineLink && (await sendLinePush(lineLink.lineUserId, `${title}\n${body}`))) sent++;
        };
        for (const c of todayCheckups) {
          const body = `${formatBody(c)} の予定日です`;
          await sendCheckupReminder('🏥 検診リマインダー', body);
        }
        const [ty, tm, td] = tomorrow.split('-').map(Number);
        const tomorrowLabel = `${ty}年${tm}月${td}日`;
        for (const c of tomorrowCheckups) {
          const body = `明日${tomorrowLabel}は ${formatBody(c)} の予定です。忘れずに準備しましょう`;
          await sendCheckupReminder('🏥 検診リマインダー（前日）', body);
        }
      }
    }

    return NextResponse.json({ sent });
  } catch (error) {
    console.error('cron send-reminders error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
