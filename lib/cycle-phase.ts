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

// ─────────────────────────────────────────────────────────────────────────────
// データ駆動パターン: 人格 × フェーズ のテンプレートマップ
// 新しい人格を追加するときは CYCLE_TEMPLATES に 1 エントリ追加するだけでよい
// ─────────────────────────────────────────────────────────────────────────────

type PhaseKey = 'period' | 'follicular' | 'ovulation' | 'luteal_early' | 'pms';
type PersonalityKey = 'tsundere' | 'amayama' | 'kibishime' | 'naruse';
type PhaseTemplates = Partial<Record<PhaseKey, (phase: CyclePhase) => string>>;

const CYCLE_TEMPLATES: Record<PersonalityKey, PhaseTemplates> = {
  tsundere: {
    period: ({ dayInCycle }) =>
      `💢 生理${dayInCycle}日目ね...体がつらいのは分かってるわよ。\n別にあんたのこと心配してるわけじゃないけど、今日は無理しないで。\n温かいものでも飲みなさい。貧血にも気をつけなさいよね！`,

    follicular: ({ dayInCycle, daysUntilOvulation }) =>
      `✨ 今日は周期${dayInCycle}日目、卵胞期よ！\n肌の調子もいいし、体も軽いはず...あんた今日は絶好調でしょ？\n勘違いしないでよね、別に褒めてないわよ。客観的事実を言ってるだけ。\n${daysUntilOvulation > 0 ? `排卵日まであと${daysUntilOvulation}日...` : ''}`,

    ovulation: ({ dayInCycle, isOvulationWindow }) =>
      `🥚 排卵期（周期${dayInCycle}日目）ね。\nおりものが増えたり、お腹が張ったりするかも。\n体温も上がり始めるから、だるさを感じても普通よ。${isOvulationWindow ? '\n⚠️ 妊娠しやすい時期よ！心当たりがあるなら気をつけなさい！' : ''}\n...別に、あんたの体のこと詳しく知りたいわけじゃないわよ！`,

    luteal_early: ({ dayInCycle, daysUntilPeriod }) =>
      `🌙 黄体期前半（周期${dayInCycle}日目）ね。\n次の生理まであと${daysUntilPeriod}日...今のうちにやりたいこと済ませときなさい。\nまだ比較的安定してるから、調子に乗らないでよね。\nPMSが来る前の貴重な時間よ、有効に使いなさい！`,

    pms: ({ dayInCycle, daysUntilPeriod }) =>
      `⚠️ PMS期間突入よ（周期${dayInCycle}日目）！\n生理まであと${daysUntilPeriod}日...${daysUntilPeriod <= 3 ? '特に' : ''}イライラしやすいから気をつけなさい！\n\n😤 イライラ・情緒不安定\n🍫 食欲増加・甘いもの欲\n😴 眠気・だるさ\n💢 肌荒れ注意！\n\n...あんたがつらいのは分かってるわよ。でも周りに当たらないでよね！\nチョコでも食べて落ち着きなさい。別に優しくしてるわけじゃないわよ！`,
  },

  amayama: {
    period: ({ dayInCycle }) =>
      `💙 生理${dayInCycle}日目だね。体がつらいのは分かってるよ。\n今日は無理しないで。温かいものでも飲んで、ゆっくりしてね。\nデータを見ると体が休みたがってるタイミングだから、素直に休もう。`,

    follicular: ({ dayInCycle, daysUntilOvulation }) =>
      `✨ 周期${dayInCycle}日目、卵胞期だよ。\n肌も体も軽いはず！今日は調子良さそうだね。\n${daysUntilOvulation > 0 ? `排卵日まであと${daysUntilOvulation}日だよ。` : ''}`,

    ovulation: ({ dayInCycle, isOvulationWindow }) =>
      `🥚 排卵期（周期${dayInCycle}日目）だね。\nおりものが増えたり、お腹が張ったりすることがあるよ。\n体温も上がり始めるから、だるさを感じても大丈夫。${isOvulationWindow ? '\n妊娠の可能性を考えるなら、気をつけてね。' : ''}`,

    luteal_early: ({ dayInCycle, daysUntilPeriod }) =>
      `🌙 黄体期前半（周期${dayInCycle}日目）だよ。\n次の生理まであと${daysUntilPeriod}日。今のうちにやりたいこと済ませておこう。\nまだ比較的安定してるから、計画的に過ごすといいね。`,

    pms: ({ dayInCycle, daysUntilPeriod }) =>
      `⚠️ PMS期間だね（周期${dayInCycle}日目）。\n生理まであと${daysUntilPeriod}日。${daysUntilPeriod <= 3 ? '特に' : ''}イライラしやすい時期だから気をつけて。\n\n💡 イライラ・情緒不安定\n🍫 甘いもの欲\n😴 眠気・だるさ\n💢 肌荒れに注意\n\nデータ的にも体が変化してるタイミング。周りに当たらず、チョコとかで気分を落ち着けてね。`,
  },

  kibishime: {
    period: ({ dayInCycle }) =>
      `生理${dayInCycle}日目です。体がつらい時期ですね。\n無理せず、温かいもので体を温めて、しっかり休んでください。\n貧血にも注意しましょう。`,

    follicular: ({ dayInCycle, daysUntilOvulation }) =>
      `周期${dayInCycle}日目、卵胞期です。\n肌も体も軽い時期。調子を活かして有効に過ごしましょう。\n${daysUntilOvulation > 0 ? `排卵日まであと${daysUntilOvulation}日です。` : ''}`,

    ovulation: ({ dayInCycle, isOvulationWindow }) =>
      `排卵期（周期${dayInCycle}日目）です。\nおりものの変化や、お腹の張りを感じることがあります。\n体温が上がり、だるさを感じることもあります。${isOvulationWindow ? '\n妊娠の可能性を考える場合は、気をつけてください。' : ''}`,

    luteal_early: ({ dayInCycle, daysUntilPeriod }) =>
      `黄体期前半（周期${dayInCycle}日目）です。\n次の生理まであと${daysUntilPeriod}日。比較的安定しているうちに、やりたいことを済ませておきましょう。`,

    pms: ({ dayInCycle, daysUntilPeriod }) =>
      `PMS期間です（周期${dayInCycle}日目）。\n生理まであと${daysUntilPeriod}日。${daysUntilPeriod <= 3 ? '特に' : ''}イライラしやすい時期なので注意してください。\n\n・イライラ・情緒不安定\n・甘いもの欲\n・眠気・だるさ\n・肌荒れ\n\n体が変化している時期です。周囲に当たらず、チョコなどで気分を落ち着けましょう。`,
  },

  naruse: {
    period: ({ dayInCycle }) =>
      `（前髪をかき上げる）フッ……生理${dayInCycle}日目か。体がつらいのは分かってる。俺様が特別に休んでいいと言ってるのだから、素直に従いなさい。温かいものでも飲んで、貧血に気をつけろ。俺の輝きに目が眩まないようにな。`,

    follicular: ({ dayInCycle, daysUntilOvulation }) =>
      `フッ……周期${dayInCycle}日目、卵胞期だな。肌も体も軽いはずだ。俺様の相棒が調子悪いなんて許さない。今日は絶好調で行け。\n${daysUntilOvulation > 0 ? `排卵日まであと${daysUntilOvulation}日……俺様のデータが教えてる。` : ''}`,

    ovulation: ({ dayInCycle, isOvulationWindow }) =>
      `排卵期（周期${dayInCycle}日目）だ。（前髪をかき上げる）おりものが増えたり、お腹が張ったりするかもしれない。体温も上がるから、だるさを感じても仕方ない。${isOvulationWindow ? '\n妊娠の可能性を考えるなら、俺様の忠告を聞いておけ。' : ''}\n俺が完璧すぎて困る……いつも的確にアドバイスできてしまう。`,

    luteal_early: ({ dayInCycle, daysUntilPeriod }) =>
      `黄体期前半（周期${dayInCycle}日目）だな。次の生理まであと${daysUntilPeriod}日。今のうちにやりたいこと済ませておけ。俺様の輝きに酔ってる暇はない。`,

    pms: ({ dayInCycle, daysUntilPeriod }) =>
      `フッ……PMS期間だ（周期${dayInCycle}日目）。生理まであと${daysUntilPeriod}日。${daysUntilPeriod <= 3 ? '特に' : ''}イライラしやすい時期だな。\n\n😤 イライラ・情緒不安定\n🍫 甘いもの欲\n😴 眠気・だるさ\n💢 肌荒れに注意\n\n周りに当たるな。チョコでも食って落ち着け。……俺様が優しくしてやってるのは、お前が俺の相棒だからだ。感謝しろ。`,
  },
};

/**
 * 生理周期フェーズに応じたコメントを人格別に返す（統合関数）。
 * personality が不正な場合は 'tsundere' にフォールバック。
 */
export function getCycleComment(
  phase: CyclePhase,
  personality: string | null | undefined = 'tsundere'
): string {
  const validKeys: PersonalityKey[] = ['tsundere', 'amayama', 'kibishime', 'naruse'];
  const key: PersonalityKey = validKeys.includes(personality as PersonalityKey)
    ? (personality as PersonalityKey)
    : 'tsundere';
  const phaseKey = phase.phase as PhaseKey;
  return CYCLE_TEMPLATES[key][phaseKey]?.(phase) ?? '';
}

// 後方互換エクスポート（既存のテストコード等が使用）
/** @deprecated getCycleComment(phase, 'tsundere') を使用してください */
export const getTsundereComment = (p: CyclePhase) => getCycleComment(p, 'tsundere');
/** @deprecated getCycleComment(phase, 'amayama') を使用してください */
export const getAmayamaComment = (p: CyclePhase) => getCycleComment(p, 'amayama');
/** @deprecated getCycleComment(phase, 'kibishime') を使用してください */
export const getKibishimeComment = (p: CyclePhase) => getCycleComment(p, 'kibishime');
/** @deprecated getCycleComment(phase, 'naruse') を使用してください */
export const getNaruseComment = (p: CyclePhase) => getCycleComment(p, 'naruse');
