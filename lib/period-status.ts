/** 生理周期に基づいて日付の状態を判定 */
export interface PeriodStatus {
  type: 'period' | 'pms' | 'ovulation' | 'fertile' | null;
  isOvulationDay?: boolean;
}

export function getPeriodStatus(
  dateStr: string,
  lastPeriodDate: string,
  periodCycle: number,
  periodDuration: number
): PeriodStatus {
  if (!lastPeriodDate) return { type: null };

  const targetDate = new Date(dateStr);
  const lastPeriod = new Date(lastPeriodDate);

  // 過去と未来の生理日を計算（前後数周期分）
  for (let i = -3; i <= 6; i++) {
    const periodStart = new Date(lastPeriod);
    periodStart.setDate(periodStart.getDate() + periodCycle * i);

    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + periodDuration - 1);

    // 排卵日は次の生理開始の14日前
    const ovulationDay = new Date(periodStart);
    ovulationDay.setDate(ovulationDay.getDate() + periodCycle - 14);

    // 妊娠しやすい期間（排卵日の5日前〜排卵日）
    const fertileStart = new Date(ovulationDay);
    fertileStart.setDate(fertileStart.getDate() - 5);

    const pmsStart = new Date(periodStart);
    pmsStart.setDate(pmsStart.getDate() + periodCycle - 10); // PMS期間: 次の生理10日前〜

    // 生理中
    if (targetDate >= periodStart && targetDate <= periodEnd) {
      return { type: 'period' };
    }

    // 排卵日
    if (targetDate.toDateString() === ovulationDay.toDateString()) {
      return { type: 'ovulation', isOvulationDay: true };
    }

    // 妊娠しやすい期間（排卵日前の数日）
    if (targetDate >= fertileStart && targetDate < ovulationDay) {
      return { type: 'fertile' };
    }

    // PMS期間（生理前10日間、ただし妊娠しやすい期間と重複しない）
    if (
      targetDate >= pmsStart &&
      targetDate < new Date(periodStart.getTime() + periodCycle * 24 * 60 * 60 * 1000)
    ) {
      // 次の周期の開始前まで
      const nextPeriodStart = new Date(periodStart);
      nextPeriodStart.setDate(nextPeriodStart.getDate() + periodCycle);
      if (targetDate < nextPeriodStart) {
        return { type: 'pms' };
      }
    }
  }

  return { type: null };
}
