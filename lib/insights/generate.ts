/**
 * インサイト生成の統合エントリ。
 * レベルに応じて weekly / monthly / yearly を呼び出し、DB に upsert する。
 */

import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { generateWeeklyInsight } from './weekly';
import { generateMonthlyInsight } from './monthly';
import { generateYearlyInsight } from './yearly';
import type { InsightLevel } from './types';

export { type InsightLevel } from './types';

export async function generateAndSaveInsight(
  userId: string,
  level: InsightLevel,
  startDate: string,
  endDate: string
): Promise<{ id: string }> {
  let result;
  if (level === 'weekly') {
    result = await generateWeeklyInsight(userId, startDate, endDate);
  } else if (level === 'monthly') {
    result = await generateMonthlyInsight(userId, startDate, endDate);
  } else if (level === 'yearly') {
    result = await generateYearlyInsight(userId, startDate, endDate);
  } else {
    throw new Error(`Invalid insight level: ${level}`);
  }

  const metadataJson = result.metadata
    ? (JSON.parse(JSON.stringify(result.metadata)) as Prisma.InputJsonValue)
    : undefined;

  const insight = await prisma.insight.upsert({
    where: {
      userId_level_startDate: { userId, level, startDate },
    },
    create: {
      userId,
      level,
      startDate: result.startDate,
      endDate: result.endDate,
      summary: result.summary,
      metadata: metadataJson,
    },
    update: {
      endDate: result.endDate,
      summary: result.summary,
      metadata: metadataJson,
    },
  });

  return { id: insight.id };
}
