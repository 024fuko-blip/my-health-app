# -----------------------------------------------------------------------------
# Stage 1: 依存関係のインストール
# -----------------------------------------------------------------------------
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# -----------------------------------------------------------------------------
# Stage 2: ビルド
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1

# 1. ビルド引数の定義（Cloud Build の --build-arg で注入。値はダミーで可）
ARG DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy
ARG AUTH_SECRET=dummy_secret_for_build_only
ARG GOOGLE_CLIENT_ID=dummy_client_id
ARG GOOGLE_CLIENT_SECRET=dummy_client_secret
ARG NEXTAUTH_URL=http://localhost:3000

# 2. 環境変数としてビルドプロセスに公開（next build 時にモジュールが参照しても落ちないようダミー可）
ENV DATABASE_URL=${DATABASE_URL}
ENV AUTH_SECRET=${AUTH_SECRET}
ENV GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
ENV GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
ENV NEXTAUTH_URL=${NEXTAUTH_URL}
ENV NEXT_PHASE=phase-production-build

# 3. Prisma クライアント生成＆ビルド実行
RUN npx prisma generate
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 3: 本番ランタイム
# -----------------------------------------------------------------------------
# AUTH_SECRET, DATABASE_URL 等はコンテナ実行時に渡す（Cloud Run の環境変数など）。
FROM node:20-alpine AS runner
WORKDIR /app

# Prisma実行に必要なライブラリをインストール
RUN apk add --no-cache libc6-compat openssl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Prismaクライアントをstandaloneのnode_modulesに確実にコピー
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/package.json ./package.json

# 起動時にスキーマをDBに適用（push_subscriptions 等の新規テーブル作成）
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["./docker-entrypoint.sh"]
