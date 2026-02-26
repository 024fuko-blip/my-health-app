# コード監査レポート

**監査日**: 2026-02-26  
**対象**: `my-health-app` 全ソースファイル  
**基準**: セキュリティ / SOLID・DRY / Clean Code / 型定義

---

## 総評

全体的にコード品質は高い。認証・環境変数管理・入力バリデーションは適切に実装されている。
以下3件のバグを検出・修正済み。残りは改善推奨の指摘。

---

## ✅ 問題なし（良好な実装の確認）

| 項目 | 評価 |
|------|------|
| `process.env` 直接参照 | `lib/secrets.ts` と `lib/env.ts` 内の設計上必要な箇所のみ。ルート・ライブラリは全て `getServerEnv()` 経由 ✅ |
| IDOR 脆弱性 | 全 DB クエリに `userId: session.userId` を付加。他ユーザーリソースの取得は不可能 ✅ |
| 認証チェック | 全 API ルートが `withSession()` / `requireSession()` を経由 ✅ |
| 入力バリデーション | Zod スキーマ + `sanitizeDailyInput` ホワイトリストで適切に保護 ✅ |
| Supabase 残骸 | なし ✅ |
| `ignoreBuildErrors` | `false` に設定済み ✅ |
| `any` 乱用 | ソースファイルに `as any` / `: any` なし ✅ |
| LINE 署名検証 | `timingSafeEqual` による定数時間比較 ✅ |
| Cron 保護 | `timingSafeCompare` による `X-Cron-Secret` 検証 ✅ |
| セキュリティヘッダー | X-Frame-Options / CSP / nosniff / Referrer-Policy 設定済み ✅ |

---

## 🔴 High — 修正済み

### 1. `app/api/cron/send-reminders/route.ts` — `continue` による検診リマインダースキップ

**行**: 旧157行目  
**内容**: 服薬が全て完了していた場合に `continue` でループを抜けていたため、
同じユーザーの**検診リマインダーも送信されない**バグ。

```typescript
// Before（バグ）
if (untakenNames.length === 0) continue;  // 次のユーザーへスキップ → 検診リマインダーも飛ばされる

// After（修正済み）
if (untakenNames.length > 0) {
  // 服薬リマインダー送信
  sent += await broadcastToUser(...);
}
// 検診リマインダーは必ず続行
```

---

### 2. `app/api/line/setup-richmenu/route.ts` — `ADMIN_EMAILS` 未設定時に全員が管理操作可能

**行**: 20行目  
**内容**: `ADMIN_EMAILS` が未設定（空）の場合、全認証ユーザーが Rich Menu セットアップを実行できた。
フェイルセーフとして、未設定時は拒否するよう修正。

```typescript
// Before（バグ）: adminEmails が空なら条件がスキップされ誰でも通過
if (adminEmails.length > 0 && !adminEmails.includes(session.email ?? '')) {
  return errorResponse('この操作は管理者のみ実行できます', 403);
}

// After（修正済み）: 未設定なら全員拒否
if (adminEmails.length === 0 || !adminEmails.includes(session.email ?? '')) {
  return errorResponse('この操作は管理者のみ実行できます', 403);
}
```

> **運用上の注意**: 本番環境で Rich Menu セットアップを使うには `ADMIN_EMAILS` を必ず設定してください。

---

### 3. `app/api/health-logs/route.test.ts` — `updateCorrelationStatsAfterLog` の mock 漏れ

**内容**: `route.ts` は `updateStatsAfterLog` と `updateCorrelationStatsAfterLog` の両方を呼ぶが、
テストは前者のみ mock していた。POST テスト実行時に実装が呼ばれ、
未 mock の `prisma.userCorrelationStats.upsert` でエラーが発生する。

```typescript
// After（修正済み）: 追加
vi.mock('@/lib/correlation/save', () => ({
  updateCorrelationStatsAfterLog: vi.fn(),
}));
```

---

## 🟡 Medium — 推奨対応

### 4. `app/api/pet/route.ts` — Prisma スキーマにないフィールドへの型キャスト

**行**: 122, 135行目

```typescript
(pet as { adoptedAt?: Date }).adoptedAt?.toISOString() ?? null,
(pet as { feedCount?: number }).feedCount ?? 0,
((pet as { placedFurniture?: unknown } | null)?.placedFurniture ?? []) as Array<...>
```

`adoptedAt`, `feedCount`, `placedFurniture` が `prisma/schema.prisma` に正式に定義されていれば
型キャストは不要になる。**スキーマとの乖離**が生じているサインであり、
`schema.prisma` にこれらのフィールドを追加してマイグレーションすることを推奨。

---

### 5. `app/api/pet/minigame/route.ts` — `lastMinigameAt` の型キャスト

**行**: 141行目

```typescript
const last = ((pet as { lastMinigameAt?: Record<string, string> }).lastMinigameAt ?? {}) as Record<string, string>;
```

上記と同様、`lastMinigameAt` フィールドを `schema.prisma` に追加し型キャスト不要にする。

---

### 6. `lib/rate-limit.ts` — インスタンスローカルなレート制限

**内容**: レート制限がメモリ内（`Map`）に保持されるため、Cloud Run でインスタンスが複数立つと
各インスタンスで独立してカウントされる（制限が緩くなる）。  
**現状**: AI 系 API で 15〜30 req/min の制限が設定されており、即時危険ではない。  
**長期対策**: Redis や Cloud Memorystore による共有ストアへの移行。

---

## 🔵 Low — 軽微な指摘

### 7. `next.config.ts` — CSP の `'unsafe-inline'`

`script-src 'unsafe-inline'` は XSS 対策を弱める。  
将来的には Next.js の nonce ベース CSP への移行を検討。

---

### 8. `app/api/analyze-meal/route.ts` — セッション引数が未使用

**行**: 30行目

```typescript
withSession(async () => {  // session 引数を使っていない
```

認証自体は機能しているが、`async (_session)` と明示するか、
将来のユーザー別ログ保存のために活用を検討。

---

### 9. `app/api/cron/send-reminders/route.ts` — `todayCheckupsMap` の初期化位置

**行**: 107〜108行目

```typescript
let todayCheckupsMap = new Map<...>();
let tomorrowCheckupsMap = new Map<...>();
if (sendCheckups) {
  // ここで使われる
}
```

`sendCheckups` が `false` の場合は使われないため、`const` として `if` ブロック内に移動すると意図が明確になる。

---

## 修正ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `app/api/cron/send-reminders/route.ts` | `continue` バグ修正（High #1） |
| `app/api/line/setup-richmenu/route.ts` | admin check フェイルセーフ修正（High #2） |
| `app/api/health-logs/route.test.ts` | mock 漏れ追加（High #3） |
