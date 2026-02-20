import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { parseJsonBody, withSession } from '@/lib/api-utils';

const MAX_STRING_LENGTH = 10000;

function safeNumber(val: unknown, min: number, max: number): number | null {
  if (val == null || val === '') return null;
  const n = Number(val);
  if (Number.isNaN(n)) return null;
  if (n < min || n > max) return null;
  return n;
}

function safeLongString(val: unknown, maxLen: number): string | null {
  if (val == null || val === '') return null;
  const s = String(val);
  return s.slice(0, maxLen);
}

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
  return withSession(async (session) => {
    try {
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
  });
}

export async function PUT(req: Request) {
  return withSession(async (session) => {
    try {
      const parsed = await parseJsonBody(req);
      if (!parsed.ok) return parsed.error;
      const body = parsed.data;

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

      const personality = (['tsundere', 'kibishime', 'amayama'] as const).includes(ai_personality as 'tsundere' | 'kibishime' | 'amayama')
        ? (ai_personality as 'tsundere' | 'kibishime' | 'amayama')
        : 'tsundere';

      const genderStr = typeof gender === 'string' ? gender : 'unspecified';

      const data = {
        modeIbd: Boolean(mode_ibd ?? true),
        modeAlcohol: Boolean(mode_alcohol ?? false),
        modeMental: Boolean(mode_mental ?? false),
        modeDiet: Boolean(mode_diet ?? false),
        medicalHistory: safeLongString(medical_history, MAX_STRING_LENGTH),
        currentMedications: safeLongString(current_medications, MAX_STRING_LENGTH),
        medicationReminderTimes: medication_reminder_times != null && medication_reminder_times !== '' ? String(medication_reminder_times).slice(0, 2000) : null,
        gender: genderStr,
        aiPersonality: personality,
        profileName: profile_name != null && profile_name !== '' ? String(profile_name).slice(0, 100) : null,
        birthDate: birth_date != null && birth_date !== '' ? String(birth_date).slice(0, 20) : null,
        prefecture: prefecture != null && prefecture !== '' ? String(prefecture).slice(0, 50) : null,
        height: safeNumber(height, 0, 300),
        weight: safeNumber(weight, 0, 500),
        latitude: safeNumber(latitude, -90, 90),
        longitude: safeNumber(longitude, -180, 180),
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
  });
}
