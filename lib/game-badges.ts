/** バッジ定義（クライアント・サーバー共通。Prisma 非依存） */
export const BADGE_DEFS = [
  { id: 'streak_3', name: '3日連続記録', minStreak: 3, emoji: '🔥' },
  { id: 'streak_7', name: '7日連続記録', minStreak: 7, emoji: '⭐' },
  { id: 'streak_14', name: '2週間連続', minStreak: 14, emoji: '🌟' },
  { id: 'streak_30', name: '30日連続記録', minStreak: 30, emoji: '👑' },
  { id: 'first_log', name: '初記録', minStreak: 1, emoji: '🎉' },
] as const;
