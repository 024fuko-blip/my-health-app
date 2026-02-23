import prisma from '@/lib/prisma';
import { formatMedicationsFromSettings } from '@/lib/medication-prompt';
import type { UserContext } from './prompts';

export interface UserContextWithPersonality extends UserContext {
  aiPersonality: string;
}

export async function buildUserContext(userId: string): Promise<UserContextWithPersonality> {
  const s = await prisma.userSettings.findUnique({ where: { userId } });
  const medicationsFormatted = formatMedicationsFromSettings(s?.currentMedications);
  const ctx: UserContext = s
    ? { medicalHistory: s.medicalHistory ?? 'なし', currentMedications: medicationsFormatted, modeIbd: s.modeIbd, modeDiet: s.modeDiet, modeAlcohol: s.modeAlcohol, modeMental: s.modeMental }
    : { medicalHistory: 'なし', currentMedications: medicationsFormatted || 'なし', modeIbd: false, modeDiet: false, modeAlcohol: false, modeMental: false };
  return { ...ctx, aiPersonality: s?.aiPersonality ?? 'tsundere' };
}
