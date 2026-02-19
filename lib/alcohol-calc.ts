export interface DrinkPreset {
  label: string;
  ml: number;
  percent: number;
}

export interface AddedDrink {
  id: number;
  label: string;
  ml: number;
  percent: number;
  count: number;
  pureAlcohol: number;
}

export const DRINK_PRESETS: Record<string, DrinkPreset> = {
  beer350: { label: 'ビール (350ml)', ml: 350, percent: 5 },
  beer500: { label: 'ビール (500ml)', ml: 500, percent: 5 },
  highball350: { label: 'ハイボール (350ml)', ml: 350, percent: 7 },
  highball500: { label: 'ハイボール (500ml)', ml: 500, percent: 7 },
  chuhai350: { label: 'チューハイ (350ml)', ml: 350, percent: 5 },
  chuhai500: { label: 'チューハイ (500ml)', ml: 500, percent: 5 },
  strongChuhai: { label: 'ストロング系 (350ml)', ml: 350, percent: 9 },
  sake: { label: '日本酒 (1合)', ml: 180, percent: 15 },
  wine: { label: 'ワイン (グラス)', ml: 120, percent: 12 },
  wineBottle: { label: 'ワイン (ボトル)', ml: 750, percent: 12 },
  shochu: { label: '焼酎 (ロック1杯)', ml: 60, percent: 25 },
  whiskey: { label: 'ウイスキー (シングル)', ml: 30, percent: 40 },
};

/** 純アルコール量(g)から分解時間を計算（体重ベース） */
export function calculateDecompositionTime(pureAlcoholGrams: number, bodyWeightKg = 60): number {
  const ratePerHour = bodyWeightKg * 0.1;
  return pureAlcoholGrams / ratePerHour;
}

/** 時刻文字列(HH:MM)に時間を加算して新しい時刻を返す */
export function addHoursToTime(timeStr: string, hours: number): string {
  const [h, m] = timeStr.split(':').map(Number);
  const totalMinutes = h * 60 + m + Math.round(hours * 60);
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  const nextDay = totalMinutes >= 24 * 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}${nextDay ? ' (翌日)' : ''}`;
}

/** DBの alcohol_type 文字列を addedDrinks に復元する */
export function parseAlcoholTypeToAddedDrinks(
  alcoholType: string | null | undefined,
  alcoholAmountMl: number | null | undefined
): AddedDrink[] {
  const result: AddedDrink[] = [];
  if (!alcoholType || !alcoholType.trim()) return result;

  const parts = alcoholType
    .split(/\s*[,、]\s*/)
    .map((p) => p.trim())
    .filter(Boolean);

  let totalMlParsed = 0;
  for (let i = 0; i < parts.length; i++) {
    const match = parts[i].match(/^(.+?)x(\d+)$/);
    if (!match) continue;
    const [, label, countStr] = match;
    const count = parseInt(countStr, 10) || 1;
    const preset = Object.values(DRINK_PRESETS).find((p) => p.label === label);
    if (preset) {
      const pure = preset.ml * (preset.percent / 100) * 0.8;
      result.push({
        id: Date.now() + i,
        label: preset.label,
        ml: preset.ml,
        percent: preset.percent,
        count,
        pureAlcohol: pure * count,
      });
      totalMlParsed += preset.ml * count;
    } else {
      const customMatch = label.match(/手入力 \((\d+)ml, ([\d.]+)%\)/);
      if (customMatch) {
        const ml = parseInt(customMatch[1]);
        const percent = parseFloat(customMatch[2]);
        const pure = ml * (percent / 100) * 0.8;
        result.push({
          id: Date.now() + i,
          label,
          ml,
          percent,
          count,
          pureAlcohol: pure * count,
        });
        totalMlParsed += ml * count;
      }
    }
  }

  const amount = alcoholAmountMl ?? 0;
  if (amount > totalMlParsed && amount > 0) {
    result.push({
      id: Date.now() + 999,
      label: `その他 (${amount - totalMlParsed}ml)`,
      ml: amount - totalMlParsed,
      percent: 5,
      count: 1,
      pureAlcohol: 0,
    });
  }
  return result;
}
