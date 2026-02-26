import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { parseJsonBody, withSession } from '@/lib/api-utils';
import { userSettingsPutSchema } from '@/lib/validations/api-schemas';
import { safeNumber, safeLongString } from '@/lib/json-utils';

const MAX_STRING_LENGTH = 10000;

/** 設定が存在しないときのデフォルト値 */
const DEFAULT_USER_SETTINGS = {
  modeIbd: true,
  modeAlcohol: false,
  modeMental: false,
  modeDiet: false,
  medicalHistory: null as string | null,
  currentMedications: null as string | null,
  medicationReminderTimes: null as string | null,
  gender: 'unspecified' as const,
  aiPersonality: 'tsundere' as const,
  profileName: null as string | null,
  birthDate: null as string | null,
  height: null as number | null,
  weight: null as number | null,
  normalTemperature: null as number | null,
  prefecture: null as string | null,
  latitude: null as number | null,
  longitude: null as number | null,
};

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
  normalTemperature: number | null;
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
    normal_temperature: row.normalTemperature ?? null,
    prefecture: row.prefecture ?? null,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
  };
}

export async function GET() {
  return withSession(async (session) => {
    const row = await prisma.userSettings.findUnique({
      where: { userId: session.userId },
    });

    return NextResponse.json(toApiShape(row ?? DEFAULT_USER_SETTINGS));
  });
}

export async function PUT(req: Request) {
  return withSession(async (session) => {
    const parsed = await parseJsonBody(req, userSettingsPutSchema);
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
      normal_temperature,
      prefecture,
      latitude,
      longitude,
    } = body;

    const personality = ai_personality ?? 'tsundere';
    const genderStr = typeof gender === 'string' ? gender : 'unspecified';

    const data = {
      modeIbd: Boolean(mode_ibd ?? true),
      modeAlcohol: Boolean(mode_alcohol ?? false),
      modeMental: Boolean(mode_mental ?? false),
      modeDiet: Boolean(mode_diet ?? false),
      medicalHistory: safeLongString(medical_history, MAX_STRING_LENGTH),
      currentMedications: safeLongString(current_medications, MAX_STRING_LENGTH),
      medicationReminderTimes: safeLongString(medication_reminder_times, 2000),
      gender: genderStr,
      aiPersonality: personality,
      profileName: safeLongString(profile_name, 100),
      birthDate: safeLongString(birth_date, 20),
      prefecture: safeLongString(prefecture, 50),
      height: safeNumber(height, 0, 300),
      weight: safeNumber(weight, 0, 500),
      normalTemperature: safeNumber(normal_temperature, 34, 42),
      latitude: safeNumber(latitude, -90, 90),
      longitude: safeNumber(longitude, -180, 180),
    };

    await prisma.userSettings.upsert({
      where: { userId: session.userId },
      create: { userId: session.userId, ...data },
      update: data,
    });

    return NextResponse.json({ ok: true });
  });
}
