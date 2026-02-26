import prisma from '@/lib/prisma';
import { BADGE_DEFS } from '@/lib/game-badges';

export const POINTS_PER_LOG = 10;
export { BADGE_DEFS } from '@/lib/game-badges';

/** 記録保存時にストリーク・ポイント・バッジを更新 */
export async function updateStatsAfterLog(userId: string, recordDate: string) {
  const existing = await prisma.userGameStats.findUnique({
    where: { userId },
  });

  let currentStreak = 0;
  let longestStreak = existing?.longestStreak ?? 0;
  const totalPoints = (existing?.totalPoints ?? 0) + POINTS_PER_LOG;
  const lastRecordDate = recordDate;
  const prevLast = existing?.lastRecordDate ?? null;

  if (!prevLast) {
    currentStreak = 1;
  } else {
    const prev = new Date(prevLast);
    const curr = new Date(recordDate);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      currentStreak = existing?.currentStreak ?? 1;
    } else if (diffDays === 1) {
      currentStreak = (existing?.currentStreak ?? 0) + 1;
    } else {
      currentStreak = 1;
    }
  }
  if (currentStreak > longestStreak) longestStreak = currentStreak;

  const earnedBadges = (existing?.earnedBadges as Array<{ id: string; name: string; emoji?: string; earnedAt: string }>) ?? [];
  const toAdd: Array<{ id: string; name: string; emoji?: string; earnedAt: string }> = [];
  const today = new Date().toISOString().split('T')[0];
  for (const def of BADGE_DEFS) {
    if (earnedBadges.some((b) => b.id === def.id)) continue;
    if (currentStreak >= def.minStreak) {
      toAdd.push({
        id: def.id,
        name: def.name,
        emoji: def.emoji,
        earnedAt: today,
      });
    }
  }
  const newBadges = [...earnedBadges, ...toAdd];

  await prisma.userGameStats.upsert({
    where: { userId },
    create: {
      userId,
      totalPoints,
      currentStreak,
      longestStreak,
      lastRecordDate,
      earnedBadges: newBadges,
    },
    update: {
      totalPoints,
      currentStreak,
      longestStreak,
      lastRecordDate,
      earnedBadges: newBadges,
    },
  });
}
