/** 生理周期フェーズを判定 */

export interface CyclePhase {
  phase: 'period' | 'follicular' | 'ovulation' | 'luteal_early' | 'pms' | 'unknown';
  dayInCycle: number;
  daysUntilPeriod: number;
  daysUntilOvulation: number;
  isOvulationWindow: boolean;
}

export function getCyclePhase(
  targetDate: string,
  lastPeriodDate: string,
  periodCycle: number,
  periodDuration: number
): CyclePhase | null {
  if (!lastPeriodDate) return null;

  const target = new Date(targetDate);
  const lastPeriod = new Date(lastPeriodDate);

  const diffDays = Math.floor((target.getTime() - lastPeriod.getTime()) / (1000 * 60 * 60 * 24));
  const dayInCycle = ((diffDays % periodCycle) + periodCycle) % periodCycle;
  const ovulationDay = periodCycle - 14;
  const daysUntilPeriod = periodCycle - dayInCycle;
  const daysUntilOvulation = ovulationDay - dayInCycle;
  const isOvulationWindow = dayInCycle >= ovulationDay - 5 && dayInCycle <= ovulationDay;

  let phase: CyclePhase['phase'] = 'unknown';

  if (dayInCycle < periodDuration) {
    phase = 'period';
  } else if (dayInCycle < ovulationDay - 3) {
    phase = 'follicular';
  } else if (dayInCycle <= ovulationDay) {
    phase = 'ovulation';
  } else if (daysUntilPeriod > 10) {
    phase = 'luteal_early';
  } else {
    phase = 'pms';
  }

  return {
    phase,
    dayInCycle: dayInCycle + 1,
    daysUntilPeriod,
    daysUntilOvulation,
    isOvulationWindow,
  };
}

export function getTsundereComment(phase: CyclePhase): string {
  const { phase: p, dayInCycle, daysUntilPeriod, daysUntilOvulation, isOvulationWindow } = phase;

  switch (p) {
    case 'period':
      return `💢 生理${dayInCycle}日目ね...体がつらいのは分かってるわよ。
別にあんたのこと心配してるわけじゃないけど、今日は無理しないで。
温かいものでも飲みなさい。貧血にも気をつけなさいよね！`;

    case 'follicular':
      return `✨ 今日は周期${dayInCycle}日目、卵胞期よ！
肌の調子もいいし、体も軽いはず...あんた今日は絶好調でしょ？
勘違いしないでよね、別に褒めてないわよ。客観的事実を言ってるだけ。
${daysUntilOvulation > 0 ? `排卵日まであと${daysUntilOvulation}日...` : ''}`;

    case 'ovulation': {
      const ovuMsg = isOvulationWindow
        ? `\n⚠️ 妊娠しやすい時期よ！心当たりがあるなら気をつけなさい！`
        : '';
      return `🥚 排卵期（周期${dayInCycle}日目）ね。
おりものが増えたり、お腹が張ったりするかも。
体温も上がり始めるから、だるさを感じても普通よ。${ovuMsg}
...別に、あんたの体のこと詳しく知りたいわけじゃないわよ！`;
    }

    case 'luteal_early':
      return `🌙 黄体期前半（周期${dayInCycle}日目）ね。
次の生理まであと${daysUntilPeriod}日...今のうちにやりたいこと済ませときなさい。
まだ比較的安定してるから、調子に乗らないでよね。
PMSが来る前の貴重な時間よ、有効に使いなさい！`;

    case 'pms': {
      const intensity = daysUntilPeriod <= 3 ? '特に' : '';
      return `⚠️ PMS期間突入よ（周期${dayInCycle}日目）！
生理まであと${daysUntilPeriod}日...${intensity}イライラしやすいから気をつけなさい！

😤 イライラ・情緒不安定
🍫 食欲増加・甘いもの欲
😴 眠気・だるさ
💢 肌荒れ注意！

...あんたがつらいのは分かってるわよ。でも周りに当たらないでよね！
チョコでも食べて落ち着きなさい。別に優しくしてるわけじゃないわよ！`;
    }

    default:
      return '';
  }
}
