import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import type { HealthLog } from '@prisma/client';

async function getSupabaseSession() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {}
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {}
        },
      },
    }
  );
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

/** Prisma HealthLog をフロント期待の snake_case 形式に変換 */
function toApiShape(log: HealthLog) {
  return {
    id: log.id,
    user_id: log.userId,
    date: log.date,
    memo: log.memo,
    medication_taken: log.medicationTaken,
    general_mood: log.generalMood,
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
  try {
    const session = await getSupabaseSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (date) {
      const log = await prisma.healthLog.findUnique({
        where: {
          userId_date: { userId: session.user.id, date },
        },
      });
      return NextResponse.json(log ? toApiShape(log) : null);
    }

    if (startDate && endDate) {
      const logs = await prisma.healthLog.findMany({
        where: {
          userId: session.user.id,
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
}

export async function POST(req: Request) {
  try {
    const session = await getSupabaseSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const body = await req.json();
    const {
      date,
      memo,
      medication_taken,
      general_mood,
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

    const data = {
      userId: session.user.id,
      date: String(date),
      memo: memo ?? null,
      medicationTaken: Boolean(medication_taken ?? false),
      generalMood: general_mood != null ? Number(general_mood) : null,
      mealDescription: meal_description ?? null,
      periodStatus: period_status ?? null,
      aiComment: ai_comment ?? null,
      painLevel: pain_level != null ? Number(pain_level) : null,
      stoolType: stool_type ?? null,
      alcoholAmount: Number(alcohol_amount ?? 0),
      alcoholPercent: alcohol_percent != null ? Number(alcohol_percent) : null,
      alcoholType: alcohol_type ?? null,
      stressLevel: stress_level != null ? Number(stress_level) : null,
      sleepQuality: sleep_quality ?? null,
      spending: spending != null ? Number(spending) : null,
      weight: weight != null ? Number(weight) : null,
      bodyFat: body_fat != null ? Number(body_fat) : null,
      calories: calories != null ? Number(calories) : null,
      protein: protein != null ? Number(protein) : null,
      steps: steps != null ? Number(steps) : null,
      exerciseMinutes: exercise_minutes != null ? Number(exercise_minutes) : null,
    };

    const log = await prisma.healthLog.upsert({
      where: {
        userId_date: { userId: session.user.id, date: String(date) },
      },
      create: data,
      update: data,
    });

    return NextResponse.json(toApiShape(log));
  } catch (error) {
    console.error('health-logs POST error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getSupabaseSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return new NextResponse('Bad Request: id required', { status: 400 });
    }

    const existing = await prisma.healthLog.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return new NextResponse('Not Found', { status: 404 });
    }

    const data: Partial<{
      memo: string;
      generalMood: number;
      mealDescription: string;
      painLevel: number;
      stoolType: string;
      weight: number | null;
      steps: number | null;
    }> = {};
    if (updates.memo !== undefined) data.memo = updates.memo;
    if (updates.general_mood !== undefined) data.generalMood = Number(updates.general_mood);
    if (updates.meal_description !== undefined) data.mealDescription = updates.meal_description;
    if (updates.pain_level !== undefined) data.painLevel = Number(updates.pain_level);
    if (updates.stool_type !== undefined) data.stoolType = updates.stool_type;
    if (updates.weight !== undefined) data.weight = updates.weight === '' ? null : Number(updates.weight);
    if (updates.steps !== undefined) data.steps = updates.steps === '' ? null : Number(updates.steps);

    const log = await prisma.healthLog.update({
      where: { id },
      data,
    });

    return NextResponse.json(toApiShape(log));
  } catch (error) {
    console.error('health-logs PATCH error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSupabaseSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const date = searchParams.get('date');

    if (id) {
      const existing = await prisma.healthLog.findFirst({
        where: { id, userId: session.user.id },
      });
      if (!existing) return new NextResponse('Not Found', { status: 404 });
      await prisma.healthLog.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    }

    if (date) {
      const existing = await prisma.healthLog.findUnique({
        where: { userId_date: { userId: session.user.id, date } },
      });
      if (!existing) return new NextResponse('Not Found', { status: 404 });
      await prisma.healthLog.delete({
        where: { userId_date: { userId: session.user.id, date } },
      });
      return NextResponse.json({ ok: true });
    }

    return new NextResponse('Bad Request: id or date required', { status: 400 });
  } catch (error) {
    console.error('health-logs DELETE error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
