# 進捗レポート

**更新日**: 2025年2月19日

---

## 0. LINE 連携 進捗

### 0.1 実装済み

| 機能 | 状態 | 補足 |
|------|------|------|
| LINE Messaging API 接続 | ✅ 完了 | `lib/line.ts`（sendLinePush, getLineConfig） |
| Webhook（友だち追加・メッセージ） | ✅ 完了 | `/api/line/webhook`、署名検証あり |
| 連携フロー（コード発行・解除） | ✅ 完了 | link-request, status, unlink API |
| 設定UI（LineLinkCard） | ✅ 完了 | 連携する／解除ボタン |
| 友だち追加URL（ランタイム env） | ✅ 完了 | `/api/line/add-friend-url`、Cloud Run で設定可 |
| 「連携する」押下で友だち追加画面を自動表示 | ✅ 完了 | `LINE_BOT_BASIC_ID` / `LINE_ADD_FRIEND_URL` 設定時 |
| 服薬リマインダー（LINE） | ✅ 完了 | Cron が LINE 連携ユーザーに送信 |
| 検診リマインダー（LINE） | ✅ 完了 | 8時台、予定日が今日の対象に送信 |
| LINE チャットからの記録 | ✅ 完了 | 「体調4」「食事: サラダ」「記録 メモ」で保存 |

### 0.2 未実装・検討中

| 機能 | 状態 | 備考 |
|------|------|------|
| 記入リマインダー | ⏳ 未実装 | 今日の記録が未記入のユーザーへの通知（例: 18時〜20時） |
| 毎朝のAI助言 | ⏳ 未実装 | 朝（例: 7〜8時）に「今日のAIコメント」を LINE で配信 |
| LINE のみユーザーへのリマインド | ⚠️ 要検討 | 現在 Cron は push 登録ユーザーのみループ。LINE のみのユーザーは対象外 |

### 0.3 必要な環境変数（Cloud Run）

| 変数 | 用途 |
|------|------|
| LINE_CHANNEL_ID | Messaging API |
| LINE_CHANNEL_SECRET | 署名検証 |
| LINE_CHANNEL_ACCESS_TOKEN | プッシュ送信 |
| LINE_BOT_BASIC_ID または LINE_ADD_FRIEND_URL | 友だち追加ボタン（ランタイム） |
| CRON_SECRET | Cron 呼び出しの認証 |

**Webhook URL**: `https://本番URL/api/line/webhook` を LINE Developers に設定。

---

## 1. 全ファイル500行前後へのリファクタリング

### 1.1 対象ファイルと現状

| ファイル | 行数 | 目標 | ステータス |
|----------|------|------|------------|
| **useRecordForm.ts** | 494 | ≤500 | ✅ 達成 |
| **game/pet/page.tsx** | 541 | ≤500 | ⏳ 未着手 |
| package-lock.json | 約9000 | — | 除外（自動生成のため手動編集不可） |

### 1.2 useRecordForm.ts の対応内容（619行→494行）

以下のモジュールへ分割して行数を削減：

| 抽出先 | 内容 | 行数 |
|--------|------|------|
| `hooks/record-form-types.ts` | HealthLogRow, UserSettingsMode, NutritionData | 39 |
| `hooks/record-form-utils.ts` | applyLogToForm | 139 |
| `hooks/meal-image-handler.ts` | processMealImageFile（食事画像処理） | 80 |

### 1.3 残タスク

- **game/pet/page.tsx**（541行）：500行以下にするため、コンポーネント・フック・型などの分割が必要

---

## 2. ビルド・テスト

| 項目 | 結果 |
|------|------|
| `npm run build` | ✅ 成功 |
| `npm run test` | 要確認 |

---

## 3. 500行を超えるファイル一覧（現時点）

- `game/pet/page.tsx` … 541行

---

## 4. 参考：全ソースファイルの行数（主要）

**TS/TSX:**
- record/page.tsx: 219
- record/hooks/useRecordForm.ts: 494
- game/pet/page.tsx: 541 ← 次に対象
- calendar/page.tsx: 409
- dashboard/page.tsx: 307
- settings/health/page.tsx: 310
- その他: 200行以下
