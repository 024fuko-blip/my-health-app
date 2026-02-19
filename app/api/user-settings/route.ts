import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

/** Prisma UserSettings をフロント期待の snake_case 形式に変換 */
function toApiShape(row: {
  modeIbd: boolean;
  modeAlcohol: boolean;
  modeMental: boolean;
  modeDiet: boolean;
  medicalHistory: string | null;
  currentMedications: string | null;
  medicationReminderTimes: string | null;
  gender: string | null;
  aiPersonality: string | null;
  profileName: string | null;
  birthDate: string | null;
  height: number | null;
  weight: number | null;
  prefecture: string | null;
  latitude: number | null;
  longitude: number | null;
}) {
  return {
    mode_ibd: row.modeIbd,
    mode_alcohol: row.modeAlcohol,
    mode_mental: row.modeMental,
    mode_diet: row.modeDiet,
    medical_history: row.medicalHistory ?? '',
    current_medications: row.currentMedications ?? '',
    medication_reminder_times: row.medicationReminderTimes ?? '',
    gender: row.gender ?? 'unspecified',
    ai_personality: row.aiPersonality ?? 'tsundere',
    profile_name: row.profileName ?? '',
    birth_date: row.birthDate ?? '',
    height: row.height ?? null,
    weight: row.weight ?? null,
    prefecture: row.prefecture ?? null,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
  };
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const row = await prisma.userSettings.findUnique({
      where: { userId: session.userId },
    });

    if (!row) {
      return NextResponse.json(toApiShape({
        modeIbd: true,
        modeAlcohol: false,
        modeMental: false,
        modeDiet: false,
        medicalHistory: null,
        currentMedications: null,
        medicationReminderTimes: null,
        gender: 'unspecified',
        aiPersonality: 'tsundere',
        profileName: null,
        birthDate: null,
        height: null,
        weight: null,
        prefecture: null,
        latitude: null,
        longitude: null,
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
    const session = await getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const body = await req.json();
    const {
      mode_ibd,
      mode_alcohol,
      mode_mental,
      mode_diet,
      medical_history,
      current_medications,
      medication_reminder_times,
      gender,
      ai_personality,
      profile_name,
      birth_date,
      height,
      weight,
      prefecture,
      latitude,
      longitude,
    } = body;

    const personality = ['tsundere', 'amayama', 'ikemen'].includes(ai_personality)
      ? ai_personality
      : 'tsundere';

    const data = {
      modeIbd: Boolean(mode_ibd ?? true),
      modeAlcohol: Boolean(mode_alcohol ?? false),
      modeMental: Boolean(mode_mental ?? false),
      modeDiet: Boolean(mode_diet ?? false),
      medicalHistory: medical_history ?? null,
      currentMedications: current_medications ?? null,
      medicationReminderTimes: medication_reminder_times != null && medication_reminder_times !== '' ? String(medication_reminder_times) : null,
      gender: gender ?? 'unspecified',
      aiPersonality: personality,
      profileName: profile_name != null && profile_name !== '' ? profile_name : null,
      birthDate: birth_date != null && birth_date !== '' ? birth_date : null,
      height: height != null && height !== '' ? Number(height) : null,
      weight: weight != null && weight !== '' ? Number(weight) : null,
      prefecture: prefecture != null && prefecture !== '' ? String(prefecture) : null,
      latitude: latitude != null && latitude !== '' ? Number(latitude) : null,
      longitude: longitude != null && longitude !== '' ? Number(longitude) : null,
    };

    await prisma.userSettings.upsert({
      where: { userId: session.userId },
      create: { userId: session.userId, ...data },
      update: data,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('user-settings PUT error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
