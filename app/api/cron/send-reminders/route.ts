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
import { timingSafeCompare, errorResponse } from '@/lib/api-utils';
import { getTodayJST, getTomorrowJST } from '@/lib/date-utils';
import { buildMedicationSchedule } from '@/lib/medication-schedule';
import { safeParseJson } from '@/lib/json-utils';
import { getLineFallback } from '@/lib/line-fallback-messages';

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

/** Push + LINE でメッセージを送信。送信成功数を返す */
async function broadcastToUser(
  subs: Array<{ endpoint: string; p256dh: string; auth: string }>,
  lineUserId: string | null,
  title: string,
  body: string,
): Promise<number> {
  let sent = 0;
  for (const sub of subs) {
    const ok = await sendPushNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      { title, body, url: '/reminders' },
    );
    if (ok) sent++;
  }
  if (lineUserId && (await sendLinePush(lineUserId, `${title}\n${body}`))) sent++;
  return sent;
}

export async function POST(req: Request) {
  try {
    const cronSecret = getServerEnv().CRON_SECRET;
    const headerSecret = req.headers.get('X-Cron-Secret');
    if (!timingSafeCompare(headerSecret, cronSecret)) {
      return errorResponse('Forbidden', 403);
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

    // バッチクエリ: 全ユーザーの設定・ログ・LINE連携を一括取得
    const userIds = [...byUser.keys()];
    const [allSettings, allTodayLogs, allLineLinks, allLatestAiComments] = await Promise.all([
      prisma.userSettings.findMany({ where: { userId: { in: userIds } } }),
      prisma.healthLog.findMany({
        where: { userId: { in: userIds }, date: today },
        select: { userId: true, medicationTakenDetail: true, aiComment: true },
      }),
      prisma.lineLink.findMany({ where: { userId: { in: userIds } } }),
      prisma.healthLog.findMany({
        where: { userId: { in: userIds }, aiComment: { not: null } },
        orderBy: { date: 'desc' },
        distinct: ['userId'],
        select: { userId: true, aiComment: true },
      }),
    ]);
    const settingsMap = new Map(allSettings.map((s) => [s.userId, s]));
    const todayLogMap = new Map(allTodayLogs.map((l) => [l.userId, l]));
    const lineLinkMap = new Map(allLineLinks.map((l) => [l.userId, l]));
    const latestAiMap = new Map(allLatestAiComments.map((l) => [l.userId, l.aiComment]));

    // 検診リマインダーも一括取得
    let todayCheckupsMap = new Map<string, Array<{ name: string; scheduledTime: string | null; memo: string | null }>>();
    let tomorrowCheckupsMap = new Map<string, Array<{ name: string; scheduledTime: string | null; memo: string | null }>>();
    if (sendCheckups) {
      const [todayCheckups, tomorrowCheckups] = await Promise.all([
        prisma.checkupReminder.findMany({ where: { userId: { in: userIds }, dueDate: today } }),
        prisma.checkupReminder.findMany({ where: { userId: { in: userIds }, dueDate: tomorrow } }),
      ]);
      for (const c of todayCheckups) {
        const list = todayCheckupsMap.get(c.userId) ?? [];
        list.push(c);
        todayCheckupsMap.set(c.userId, list);
      }
      for (const c of tomorrowCheckups) {
        const list = tomorrowCheckupsMap.get(c.userId) ?? [];
        list.push(c);
        tomorrowCheckupsMap.set(c.userId, list);
      }
    }

    for (const [userId, subs] of byUser) {
      const settings = settingsMap.get(userId);
      const lineLink = lineLinkMap.get(userId);
      const lineUserId = lineLink?.lineUserId ?? null;

      // 服薬リマインダー
      const medicationSchedule = buildMedicationSchedule(
        settings?.medicationReminderTimes ?? null,
        settings?.currentMedications ?? null,
        { includeLabel: false },
      );

      const medsAtSlot = medicationSchedule.find((m) => m.time === timeSlot);
      if (medsAtSlot && medsAtSlot.medications.length > 0) {
        const todayLog = todayLogMap.get(userId);
        const detail = safeParseJson<Record<string, boolean>>(
          todayLog?.medicationTakenDetail ?? null,
          {},
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
        const latestAiComment = latestAiMap.get(userId);
        if (latestAiComment?.trim()) {
          const comment = latestAiComment.trim().replace(/\s+/g, ' ');
          const truncated = comment.length > 60 ? comment.slice(0, 57) + '…' : comment;
          const fromLabel = getLineFallback('reminder_from', settings?.aiPersonality ?? null);
          body += `\n\n${fromLabel}: ${truncated}`;
        }
        sent += await broadcastToUser(subs, lineUserId, '💊 服薬リマインダー', body);
      }

      // 検診リマインダー（8時台の最初の実行時のみ）
      if (sendCheckups) {
        const formatBody = (c: { name: string; scheduledTime: string | null; memo: string | null }) => {
          const timePart = c.scheduledTime ? ` 予約${c.scheduledTime}` : '';
          const memoPart = c.memo ? `（${c.memo}）` : '';
          return `${c.name}${timePart}${memoPart}`;
        };

        for (const c of todayCheckupsMap.get(userId) ?? []) {
          const body = `${formatBody(c)} の予定日です`;
          sent += await broadcastToUser(subs, lineUserId, '🏥 検診リマインダー', body);
        }
        const [ty, tm, td] = tomorrow.split('-').map(Number);
        const tomorrowLabel = `${ty}年${tm}月${td}日`;
        for (const c of tomorrowCheckupsMap.get(userId) ?? []) {
          const body = `明日${tomorrowLabel}は ${formatBody(c)} の予定です。忘れずに準備しましょう`;
          sent += await broadcastToUser(subs, lineUserId, '🏥 検診リマインダー（前日）', body);
        }
      }
    }

    return NextResponse.json({ sent });
  } catch (error) {
    console.error('cron send-reminders error:', error);
    return errorResponse('Internal Server Error', 500);
  }
}
