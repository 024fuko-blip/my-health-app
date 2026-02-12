import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { BADGE_DEFS } from '@/lib/game-stats';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const stats = await prisma.userGameStats.findUnique({
      where: { userId: session.userId },
    });

    const earnedBadges = (stats?.earnedBadges as Array<{ id: string; name: string; emoji?: string; earnedAt: string }>) ?? [];
    const badges = BADGE_DEFS.map((def) => {
      const earned = earnedBadges.find((b) => b.id === def.id);
      return {
        id: def.id,
        name: def.name,
        emoji: def.emoji,
        earned: !!earned,
        earnedAt: earned?.earnedAt ?? null,
      };
    });

    return NextResponse.json({
      total_points: stats?.totalPoints ?? 0,
      current_streak: stats?.currentStreak ?? 0,
      longest_streak: stats?.longestStreak ?? 0,
      last_record_date: stats?.lastRecordDate ?? null,
      badges,
    });
  } catch (error) {
    console.error('game-stats GET error:', error);
    return NextResponse.json({
      total_points: 0,
      current_streak: 0,
      longest_streak: 0,
      last_record_date: null,
      badges: BADGE_DEFS.map((def) => ({
        id: def.id,
        name: def.name,
        emoji: def.emoji,
        earned: false,
        earnedAt: null,
      })),
    });
  }
}
