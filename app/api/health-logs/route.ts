import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { updateStatsAfterLog } from '@/lib/game-stats';
import { updateCorrelationStatsAfterLog } from '@/lib/correlation/save';
import { isValidDateStr } from '@/lib/date-utils';
import { parseJsonBody, withSession } from '@/lib/api-utils';
import { toStringOrNull, toNumOrNull } from '@/lib/json-utils';
import type { HealthLog } from '@prisma/client';

/** Prisma HealthLog をフロント期待の snake_case 形式に変換 */
function safeTemperature(val: unknown): number | null {
  const n = toNumOrNull(val);
  if (n == null) return null;
  if (n < 30 || n > 45) return null;
  return n;
}

/** Prisma HealthLog をフロント期待の snake_case 形式に変換 */
function toApiShape(log: HealthLog) {
  return {
    id: log.id,
    user_id: log.userId,
    date: log.date,
    memo: log.memo,
    medication_taken: log.medicationTaken,
    medication_taken_detail: log.medicationTakenDetail,
    general_mood: log.generalMood,
    temperature: log.temperature,
    meal_description: log.mealDescription,
    period_status: log.periodStatus,
    ai_comment: log.aiComment,
    pain_level: log.painLevel,
    stool_type: log.stoolType,
    alcohol_amount: log.alcoholAmount,
    alcohol_percent: log.alcoholPercent,
    alcohol_type: log.alcoholType,
    stress_level: log.stressLevel,
    sleep_quality: log.sleepQuality,
    spending: log.spending,
    weight: log.weight,
    body_fat: log.bodyFat,
    calories: log.calories,
    protein: log.protein,
    steps: log.steps,
    exercise_minutes: log.exerciseMinutes,
  };
}

export async function GET(req: Request) {
  return withSession(async (session) => {
    try {
      const { searchParams } = new URL(req.url);
      const date = searchParams.get('date');
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');

      if (date) {
        if (!isValidDateStr(date)) {
          return new NextResponse('Bad Request: invalid date format (YYYY-MM-DD)', { status: 400 });
        }
        const log = await prisma.healthLog.findUnique({
          where: {
            userId_date: { userId: session.userId, date },
          },
        });
        return NextResponse.json(log ? toApiShape(log) : null);
      }

      if (startDate && endDate) {
        if (!isValidDateStr(startDate) || !isValidDateStr(endDate)) {
          return new NextResponse('Bad Request: invalid date format (YYYY-MM-DD)', { status: 400 });
        }
        const logs = await prisma.healthLog.findMany({
          where: {
            userId: session.userId,
            date: { gte: startDate, lte: endDate },
          },
          orderBy: { date: 'asc' },
        });
        return NextResponse.json(logs.map(toApiShape));
      }

      return new NextResponse('Bad Request: date or startDate+endDate required', {
        status: 400,
      });
    } catch (error) {
      console.error('health-logs GET error:', error);
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  });
}

export async function POST(req: Request) {
  return withSession(async (session) => {
    try {
      const parsed = await parseJsonBody(req);
    if (!parsed.ok) return parsed.error;
    const body = parsed.data;
    const {
      date,
      memo,
      medication_taken,
      medication_taken_detail,
      general_mood,
      temperature,
      meal_description,
      period_status,
      ai_comment,
      pain_level,
      stool_type,
      alcohol_amount,
      alcohol_percent,
      alcohol_type,
      stress_level,
      sleep_quality,
      spending,
      weight,
      body_fat,
      calories,
      protein,
      steps,
      exercise_minutes,
    } = body;

    if (!date || typeof date !== 'string') {
      return new NextResponse('Bad Request: date required', { status: 400 });
    }
    if (!isValidDateStr(date)) {
      return new NextResponse('Bad Request: invalid date format (YYYY-MM-DD)', { status: 400 });
    }

    const data = {
      userId: session.userId,
      date: String(date),
      memo: toStringOrNull(memo),
      medicationTaken: Boolean(medication_taken ?? false),
      medicationTakenDetail:
        medication_taken_detail != null && typeof medication_taken_detail === 'string'
          ? medication_taken_detail
          : null,
      generalMood: toNumOrNull(general_mood),
      temperature: safeTemperature(temperature),
      mealDescription: toStringOrNull(meal_description),
      periodStatus: toStringOrNull(period_status),
      aiComment: toStringOrNull(ai_comment),
      painLevel: toNumOrNull(pain_level),
      stoolType: toStringOrNull(stool_type),
      alcoholAmount: Number(alcohol_amount ?? 0) || 0,
      alcoholPercent: toNumOrNull(alcohol_percent),
      alcoholType: toStringOrNull(alcohol_type),
      stressLevel: toNumOrNull(stress_level),
      sleepQuality: toStringOrNull(sleep_quality),
      spending: toNumOrNull(spending),
      weight: toNumOrNull(weight),
      bodyFat: toNumOrNull(body_fat),
      calories: toNumOrNull(calories),
      protein: toNumOrNull(protein),
      steps: toNumOrNull(steps),
      exerciseMinutes: toNumOrNull(exercise_minutes),
    };

    let log;
    try {
      log = await prisma.healthLog.upsert({
        where: {
          userId_date: { userId: session.userId, date: String(date) },
        },
        create: data,
        update: data,
      });
    } catch (upsertError: unknown) {
      const msg = upsertError instanceof Error ? upsertError.message : String(upsertError);
      if (msg.includes('medication_taken_detail') || msg.includes('column')) {
        const { medicationTakenDetail, ...dataWithoutDetail } = data;
        log = await prisma.healthLog.upsert({
          where: {
            userId_date: { userId: session.userId, date: String(date) },
          },
          create: dataWithoutDetail,
          update: dataWithoutDetail,
        });
      } else {
        throw upsertError;
      }
    }

    await updateStatsAfterLog(session.userId, String(date));
    await updateCorrelationStatsAfterLog(session.userId, String(date));

    return NextResponse.json(toApiShape(log));
    } catch (error) {
      console.error('health-logs POST error:', error);
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  });
}

export async function PATCH(req: Request) {
  return withSession(async (session) => {
    try {
      const parsed = await parseJsonBody(req);
    if (!parsed.ok) return parsed.error;
    const body = parsed.data;
    const { id, ...updates } = body;

    if (!id || typeof id !== 'string') {
      return new NextResponse('Bad Request: id required', { status: 400 });
    }

    const existing = await prisma.healthLog.findFirst({
      where: { id: String(id), userId: session.userId },
    });
    if (!existing) {
      return new NextResponse('Not Found', { status: 404 });
    }

    const data: Partial<{
      memo: string;
      generalMood: number;
      temperature: number | null;
      mealDescription: string;
      painLevel: number;
      stoolType: string;
      weight: number | null;
      steps: number | null;
      periodStatus: string | null;
      alcoholAmount: number;
      stressLevel: number | null;
      sleepQuality: string | null;
      bodyFat: number | null;
      calories: number | null;
      protein: number | null;
    }> = {};
    if (updates.memo !== undefined) data.memo = toStringOrNull(updates.memo) ?? '';
    if (updates.general_mood !== undefined) data.generalMood = toNumOrNull(updates.general_mood) ?? 0;
    if (updates.temperature !== undefined) data.temperature = safeTemperature(updates.temperature);
    if (updates.meal_description !== undefined) data.mealDescription = toStringOrNull(updates.meal_description) ?? '';
    if (updates.pain_level !== undefined) data.painLevel = toNumOrNull(updates.pain_level) ?? 0;
    if (updates.stool_type !== undefined) data.stoolType = toStringOrNull(updates.stool_type) ?? '';
    if (updates.weight !== undefined) data.weight = toNumOrNull(updates.weight);
    if (updates.steps !== undefined) data.steps = toNumOrNull(updates.steps);
    if (updates.period_status !== undefined) data.periodStatus = toStringOrNull(updates.period_status);
    if (updates.alcohol_amount !== undefined) data.alcoholAmount = Number(updates.alcohol_amount) || 0;
    if (updates.stress_level !== undefined) data.stressLevel = toNumOrNull(updates.stress_level);
    if (updates.sleep_quality !== undefined) data.sleepQuality = toStringOrNull(updates.sleep_quality);
    if (updates.body_fat !== undefined) data.bodyFat = toNumOrNull(updates.body_fat);
    if (updates.calories !== undefined) data.calories = toNumOrNull(updates.calories);
    if (updates.protein !== undefined) data.protein = toNumOrNull(updates.protein);

    const log = await prisma.healthLog.update({
      where: { id: String(id) },
      data,
    });

      return NextResponse.json(toApiShape(log));
    } catch (error) {
      console.error('health-logs PATCH error:', error);
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  });
}

export async function DELETE(req: Request) {
  return withSession(async (session) => {
    try {
      const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const date = searchParams.get('date');

    if (id) {
      const existing = await prisma.healthLog.findFirst({
        where: { id, userId: session.userId },
      });
      if (!existing) return new NextResponse('Not Found', { status: 404 });
      await prisma.healthLog.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    }

    if (date) {
      if (!isValidDateStr(date)) {
        return new NextResponse('Bad Request: invalid date format (YYYY-MM-DD)', { status: 400 });
      }
      const existing = await prisma.healthLog.findUnique({
        where: { userId_date: { userId: session.userId, date } },
      });
      if (!existing) return new NextResponse('Not Found', { status: 404 });
      await prisma.healthLog.delete({
        where: { userId_date: { userId: session.userId, date } },
      });
      return NextResponse.json({ ok: true });
    }

      return new NextResponse('Bad Request: id or date required', { status: 400 });
    } catch (error) {
      console.error('health-logs DELETE error:', error);
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  });
}
