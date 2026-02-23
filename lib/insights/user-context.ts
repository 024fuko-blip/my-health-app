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
    ? {
        medicalHistory: s.medicalHistory ?? 'なし',
        currentMedications: medicationsFormatted,
        modeIbd: s.modeIbd,
        modeDiet: s.modeDiet,
        modeAlcohol: s.modeAlcohol,
        modeMental: s.modeMental,
      }
    : {
        medicalHistory: 'なし',
        currentMedications: medicationsFormatted || 'なし',
        modeIbd: false,
        modeDiet: false,
        modeAlcohol: false,
        modeMental: false,
      };
  return { ...ctx, aiPersonality: s?.aiPersonality ?? 'tsundere' };
}

/** モードフラグを日本語テキストに変換（advice / report 共通） */
export function getActiveModesText(modes: {
  modeIbd: boolean;
  modeDiet: boolean;
  modeAlcohol: boolean;
  modeMental: boolean;
}): string {
  const list: string[] = [];
  if (modes.modeIbd) list.push('IBD（腸の症状・便・腹痛）');
  if (modes.modeDiet) list.push('ボディメイク・食事・運動');
  if (modes.modeAlcohol) list.push('アルコール');
  if (modes.modeMental) list.push('メンタル・睡眠・ストレス');
  return list.length > 0 ? list.join('、') : '特になし';
}
