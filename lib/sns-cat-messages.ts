/**
 * Lv.5 気ままな青年：SNS風メッセージ分岐ロジック
 * 歩数・睡眠など健康データに基づいて生意気だが効果的なアドバイスを返す
 */

const LOW_STEPS_THRESHOLD = 3000;

export interface SnsCatInput {
  /** 昨日の歩数（null = 記録なし） */
  yesterdaySteps: number | null;
  /** 昨日の睡眠の質（"悪" を含むと不良） */
  yesterdaySleepQuality: string | null;
  /** 昨日のストレス（高ければ厳しめ） */
  yesterdayStressLevel: number | null;
}

export interface SnsCatMessage {
  text: string;
  mangaEmoji: "💡" | "💢";
}

/** 健康データからメッセージを決定（優先順位: 歩数不足 > 睡眠良好 > ストレス高 > デフォルト） */
export function getSnsCatMessage(input: SnsCatInput): SnsCatMessage {
  const steps = input.yesterdaySteps ?? 0;

  // 昨日の歩数が少ない（or 記録なし）
  if (steps < LOW_STEPS_THRESHOLD) {
    return {
      text: "昨日はサボったな？（サングラスキラーン）",
      mangaEmoji: "💢",
    };
  }

  // 睡眠が良い
  const sleep = (input.yesterdaySleepQuality ?? "").trim();
  if (sleep.length > 0 && !sleep.includes("悪")) {
    return {
      text: "良い睡眠じゃん（サングラスを外した優しい目）",
      mangaEmoji: "💡",
    };
  }

  // ストレスが高い
  const stress = input.yesterdayStressLevel ?? 0;
  if (stress >= 7) {
    return {
      text: "ストレス溜まってる？ ちょっと休めって（心配顔）",
      mangaEmoji: "💢",
    };
  }

  // デフォルト
  return {
    text: "今日も記録続けてくれたんだな。まあ、えらい（照れ）",
    mangaEmoji: "💡",
  };
}
