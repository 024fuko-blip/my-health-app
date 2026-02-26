/**
 * LINE 返信のフォールバックメッセージ。
 * ユーザーが選択した AI 口調（tsundere/kibishime/amayama/naruse）で統一する。
 */
import type { AiPersonality } from './chara-settings';

const VALID: AiPersonality[] = ['tsundere', 'kibishime', 'amayama', 'naruse'];

const MESSAGES: Record<
  string,
  Record<AiPersonality, string>
> = {
  message_too_long: {
    tsundere: 'メッセージが長すぎるわ。500文字以内で送ってね。',
    kibishime: 'メッセージが長すぎます。500文字以内で送ってください。',
    amayama: 'メッセージが長すぎるね。500文字以内で送ってくれるかな。',
    naruse: 'メッセージが長すぎる。500文字以内に収めろ。',
  },
  link_complete: {
    tsundere: '連携完了！服薬リマインダーと記録がLINEで受け取れるようになったわ。相談もできるようになったから、何でも聞いてね。下のメニューからアプリを開けるわよ。',
    kibishime: '連携完了です。服薬リマインダーと記録がLINEで受け取れます。相談も可能なので、何でも聞いてください。下のメニューからアプリを開けます。',
    amayama: '連携完了だよ！服薬リマインダーと記録がLINEで受け取れるようになったね。相談もできるようになったから、何でも聞いてね。下のメニューからアプリを開けるよ。',
    naruse: '連携完了だ。服薬リマインダーと記録がLINEで受け取れる。相談も俺に聞け。下のメニューからアプリを開け。',
  },
  recorded: {
    tsundere: '記録しておいたわ。',
    kibishime: '記録した。',
    amayama: '記録しておいたよ。',
    naruse: '俺様が記録してやった。',
  },
  open_app: {
    tsundere: 'アプリを開いてね。下のメニューから選んでちょうだい。',
    kibishime: 'アプリを開いてください。下のメニューから選べます。',
    amayama: 'アプリを開いてね。下のメニューから選べるよ。',
    naruse: 'アプリを開け。下のメニューから選べ。',
  },
  api_unavailable: {
    tsundere: '申し訳ない、今は相談に乗れないの。あとで試してね。',
    kibishime: '申し訳ない、今は相談に乗れません。あとで試してください。',
    amayama: 'ごめんね、今は相談に乗れないんだ。あとで試してね。',
    naruse: '今は相談に乗れん。あとで試せ。',
  },
  ai_empty: {
    tsundere: 'ごめん、ちょっと考えがまとまらなかった。もう一度聞いてくれる？',
    kibishime: '申し訳ない。もう一度送ってください。',
    amayama: 'ごめんね、ちょっと考えがまとまらなかった。もう一度聞いてくれる？',
    naruse: 'フッ、今回は不発だった。もう一度言ってみろ。',
  },
  prediction_failed: {
    tsundere: '今日の体調予想ができなかったわ。あとで試してね。',
    kibishime: '今日の体調予想ができませんでした。あとで試してください。',
    amayama: '今日の体調予想ができなかったんだ。あとで試してね。',
    naruse: '体調予想は今回は不可能だ。あとで試せ。',
  },
  reminder_from: {
    tsundere: 'オネエより',
    kibishime: '相棒より',
    amayama: '相棒より',
    naruse: '成瀬より',
  },
};

function resolvePersonality(personality: string | null | undefined): AiPersonality {
  return VALID.includes(personality as AiPersonality) ? (personality as AiPersonality) : 'tsundere';
}

/**
 * フォールバックメッセージを取得。
 * personality が null/不正の場合は tsundere にフォールバック。
 */
export type LineFallbackKey =
  | 'message_too_long'
  | 'link_complete'
  | 'recorded'
  | 'open_app'
  | 'api_unavailable'
  | 'ai_empty'
  | 'prediction_failed'
  | 'reminder_from';

export function getLineFallback(
  key: LineFallbackKey,
  personality: string | null | undefined
): string {
  const p = resolvePersonality(personality);
  return MESSAGES[key][p];
}
