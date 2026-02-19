# バックアップドキュメント（再構築用）

> 将来プロジェクトが消えても再構築できる状態を目指す。値は記載せず、構造と手順のみ記載。

---

## 1. プロジェクト概要

**my-health-app** は、IBD（炎症性腸疾患）・ボディメイク・アルコール・メンタルなどの健康管理を行うWebアプリである。

- **主な機能**
  - 日々の体調・食事・便・腹痛・睡眠・ストレスなどの記録
  - AI（OpenAI）による健康アドバイス・週間分析（オネエ口調のキャラクター）
  - ペット育成ゲーム（記録連動でポイント獲得・餌購入・着せ替え）
  - LINE連携（Webhook、Rich Menu、おはよう相棒）
  - Web Push通知（服薬・検診リマインダー）
  - 生理・周期管理

- **開発方針**
  - **本番環境でのみ開発**。ローカルサーバー（`npm run dev`）は使用しない。
  - 変更後は `git push` でデプロイし、本番URLで確認する。

---

## 2. 使用技術スタック

| カテゴリ | 技術 |
|----------|------|
| フレームワーク | Next.js 16 (App Router), React 19 |
| 言語 | TypeScript 5 |
| スタイル | Tailwind CSS 4 |
| DB | PostgreSQL (Google Cloud SQL) + Prisma ORM |
| 認証 | NextAuth v4 + Google OAuth |
| AI | OpenAI API (gpt-4o-mini / gpt-4o) |
| ホスティング | Google Cloud Run |
|  secrets | Google Secret Manager |
| ビルド | Cloud Build → Docker → GCR → Cloud Run |
| 通知 | Web Push (web-push), LINE Messaging API |

---

## 3. ディレクトリ構成

```
my-health-app/
├── app/
│   ├── (main)/              # 認証後メイン画面
│   │   ├── calendar/        # カレンダー表示
│   │   ├── dashboard/       # 分析・グラフ
│   │   ├── game/            # ペットゲーム
│   │   ├── record/          # 記録入力
│   │   ├── reminders/       # リマインダー管理
│   │   └── settings/        # 設定（basic, health, profile）
│   ├── (auth)/              # 認証前
│   │   ├── login/
│   │   └── register/
│   ├── api/
│   │   ├── advice/          # AIアドバイス
│   │   ├── analyze-meal/    # 食事画像分析
│   │   ├── auth/[...nextauth]/
│   │   ├── cron/            # send-reminders, send-morning-line
│   │   ├── game-stats/
│   │   ├── health-logs/     # 記録 CRUD, period-status
│   │   ├── line/            # webhook, status, unlink, link-request, add-friend-url, setup-richmenu
│   │   ├── pet/             # ペット GET/POST, buy, feed, outfit
│   │   ├── push-subscribe/
│   │   ├── reminders/       # GET/POST, [id] PATCH/DELETE
│   │   ├── report/          # 週間レポート
│   │   └── user-settings/   # GET/PUT, period PATCH
│   ├── consent/             # 利用規約同意
│   ├── guide/               # 使い方ガイド
│   ├── privacy/             # プライバシーポリシー
│   ├── terms/               # 利用規約
│   ├── layout.tsx
│   ├── globals.css
│   └── providers.tsx
├── lib/
│   ├── api-utils.ts         # parseJsonBody
│   ├── auth.ts              # NextAuth設定, getSession, requireSession
│   ├── env.ts               # getServerEnv, 環境変数スキーマ
│   ├── secrets.ts           # Secret Manager 取得
│   ├── prisma.ts            # Prisma クライアント
│   ├── json-utils.ts        # safeParseJson, toStringOrNull, toNumOrNull
│   ├── date-utils.ts
│   ├── chara-settings.ts    # AI人格プロンプト
│   ├── persona-asuka.ts
│   ├── cycle-phase.ts       # 生理周期
│   ├── medication-schedule.ts
│   ├── alcohol-calc.ts
│   ├── line.ts, line-messages.ts, line-richmenu.ts, line-richmenu-image.ts
│   ├── web-push.ts
│   ├── game-stats.ts, pet-shop.ts
│   └── prefectures.ts
├── types/
│   ├── next-auth.d.ts
│   └── web-push.d.ts
├── prisma/
│   └── schema.prisma
├── scripts/
│   ├── setup-secrets.mjs
│   └── grant-secret-access.mjs
├── middleware.ts
├── instrumentation.ts       # Secret Manager 読み込み・環境検証
├── Dockerfile
├── docker-entrypoint.sh
├── cloudbuild.yaml
├── next.config.ts
├── tsconfig.json
└── package.json
```

---

## 4. データベース構造（PostgreSQL / Prisma）

### 4.1 Prisma 設定

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "linux-musl", "linux-musl-openssl-3.0.x"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 4.2 テーブル一覧

| テーブル名 | 説明 |
|------------|------|
| users | 認証用ユーザー（NextAuth + Google OAuth） |
| accounts | OAuth アカウント（NextAuth） |
| sessions | セッション（NextAuth） |
| verification_tokens | メール検証トークン |
| user_settings | 設定（モード、既往歴、薬、AI人格など） |
| health_logs | 日々の健康記録 |
| user_game_stats | ゲームポイント・連続記録・バッジ |
| user_pets | ペット情報 |
| user_pet_inventory | ペット所持アイテム |
| checkup_reminders | 検診リマインダー |
| push_subscriptions | Web Push 購読 |
| line_links | LINE 連携 |
| line_link_requests | LINE 連携リクエスト（ワンタイムコード） |

### 4.3 主要テーブル定義

**health_logs**
- `id`, `user_id`, `date` (unique per user)
- `memo`, `medication_taken`, `general_mood`, `meal_description`, `period_status`
- `ai_comment`, `pain_level`, `stool_type`
- `alcohol_amount`, `alcohol_percent`, `alcohol_type`
- `stress_level`, `sleep_quality`, `spending`
- `weight`, `body_fat`, `calories`, `protein`, `steps`, `exercise_minutes`
- `created_at`, `updated_at`

**user_settings**
- `user_id` (unique)
- `mode_ibd`, `mode_alcohol`, `mode_mental`, `mode_diet`
- `medical_history`, `current_medications`, `medication_reminder_times`
- `gender`, `ai_personality`, `profile_name`, `birth_date`
- `height`, `weight`, `prefecture`, `latitude`, `longitude`

**user_pets**
- `user_id` (unique)
- `pet_name`, `pet_species`, `happiness`, `last_fed_at`, `current_outfit_id`
- `level`, `exp_points`, `adopted_at`, `feed_count`

**user_game_stats**
- `user_id` (unique)
- `total_points`, `current_streak`, `longest_streak`, `last_record_date`, `earned_badges` (JSON)

**push_subscriptions**
- `user_id`, `endpoint`, `p256dh`, `auth` (unique: user_id + endpoint)

---

## 5. 必要な環境変数一覧

> 値は記載しない。`.env.example` や Cloud Run / Secret Manager で管理。

### 必須

| 変数名 | 説明 |
|--------|------|
| AUTH_SECRET | NextAuth シークレット |
| DATABASE_URL | PostgreSQL 接続URL（Cloud SQL 経由） |
| GOOGLE_CLIENT_ID | Google OAuth クライアントID |
| GOOGLE_CLIENT_SECRET | Google OAuth シークレット |
| NEXTAUTH_URL | 本番URL（例: https://xxx.run.app） |

### AI

| 変数名 | 説明 |
|--------|------|
| OPENAI_API_KEY | OpenAI API キー |

### LINE 連携

| 変数名 | 説明 |
|--------|------|
| LINE_CHANNEL_ID | Messaging API チャネルID |
| LINE_CHANNEL_SECRET | Messaging API シークレット |
| LINE_CHANNEL_ACCESS_TOKEN | チャネルアクセストークン |
| LINE_BOT_BASIC_ID | Basic ID（友だち追加URL用） |
| LINE_ADD_FRIEND_URL | 友だち追加URL（代替） |

### プッシュ通知

| 変数名 | 説明 |
|--------|------|
| VAPID_PUBLIC_KEY | Web Push 公開鍵 |
| VAPID_PRIVATE_KEY | Web Push 秘密鍵 |
| CRON_SECRET | Cron API 認証用（Cloud Scheduler で X-Cron-Secret に設定） |

### オプション

| 変数名 | 説明 |
|--------|------|
| USE_SECRET_MANAGER | `false` にすると Secret Manager を無効化 |
| GOOGLE_CLOUD_PROJECT | GCP プロジェクトID（未設定時はメタデータから取得） |

---

## 6. デプロイ方法

### 6.1 自動デプロイ（推奨）

- `main` ブランチへ `git push` すると Cloud Build が自動実行
- トリガー: `^main$`、構成: `cloudbuild.yaml`
- リージョン: `asia-northeast2`（大阪）
- プロジェクトID: `my-health-app-485805`
- サービス名: `my-health-apps`
- URL 例: `https://my-health-apps-16867512037.asia-northeast2.run.app`

### 6.2 Cloud Build の流れ

1. Docker ビルド（`--build-arg` でダミー値を注入）
2. GCR へイメージ push
3. Cloud Run へデプロイ（Cloud SQL インスタンス接続付き）

### 6.3 手動デプロイ

```bash
gcloud run deploy my-health-apps \
  --project my-health-app-485805 \
  --source . \
  --region asia-northeast2 \
  --allow-unauthenticated \
  --add-cloudsql-instances my-health-app-485805:asia-northeast2:my-health-db
```

環境変数は `--set-env-vars` か Cloud Run 画面で設定。

### 6.4 Secret Manager 設定（本番）

```bash
gcloud auth application-default login
npm run setup-secrets     # .env.local から Secret Manager に登録
npm run grant-secret-access  # Cloud Run に権限付与
```

### 6.5 Cloud Scheduler（定期実行）

| ジョブ | 頻度 | URL |
|--------|------|-----|
| send-reminders | `*/15 * * * *` | `/api/cron/send-reminders` |
| send-morning-line | `0 22 * * *` (UTC) | `/api/cron/send-morning-line` |

両方とも `X-Cron-Secret` ヘッダーで認証。

---

## 7. 主要依存関係（package.json）

### dependencies

```json
{
  "@google-cloud/secret-manager": "^5.5.0",
  "@next-auth/prisma-adapter": "^1.0.7",
  "@prisma/client": "^5.10.2",
  "next": "^16.1.6",
  "next-auth": "^4.24.13",
  "openai": "^6.16.0",
  "react": "19.2.3",
  "react-dom": "19.2.3",
  "recharts": "^3.7.0",
  "sharp": "^0.34.5",
  "web-push": "^3.6.7"
}
```

### devDependencies

```json
{
  "@tailwindcss/postcss": "^4",
  "@types/node": "^20",
  "@types/react": "^19",
  "@types/react-dom": "^19",
  "@vitejs/plugin-react": "^5.1.4",
  "eslint": "^9",
  "eslint-config-next": "^16.1.6",
  "prisma": "^5.10.2",
  "tailwindcss": "^4",
  "typescript": "^5",
  "vitest": "^4.0.18"
}
```

### scripts

```json
{
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest run",
  "test:watch": "vitest",
  "postinstall": "prisma generate",
  "setup-secrets": "node scripts/setup-secrets.mjs",
  "grant-secret-access": "node scripts/grant-secret-access.mjs"
}
```

※ `npm run dev` は使用しない（本番でのみ開発の方針）。

---

## 8. 今後の改善ポイント（コードから読み取れる範囲）

1. **LINE Webhook URL の更新**: 本番URLが変わった場合は LINE Developers の Webhook URL を更新する必要あり
2. **Prisma マイグレーション**: スキーマ変更時は `npx prisma db push` または `npx prisma migrate deploy` を実行
3. **middleware 非推奨**: Next.js の「proxy」への移行検討（メッセージあり）
4. **型安全性**: 現在 `ignoreBuildErrors: false` で型チェック有効。新規コードでも any を避け型を厳密に
5. **環境変数**: `process.env` 直接参照禁止。`getServerEnv()` 経由のみ
6. **認証**: API では `requireSession()` を使用し、未認証は 401 を返す
7. **食事画像アップロード**: 将来的にこのリポジトリ側に追加する想定
8. **AI 人格**: キャラ設定（あすか・ツンデレ・あまあま・イケメン）の口調は変更・削除しない方針

---

## 9. 再構築時のチェックリスト

- [ ] Node.js 20 以上を用意
- [ ] GCP プロジェクト作成（Cloud SQL, Cloud Run, Secret Manager）
- [ ] PostgreSQL（Cloud SQL）インスタンス作成
- [ ] GitHub リポジトリ接続
- [ ] Cloud Build トリガー設定（main, cloudbuild.yaml）
- [ ] Secret Manager に環境変数登録
- [ ] Google OAuth クライアント作成、リダイレクトURI設定
- [ ] LINE Messaging API チャネル作成（任意）
- [ ] Cloud Scheduler ジョブ作成（任意）
- [ ] `npm ci` → `npx prisma generate` → `npm run build`
- [ ] 初回デプロイ後、DB マイグレーション（必要な場合）

---

*最終更新: 本ドキュメント作成時点のコードベースに基づく*
