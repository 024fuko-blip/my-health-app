/**
 * LINE Messaging API のメッセージ生成ヘルパー。
 * ボタン・Quick Reply 付きメッセージ。
 */

import { getServerEnv } from './env';

export function getAppBaseUrl(): string {
  const url = getServerEnv().NEXTAUTH_URL ?? '';
  return url.replace(/\/$/, '');
}

/** 初回挨拶（follow 時）の使い方メッセージ。未連携のため口調は中立。 */
export function buildWelcomeMessage(): { type: 'text'; text: string } {
  return {
    type: 'text',
    text: `こんにちは！健康管理アプリの相棒です。

📌 【使い方】
1️⃣ アプリで「連携する」→ 表示された6桁コードを「連携 123456」のように送ってください
2️⃣ 記録: 「記録」「体調4」「食事: サラダ」などでその日の記録ができます
3️⃣ 今日の体調予想: タップするとAIが過去1週間の記録・天気・花粉から今日の体調を予測します

下のボタンからアプリを開けます 👇`,
  };
}

/** ボタン付きテンプレート（記録・体調予想・ペット・分析） */
export function buildWelcomeButtons() {
  const base = getAppBaseUrl();
  return {
    type: 'template' as const,
    altText: 'メニュー',
    template: {
      type: 'buttons' as const,
      text: '何をしましょうか？',
      actions: [
        { type: 'uri' as const, label: '記録', uri: `${base}/record` },
        { type: 'message' as const, label: '今日の体調予想', text: '今日の体調予想' },
        { type: 'uri' as const, label: 'ペット', uri: `${base}/game/pet` },
        { type: 'uri' as const, label: '分析', uri: `${base}/dashboard` },
      ],
    },
  };
}

/** Quick Reply（記録・体調予想・ペット・分析） */
export function buildQuickReplyItems() {
  const base = getAppBaseUrl();
  return [
    { type: 'action' as const, action: { type: 'uri' as const, label: '記録', uri: `${base}/record` } },
    { type: 'action' as const, action: { type: 'message' as const, label: '今日の体調予想', text: '今日の体調予想' } },
    { type: 'action' as const, action: { type: 'uri' as const, label: 'ペット', uri: `${base}/game/pet` } },
    { type: 'action' as const, action: { type: 'uri' as const, label: '分析', uri: `${base}/dashboard` } },
  ];
}
