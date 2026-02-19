/**
 * LINE Messaging API のメッセージ生成ヘルパー。
 * ボタン・Quick Reply 付きメッセージ。
 */

import { getServerEnv } from './env';

export function getAppBaseUrl(): string {
  const url = getServerEnv().NEXTAUTH_URL ?? '';
  return url.replace(/\/$/, '');
}

/** 初回挨拶（follow 時）の使い方メッセージ */
export function buildWelcomeMessage(): { type: 'text'; text: string } {
  return {
    type: 'text',
    text: `こんにちは！健康管理アプリの相棒よ。

📌 【使い方】
1️⃣ アプリで「連携する」→ 表示された6桁コードを「連携 123456」のように送ってね
2️⃣ 記録: 「記録」「体調4」「食事: サラダ」などでその日の記録ができるわ
3️⃣ 相談: 何でも聞いて。既往歴や薬の情報を踏まえて相棒が答えるわ

下のボタンからアプリを開けるわよ 👇`,
  };
}

/** ボタン付きテンプレート（今日の記録・ペット・相談） */
export function buildWelcomeButtons() {
  const base = getAppBaseUrl();
  return {
    type: 'template' as const,
    altText: 'メニュー',
    template: {
      type: 'buttons' as const,
      text: '何をしましょうか？',
      actions: [
        { type: 'uri' as const, label: '📝 今日の記録', uri: `${base}/record` },
        { type: 'uri' as const, label: '🐱 ペットを見る', uri: `${base}/game/pet` },
        { type: 'message' as const, label: '💬 相談する', text: '相談したいことがあります' },
      ],
    },
  };
}

/** Quick Reply（今日の記録・ペット・記録する） */
export function buildQuickReplyItems() {
  const base = getAppBaseUrl();
  return [
    { type: 'action' as const, action: { type: 'uri' as const, label: '今日の記録', uri: `${base}/record` } },
    { type: 'action' as const, action: { type: 'uri' as const, label: 'ペット', uri: `${base}/game/pet` } },
    { type: 'action' as const, action: { type: 'message' as const, label: '記録する', text: '記録' } },
  ];
}
