import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { updateStatsAfterLog } from '@/lib/game-stats';
import { updateCorrelationStatsAfterLog } from '@/lib/correlation/save';
import { isValidDateStr } from '@/lib/date-utils';
import { parseJsonBody, withSession, errorResponse } from '@/lib/api-utils';
import { toStringOrNull, toNumOrNull, safeNumber } from '@/lib/json-utils';
import { healthLogPostSchema, healthLogPatchSchema } from '@/lib/validations/api-schemas';
import { HTTP_STATUS } from '@/lib/constants';
import type { HealthLog } from '@prisma/client';

function safeTemperature(val: unknown): number | null {
  return safeNumber(val, 30, 45);
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
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (date) {
      if (!isValidDateStr(date)) {
        return errorResponse('Bad Request: invalid date format (YYYY-MM-DD)', HTTP_STATUS.BAD_REQUEST);
      }
      const log = await prisma.healthLog.findUnique({
        where: { userId_date: { userId: session.userId, date } },
      });
      return NextResponse.json(log ? toApiShape(log) : null);
    }

    if (startDate && endDate) {
      if (!isValidDateStr(startDate) || !isValidDateStr(endDate)) {
        return errorResponse('Bad Request: invalid date format (YYYY-MM-DD)', HTTP_STATUS.BAD_REQUEST);
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

    return errorResponse('Bad Request: date or startDate+endDate required', HTTP_STATUS.BAD_REQUEST);
  });
}

export async function POST(req: Request) {
  return withSession(async (session) => {
    const parsed = await parseJsonBody(req, healthLogPostSchema);
    if (!parsed.ok) return parsed.error;
    const body = parsed.data;
    const {
      date, memo, medication_taken, medication_taken_detail, general_mood,
      temperature, meal_description, period_status, ai_comment, pain_level,
      stool_type, alcohol_amount, alcohol_percent, alcohol_type, stress_level,
      sleep_quality, spending, weight, body_fat, calories, protein, steps,
      exercise_minutes,
    } = body;

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

    const log = await prisma.healthLog.upsert({
      where: { userId_date: { userId: session.userId, date: String(date) } },
      create: data,
      update: data,
    });

    await Promise.all([
      updateStatsAfterLog(session.userId, String(date)),
      updateCorrelationStatsAfterLog(session.userId, String(date)),
    ]);

    return NextResponse.json(toApiShape(log));
  });
}

export async function PATCH(req: Request) {
  return withSession(async (session) => {
    const parsed = await parseJsonBody(req, healthLogPatchSchema);
    if (!parsed.ok) return parsed.error;
    const body = parsed.data;
    const { id, ...updates } = body;

    const existing = await prisma.healthLog.findFirst({
      where: { id: String(id), userId: session.userId },
    });
    if (!existing) {
      return errorResponse('Not Found', HTTP_STATUS.NOT_FOUND);
    }

    type PatchData = Partial<{
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
    }>;
    const PATCH_MAP: Array<{
      bodyKey: keyof typeof updates;
      dbKey: keyof PatchData;
      transform: (v: unknown) => unknown;
    }> = [
      { bodyKey: 'memo', dbKey: 'memo', transform: (v) => toStringOrNull(v) ?? '' },
      { bodyKey: 'general_mood', dbKey: 'generalMood', transform: (v) => toNumOrNull(v) ?? 0 },
      { bodyKey: 'temperature', dbKey: 'temperature', transform: (v) => safeTemperature(v) },
      { bodyKey: 'meal_description', dbKey: 'mealDescription', transform: (v) => toStringOrNull(v) ?? '' },
      { bodyKey: 'pain_level', dbKey: 'painLevel', transform: (v) => toNumOrNull(v) ?? 0 },
      { bodyKey: 'stool_type', dbKey: 'stoolType', transform: (v) => toStringOrNull(v) ?? '' },
      { bodyKey: 'weight', dbKey: 'weight', transform: (v) => toNumOrNull(v) },
      { bodyKey: 'steps', dbKey: 'steps', transform: (v) => toNumOrNull(v) },
      { bodyKey: 'period_status', dbKey: 'periodStatus', transform: (v) => toStringOrNull(v) },
      { bodyKey: 'alcohol_amount', dbKey: 'alcoholAmount', transform: (v) => Number(v) || 0 },
      { bodyKey: 'stress_level', dbKey: 'stressLevel', transform: (v) => toNumOrNull(v) },
      { bodyKey: 'sleep_quality', dbKey: 'sleepQuality', transform: (v) => toStringOrNull(v) },
      { bodyKey: 'body_fat', dbKey: 'bodyFat', transform: (v) => toNumOrNull(v) },
      { bodyKey: 'calories', dbKey: 'calories', transform: (v) => toNumOrNull(v) },
      { bodyKey: 'protein', dbKey: 'protein', transform: (v) => toNumOrNull(v) },
    ];

    const data: PatchData = {};
    for (const { bodyKey, dbKey, transform } of PATCH_MAP) {
      if (updates[bodyKey] !== undefined) {
        (data as Record<string, unknown>)[dbKey] = transform(updates[bodyKey]);
      }
    }

    const log = await prisma.healthLog.update({
      where: { id: String(id), userId: session.userId },
      data,
    });

    return NextResponse.json(toApiShape(log));
  });
}

export async function DELETE(req: Request) {
  return withSession(async (session) => {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const date = searchParams.get('date');

    if (id) {
      const existing = await prisma.healthLog.findFirst({
        where: { id, userId: session.userId },
      });
      if (!existing) return errorResponse('Not Found', HTTP_STATUS.NOT_FOUND);
      await prisma.healthLog.delete({
        where: { id, userId: session.userId },
      });
      return NextResponse.json({ ok: true });
    }

    if (date) {
      if (!isValidDateStr(date)) {
        return errorResponse('Bad Request: invalid date format (YYYY-MM-DD)', HTTP_STATUS.BAD_REQUEST);
      }
      const existing = await prisma.healthLog.findUnique({
        where: { userId_date: { userId: session.userId, date } },
      });
      if (!existing) return errorResponse('Not Found', HTTP_STATUS.NOT_FOUND);
      await prisma.healthLog.delete({
        where: { userId_date: { userId: session.userId, date } },
      });
      return NextResponse.json({ ok: true });
    }

    return errorResponse('Bad Request: id or date required', HTTP_STATUS.BAD_REQUEST);
  });
}
