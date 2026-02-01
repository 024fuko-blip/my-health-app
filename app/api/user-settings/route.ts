import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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

/** Prisma UserSettings をフロント期待の snake_case 形式に変換 */
function toApiShape(row: {
  modeIbd: boolean;
  modeAlcohol: boolean;
  modeMental: boolean;
  modeDiet: boolean;
  medicalHistory: string | null;
  currentMedications: string | null;
  gender: string | null;
}) {
  return {
    mode_ibd: row.modeIbd,
    mode_alcohol: row.modeAlcohol,
    mode_mental: row.modeMental,
    mode_diet: row.modeDiet,
    medical_history: row.medicalHistory ?? '',
    current_medications: row.currentMedications ?? '',
    gender: row.gender ?? 'unspecified',
  };
}

export async function GET() {
  try {
    const session = await getSupabaseSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const row = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
    });

    if (!row) {
      return NextResponse.json(toApiShape({
        modeIbd: true,
        modeAlcohol: false,
        modeMental: false,
        modeDiet: false,
        medicalHistory: null,
        currentMedications: null,
        gender: 'unspecified',
      }));
    }

    return NextResponse.json(toApiShape(row));
  } catch (error) {
    console.error('user-settings GET error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSupabaseSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const body = await req.json();
    const {
      mode_ibd,
      mode_alcohol,
      mode_mental,
      mode_diet,
      medical_history,
      current_medications,
      gender,
    } = body;

    await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        modeIbd: Boolean(mode_ibd ?? true),
        modeAlcohol: Boolean(mode_alcohol ?? false),
        modeMental: Boolean(mode_mental ?? false),
        modeDiet: Boolean(mode_diet ?? false),
        medicalHistory: medical_history ?? null,
        currentMedications: current_medications ?? null,
        gender: gender ?? 'unspecified',
      },
      update: {
        modeIbd: Boolean(mode_ibd ?? true),
        modeAlcohol: Boolean(mode_alcohol ?? false),
        modeMental: Boolean(mode_mental ?? false),
        modeDiet: Boolean(mode_diet ?? false),
        medicalHistory: medical_history ?? null,
        currentMedications: current_medications ?? null,
        gender: gender ?? 'unspecified',
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('user-settings PUT error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
