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
ARG DATABASE_URL
ARG AUTH_SECRET
ARG NEXTAUTH_SECRET

# 2. 環境変数としてビルドプロセスに公開
#    （Next.js の build がこれらを参照して型チェック・最適化を行う）
ENV DATABASE_URL=$DATABASE_URL
ENV AUTH_SECRET=$AUTH_SECRET
ENV NEXTAUTH_SECRET=$NEXTAUTH_SECRET

# 3. ビルド実行
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 3: 本番ランタイム
# -----------------------------------------------------------------------------
# AUTH_SECRET, DATABASE_URL 等はコンテナ実行時に渡す（Cloud Run の環境変数など）。
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
