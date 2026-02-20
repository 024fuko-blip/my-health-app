# コード監査レポート：Security / DRY / Clean Code / Types

## 1. Security

### ✅ 問題なし
- **process.env**: `app` 配下に直接参照なし。`lib/env.ts` / `lib/secrets.ts` のみ使用
- **認証**: 全 API ルートが `withSession` で保護、`session.userId` でスコープ
- **IDOR**: `reminders/[id]`, `health-logs` の PATCH/DELETE はすべて `userId` でフィルタ済み
- **Cron**: `X-Cron-Secret` で CRON_SECRET 照合
- **LINE Webhook**: HMAC-SHA256 署名検証実施
- **ignoreBuildErrors**: `false` に設定済み

### ⚠️ 軽微な改善候補

| 項目 | 場所 | 内容 |
|------|------|------|
| meal_image_base64 サイズ制限 | advice/route.ts, health-logs | Base64 画像が巨大な場合の DoS を防ぐため、長さ制限（例: 2MB 相当）の検証を追加推奨 |
| parseJsonBody 型安全性 | lib/api-utils.ts | 現状 `as T` でキャストしており、実際の body 形状を検証していない。必須フィールドのバリデーションは各ルートで個別実施済み |

---

## 2. DRY（重複の排除）

### 2.1 認証付き fetch パターンの重複

**現状**: 複数コンポーネントで以下が重複している。

```ts
const sessionRes = await fetch('/api/auth/session', { credentials: 'include' });
const sessionData = await sessionRes.json();
if (!sessionData.user) return;  // または router.replace('/login')
```

**該当箇所**:
- `useRecordForm.ts` (init, handleSubmit)
- `dashboard/page.tsx`
- `calendar/page.tsx`
- `settings/basic/page.tsx`, `settings/health/page.tsx`, `settings/profile/page.tsx`
- `reminders/page.tsx`
- `game/page.tsx`, `game/pet/page.tsx`

**改善案**: `lib/api-client.ts` に `fetchWithAuth` を追加し、セッションチェック＋未認証時リダイレクトを共通化。

---

### 2.2 API fetch の共通オプション

**現状**: 各所で `credentials: 'include'` と `headers: { 'Content-Type': 'application/json' }` を毎回指定。

**改善案**: `lib/api-client.ts` のラッパーでデフォルト付与。

---

### 2.3 401 エラーハンドリングの重複

**現状**: `useRecordForm` の handleSubmit などで以下が重複。

```ts
if (saveRes.status === 401) {
  alert('セッションが切れました。再度ログインしてください。');
  router.replace('/login');
  return;
}
```

**改善案**: 共通ラッパーで 401 時にリダイレクト＋アラートを一括処理。

---

## 3. Clean Code

### 3.1 handleSubmit が長すぎる（約 115 行）

**場所**: `app/(main)/record/hooks/useRecordForm.ts` L327–439

**問題**: 1 関数に「セッション確認 → AI 呼び出し → payload 組み立て → 保存 → 結果処理」が詰め込まれている。

**改善案**: 以下のように分割する。

```ts
// 1. payload 組み立てを抽出
function buildRecordPayload(params: { date, memo, ... }): Record<string, unknown>

// 2. AI アドバイス取得を抽出
async function fetchAiAdvice(params: { mealDescription, ... }): Promise<string>

// 3. handleSubmit はこれらを呼び出すだけ
const handleSubmit = async (e) => {
  e.preventDefault();
  const session = await ensureSession(router); if (!session) return;
  const aiComment = await fetchAiAdvice({ ... });
  const payload = buildRecordPayload({ ... });
  await saveAndShowResult(payload, aiComment);
};
```

---

### 3.2 applyLog の setter 引数が多すぎる

**場所**: `record-form-utils.ts` の `applyLogToForm`、`useRecordForm` の `applyLog`

**現状**: 約 20 個の setter を個別に渡している。

**改善案**: Object にまとめる（すでに `ApplyLogSetters` 型があるので、呼び出し側を簡潔にできる）。

```ts
const setters: ApplyLogSetters = {
  setPreviousAlcoholSummary, setMemo, setMedicationTaken, ...
};
applyLogToForm(log, medications, setters);
```

→ 現状もほぼ同様。問題は `useRecordForm` 内で 20 行以上書いている点。オブジェクトリテラルでまとめれば可読性向上。

---

### 3.3 user-settings の toApiShape デフォルト値の重複

**場所**: `app/api/user-settings/route.ts` L67–84

**問題**: `!row` のときのデフォルト値が長いオブジェクトリテラルでハードコードされている。

**改善案**: `DEFAULT_USER_SETTINGS` 定数を定義し、`toApiShape` の引数で使うか、`row ?? DEFAULT_ROW` で共通化。

---

## 4. Types

### ✅ 概ね良好
- `any` は未使用
- `ignoreBuildErrors: false` で厳格

### ⚠️ 改善候補

| 項目 | 場所 | 内容 |
|------|------|------|
| HealthLogRow の重複定義 | dashboard, calendar, record-form-types | 複数箇所で似た型が定義されている。`record-form-types` を唯一の定義元にし、他から import |
| parseJsonBody の T | lib/api-utils.ts | 呼び出し側で `parseJsonBody<Record<string, unknown>>` と汎用的に使っている箇所あり。各 API で具体的な型を指定すると型安全性向上 |

---

## 5. 修正の優先度と実装方針

### 高優先度（推奨）
1. **handleSubmit の分割** - 可読性・テスト容易性の向上
2. **fetchWithAuth の共通化** - DRY と認証フローの一貫性

### 中優先度
3. **HealthLogRow 型の統一** - 型の一元管理
4. **user-settings の DEFAULT 定数** - 重複削減

### 低優先度
5. meal_image_base64 のサイズ制限
6. parseJsonBody の型を各 API で具体化

---

## 6. 実装した修正（本監査で実施）

| 項目 | 内容 |
|------|------|
| lib/api-client.ts 新規 | `ensureSession`, `apiPost`, `apiFetch`, `handleUnauthorized` を追加。認証チェック・401 処理を共通化 |
| useRecordForm handleSubmit | `fetchAiAdvice`, `buildRecordPayload` に分割。ensureSession / apiPost / handleUnauthorized を使用 |
| useRecordForm init | ensureSession, apiFetch を使用 |
| dashboard/page.tsx | `HealthLogApiResponse`, `UserSettingsMode` を record-form-types から import。重複型定義を削除 |
| user-settings/route.ts | `DEFAULT_USER_SETTINGS` 定数を追加し、長いデフォルトオブジェクトを共通化 |
| advice/route.ts | meal_image_base64 の最大長 3MB 制限を追加（DoS 防止） |
