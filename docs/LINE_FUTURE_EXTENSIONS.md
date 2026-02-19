# LINE 連携の将来拡張案

LINE からアプリの機能を操作・記録する拡張の設計メモ。

## 実現可能な拡張

| 機能 | 実現方法 | 難易度 |
|------|----------|--------|
| **時間の変更** | 「朝を9時にして」「服薬時間を変更」などのメッセージを webhook で受け取り、コマンド解析 → `medicationReminderTimes` を更新 | 中 |
| **体調相談** | 相談テキストを webhook で受け取り、`/api/advice` 相当のプロンプトで AI に投げて返信 | 低 |
| **健康記録（テキスト）** | ✅ 既存実装（「体調4」「食事: サラダ」「記録 メモ」） | 済 |
| **健康記録（写真）** | 画像メッセージ受信 → LINE Content API で画像バイナリ取得 → GPT-4o Vision で分析 → `health_logs` に `meal_description` 等を保存 | 中 |

## 写真で記録の流れ

1. ユーザーが LINE で食事や体調メモの写真を送信
2. Webhook が `message.type === 'image'` のイベントを受信
3. `event.message.id` で LINE Content API (`GET /v2/bot/message/{messageId}/content`) を呼び出し、画像バイナリを取得
4. 画像を base64 に変換し、既存の `/api/advice` と同様に GPT-4o Vision に送信
5. AI が食事内容・栄養・体調関連のメモを抽出
6. `prisma.healthLog.upsert` で当日の記録を更新
7. LINE に「記録しておいたわ」と返信

## セキュリティ

- 画像受信は LINE 連携済み（`LineLink` で紐づいた）ユーザーのみ対象
- AI が生成した内容は必ずユーザー確認なしで DB に書き込むのではなく、返信時に「〇〇として記録するね、OK？」と確認フローを入れるか、または「記録した」と伝えるかの運用を検討

## 参照

- [LINE Messaging API - 画像メッセージ](https://developers.line.biz/ja/docs/messaging-api/receiving-messages/#image-message-event)
- [LINE Content API](https://developers.line.biz/ja/reference/messaging-api/#get-content)
