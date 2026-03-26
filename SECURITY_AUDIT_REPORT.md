# セキュリティ監査レポート

**プロジェクト**: my-health-app  
**監査日**: 2025年2月12日  
**対象**: 認証・認可、API、環境変数、依存関係、ヘッダー設定、設定ミス

---

## 1. サマリー

| 区分 | 件数 |
|------|------|
| 重大 (Critical) | 0 |
| 高 (High) | 5 |
| 中 (Medium) | 3 |
| 低 (Low) | 4 |
| 情報 (Info) | 2 |

**総合評価**: 設計方針（認証・認可、環境変数、機密情報の扱い）は適切だが、**依存関係の脆弱性**と**セキュリティヘッダー未設定**が課題。優先的に対応すべき項目を要対応に示す。

---

## 2. 実施した確認項目

- 認証・認可フロー（NextAuth, middleware）
- 全 API ルートのアクセス制御・IDOR 対策
- 環境変数・シークレットの取り扱い
- LINE Webhook 署名検証
- Cron API の保護
- XSS / SQL インジェクション / 危険な API の有無
- npm audit
- セキュリティヘッダー

---

## 3. 良かった点（評価済み）

| 項目 | 内容 |
|------|------|
| 認証 | NextAuth + Google OAuth。API は `getSession()` で統一チェック |
| 認可 | 全 API が `session.userId` で DB クエリしており、クライアントの userId を信用していない（IDOR 対策） |
| 環境変数 | `process.env` 直接参照禁止。`lib/env.ts` の `getServerEnv()` 経由で一括管理 |
| 機密情報 | 既往歴・服薬・モードなどは DB から取得し、POST body から受け取らない |
| LINE Webhook | 署名検証（HMAC-SHA256）を実施 |
| Cron API | `X-Cron-Secret` で CRON_SECRET と照合して保護 |
| Middleware | セッション Cookie の存在のみで判定（JWT 検証なし）方針に従っている |
| XSS | `dangerouslySetInnerHTML` / `eval` / `innerHTML` 未使用 |
| Raw SQL | `prisma.$executeRaw` は tagged template でパラメータ化されており SQL インジェクション対策済み |

---

## 4. 高 (High) の発見事項

### 4.1 Next.js の既知脆弱性（npm audit）

**影響**: DoS、リモートコード実行のリスク

- **GHSA-9g9p-9gw9-jx7f**: Image Optimizer の `remotePatterns` 設定による DoS
- **GHSA-h25m-26qc-wcjf**: 不安全な React Server Components による HTTP リクエストのデシリアライゼーション DoS
- **GHSA-5f7q-jpqc-wp7h**: PPR Resume エンドポイントによる無制限メモリ消費

**推奨**:
```bash
npm audit fix --force  #  breaking change のため要動作確認
# または
npm update next  # 互換の範囲でアップデート
```

### 4.2 minimatch の ReDoS (High)

**影響**: ESLint 系の依存関係経由。ビルド・Lint 時に ReDoS のリスク

**推奨**: ESLint / typescript-eslint のバージョンアップで解消を検討。`npm audit fix --force` は breaking change を伴うため、段階的アップデートを推奨。

### 4.3 `/api/analyze-meal` が Middleware の認証対象外

**影響**: 軽微。ルート内で `getSession()` を実施しているため未認証は 401 となるが、一貫性のため Middleware の `isAuthRequired` に含めることを推奨。

**推奨（middleware.ts）**:
```ts
pathname.startsWith('/api/analyze-meal') ||
```

### 4.4 Content-Security-Policy / セキュリティヘッダー未設定

**影響**: XSS の影響拡大、クリックジャッキング等のリスク

**推奨**: `next.config.ts` でヘッダーを追加:
```ts
headers: async () => [
  {
    source: '/:path*',
    headers: [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ],
  },
],
```

CSP は既存の外部スクリプト・LINE 埋め込み等を確認したうえで段階的に導入。

### 4.5 `allowDangerousEmailAccountLinking: true`

**影響**: 同一メールアドレスで別プロバイダのアカウントが自動リンクされ、アカウント乗っ取りのリスクが増加

**推奨**: 本当に必要でなければ `false` に変更。リンクが必要な場合は、利用規約・注意喚起とあわせて慎重に運用。

---

## 5. 中 (Medium) の発見事項

### 5.1 ajv の ReDoS (moderate)

**影響**: ESLint の ajv 経由。ビルド時のリスク

**推奨**: ESLint 系を更新して解消（4.2 と同様）。

### 5.2 `typescript.ignoreBuildErrors: true`

**影響**: 型エラーをビルドで検出できず、潜在的なバグやセキュリティ脆弱性を見逃す可能性

**推奨**: 段階的に `false` に戻し、型エラーを修正する運用を推奨。

### 5.3 Server Actions `bodySizeLimit: '4mb'`

**影響**: 4MB までの POST を受け付けるため、DoS（大きなペイロードの連続送信）のリスク

**推奨**: 食事画像等の用途を考慮しつつ、必要最小限の値に制限（例: 2MB）。外部からの無制限送信は避ける。

---

## 6. 低 (Low) の発見事項

### 6.1 レートリミット未実装

**影響**: ブルートフォースや DoS 攻撃のしやすさ

**推奨**: 認証・AI 相談・LINE などの重要 API にレートリミットを検討（例: `@upstash/ratelimit` または Cloud Run 側の制限）。

### 6.2 ログ出力の機密情報

**影響**: `console.error` 等でスタックや環境依存情報が漏れる可能性

**推奨**: 本番では本番用ログミドルウェアを使用し、スタックトレースやシークレットを含むログを出さないよう制御。

### 6.3 LINE Webhook のタイムアウト

**影響**: LINE プラットフォームのタイムアウト内に応答しないと、再送・エラーになる可能性

**現状**: 非同期処理や外部 API 呼び出しの遅延に注意。必要に応じてタイムアウトやキューの導入を検討。

### 6.4 CRON_SECRET の強度

**影響**: 短い・推測可能な文字列だと漏洩時に悪用されやすい

**推奨**: 32 文字以上のランダム文字列（`openssl rand -hex 32` 等）を使用。

---

## 7. 情報 (Info)

### 7.1 Prisma `binaryTargets` の設定

**内容**: `linux-musl`, `linux-musl-openssl-3.0.x` が既に指定されており、Cloud Run でのバイナリ互換が取れている。

### 7.2 `.env` が git 管理外

**内容**: `.gitignore` で `.env*` が除外されており、環境変数ファイルのコミットは防止されている。

---

## 8. 対応優先度マトリクス

| 優先度 | 項目 | 工数 |
|--------|------|------|
| 1 | Next.js の脆弱性対応（npm update / audit fix） | 中 |
| 2 | セキュリティヘッダー追加 | 小 |
| 3 | `allowDangerousEmailAccountLinking` の見直し | 小 |
| 4 | `/api/analyze-meal` を Middleware に追加 | 小 |
| 5 | Server Actions bodySizeLimit の見直し | 小 |
| 6 | レートリミットの検討 | 中〜大 |
| 7 | `ignoreBuildErrors` の段階的解除 | 大 |

---

## 9. 再監査の目安

- 脆弱性対応・ヘッダー追加実施後
- 新規外部連携（LINE 以外）導入時
- 認証方式・権限モデル変更時

2026年2月19日確認：ESLint 10.0.0 においても ajv 6.12.4 への依存が継続されていることを確認。本件はエコシステム全体の問題であり、個別対応は困難かつ本番影響なしと判断し、引き続き許容とする。

---

*本レポートは静的解析と手動確認に基づく。ペネトレーションテストや外部スキャンは別途実施推奨。*
