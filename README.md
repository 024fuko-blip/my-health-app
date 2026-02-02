This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 技術スタック

- **Frontend**: Next.js (App Router), TypeScript, Tailwind CSS
- **Backend**: Google Cloud SQL (PostgreSQL) + Prisma
- **認証**: NextAuth + Google OAuth（`lib/auth.ts`）
- **AI**: OpenAI API (gpt-4o-mini)

環境変数: `DATABASE_URL`（Google Cloud SQL）、`AUTH_SECRET`、`GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`、`NEXTAUTH_URL`、任意で `OPENAI_API_KEY`。

## 環境変数一覧

| 変数 | 必須 | 用途 |
|------|------|------|
| `AUTH_SECRET` | ✅ | NextAuth セッション JWT の署名（本番は長いランダム文字列を推奨） |
| `DATABASE_URL` | ✅ | Prisma 用 DB 接続文字列（Google Cloud SQL: `postgresql://user:pass@/db?host=/cloudsql/PROJECT:REGION:INSTANCE` 等） |
| `GOOGLE_CLIENT_ID` | ✅ | Google OAuth クライアント ID |
| `GOOGLE_CLIENT_SECRET` | ✅ | Google OAuth クライアントシークレット |
| `NEXTAUTH_URL` | ✅ | アプリの URL（本番: `https://your-service.run.app`） |
| `OPENAI_API_KEY` | 任意 | AI アドバイス用（未設定時は API が 503 を返す） |

## デプロイ（Cloud Run）

- **ビルド**: `cloudbuild.yaml` の `--build-arg` でダミー値を渡しているため、Cloud Build のビルドはそのままで成功します。
- **実行時**: Cloud Run で **必ず** 上記の必須環境変数（`AUTH_SECRET`、`DATABASE_URL`、`GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`、`NEXTAUTH_URL`）を設定してください。未設定だとコンテナ起動時に `validateRuntimeEnv()` がエラーで終了します。
  - コンソール: Cloud Run → サービス → 編集 → 変数とシークレット
  - または `gcloud run deploy ... --set-env-vars AUTH_SECRET=xxx,DATABASE_URL=...,GOOGLE_CLIENT_ID=...,GOOGLE_CLIENT_SECRET=...,NEXTAUTH_URL=https://...`

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
