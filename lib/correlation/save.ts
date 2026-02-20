/**
 * 記録保存時に相関スコアを計算・DB保存
 */

import prisma from '@/lib/prisma';
import { computeCorrelations, type HealthLogForTrigger } from './index';

export async function updateCorrelationStatsAfterLog(userId: string, _recordDate: string) {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const logs = await prisma.healthLog.findMany({
      where: {
        userId,
        date: { gte: startStr, lte: endStr },
      },
      orderBy: { date: 'asc' },
    });

    const forTrigger: HealthLogForTrigger[] = logs.map((l) => ({
      date: l.date,
      alcoholAmount: l.alcoholAmount,
      painLevel: l.painLevel,
      generalMood: l.generalMood,
      sleepQuality: l.sleepQuality,
      stressLevel: l.stressLevel,
      periodStatus: l.periodStatus,
    }));

    const { correlations, triggers } = computeCorrelations(forTrigger, 30);

    const triggersJson = JSON.parse(JSON.stringify(triggers)) as object;
    const correlationsJson = correlations as object;

    await prisma.userCorrelationStats.upsert({
      where: { userId },
      create: {
        userId,
        correlations: correlationsJson,
        triggers: triggersJson,
      },
      update: {
        correlations: correlationsJson,
        triggers: triggersJson,
      },
    });
  } catch (err) {
    console.error('Correlation stats update error:', err);
  }
}
