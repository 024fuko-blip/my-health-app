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

const DEFAULT_MEDICATION_TIMES: Record<string, string> = {
  朝: '08:00',
  昼: '12:00',
  晩: '18:00',
  眠前: '22:00',
};

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

/** 今日の日付を JST で YYYY-MM-DD */
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
      let medicationSchedule: Array<{ time: string; medications: string[] }> = [];
      if (settings?.currentMedications) {
        let times: Record<string, string> = DEFAULT_MEDICATION_TIMES;
        try {
          if (settings.medicationReminderTimes) {
            const parsed = JSON.parse(settings.medicationReminderTimes) as Record<string, string>;
            times = { ...DEFAULT_MEDICATION_TIMES, ...parsed };
          }
        } catch {
          /* use defaults */
        }
        let medications: Array<{ name: string; timings: string[] }> = [];
        try {
          const medData = JSON.parse(settings.currentMedications) as {
            medications?: Array<{ name: string; timings: string[] }>;
          };
          if (medData.medications && Array.isArray(medData.medications)) {
            medications = medData.medications;
          }
        } catch {
          /* ignore */
        }
        const timeToMeds: Record<string, string[]> = {};
        for (const med of medications) {
          for (const t of med.timings) {
            const time = times[t] ?? t;
            if (!timeToMeds[time]) timeToMeds[time] = [];
            timeToMeds[time].push(med.name);
          }
        }
        medicationSchedule = Object.entries(timeToMeds).map(([time, meds]) => ({
          time,
          medications: meds,
        }));
      }

      const medsAtSlot = medicationSchedule.find((m) => m.time === timeSlot);
      if (medsAtSlot && medsAtSlot.medications.length > 0) {
        let body = `${medsAtSlot.medications.join('、')} の時間です`;
        const latestLog = await prisma.healthLog.findFirst({
          where: {
            userId,
            aiComment: { not: null },
          },
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

      // 検診リマインダー（8時台の最初の実行時のみ）
      if (sendCheckups) {
        const checkups = await prisma.checkupReminder.findMany({
          where: { userId, dueDate: today },
        });
        for (const c of checkups) {
          const title = '🏥 検診リマインダー';
          const body = `${c.name} の予定日です`;
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
      }
    }

    return NextResponse.json({ sent });
  } catch (error) {
    console.error('cron send-reminders error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
