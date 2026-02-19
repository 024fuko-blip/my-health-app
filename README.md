# my-health-app

IBD・ボディメイク管理アプリ（Next.js + Google Cloud Run）

## 開発方針

**本番環境でのみ開発**します。ローカルサーバーは使用しません。

1. コードを編集
2. `git push origin main` でデプロイ
3. 本番 URL で動作確認

## リンク

| 環境 | URL |
|------|-----|
| **本番 (Cloud Run)** | [https://my-health-apps-16867512037.asia-northeast2.run.app](https://my-health-apps-16867512037.asia-northeast2.run.app) |

## 技術スタック

- **Frontend**: Next.js (App Router), TypeScript, Tailwind CSS
- **Backend**: Google Cloud SQL (PostgreSQL) + Prisma
- **認証**: NextAuth + Google OAuth
- **AI**: OpenAI API (gpt-4o-mini)
- **環境変数**: Google Secret Manager（本番）

## 主なスクリプト

| コマンド | 説明 |
|----------|------|
| `npm run build` | 本番ビルド（Cloud Build でも実行） |
| `npm run setup-secrets` | .env.local の値を Secret Manager に登録 |
| `npm run grant-secret-access` | Cloud Run に Secret Manager アクセス権を付与 |
| `npm run test` | テスト実行 |

## デプロイ

main ブランチへ push すると Cloud Build が自動でビルド・デプロイする。

詳細は [.cursor/rules/deploy-production.mdc](.cursor/rules/deploy-production.mdc) を参照。
