# コードレビュー報告書（セキュリティ / SOLID・DRY / Clean Code / Types）

## 1. セキュリティ (Security)

### 1.1 ✅ process.env の直接参照

| ファイル | 状況 |
|----------|------|
| `lib/env.ts` | ビルド時判定・ダミー値用。許容 |
| `lib/secrets.ts` | Secret Manager フォールバック用。許容 |
| `instrumentation.ts` | ログメッセージ内のみ。許容 |
| **app/api/** |  direct 参照なし。`getServerEnv()` 経由で統一 |

**結論**: プロジェクトルール準拠。追加対応不要。

---

### 1.2 ✅ 認証チェック

- API ルートはすべて `withSession` / `requireSession` を使用
- DB アクセスは `session.userId` でフィルタ（IDOR 対策済み）
- Cron 系は `X-Cron-Secret` で保護
- LINE Webhook は署名検証で保護

**結論**: 認証・認可は適切。

---

### 1.3 ⚠️ 要対応: analyze-meal 画像サイズ制限なし（DoS リスク）

**問題**: `app/api/advice/route.ts` では `meal_image_base64` に 3MB 制限があるが、`app/api/analyze-meal/route.ts` には同様の制限がない。

```ts:app/api/advice/route.ts（参考）
const MAX_IMAGE_BASE64 = 3 * 1024 * 1024; // 3MB
const hasImage = ... && mealImageBase64.length <= MAX_IMAGE_BASE64;
```

**修正案（analyze-meal/route.ts）**:

```ts
// 冒頭に追加
const MAX_IMAGE_BASE64 = 3 * 1024 * 1024; // 3MB（DoS防止）

// POST 内、hasImage 判定後に追加
if (hasImage && typeof imageBase64 === 'string' && imageBase64.length > MAX_IMAGE_BASE64) {
  return NextResponse.json(
    { error: '画像サイズは3MBまでです' },
    { status: 400 }
  );
}
```

---

### 1.4 ⚠️ 要確認: Middleware の API 保護漏れ

**問題**: `middleware.ts` の `isAuthRequired` に `/api/insights` と `/api/correlation-stats` が含まれていない。

- 実際には各ルートで `withSession` が 401 を返すため、認可は担保されている
- 一貫性のため middleware にも追加することを推奨

**修正案（middleware.ts）**:

```ts
const isAuthRequired =
  pathname.startsWith('/dashboard') ||
  pathname.startsWith('/record') ||
  // ... 既存 ...
  pathname.startsWith('/api/insights') ||        // 追加
  pathname.startsWith('/api/correlation-stats');  // 追加
```

---

### 1.5 ✅ IDOR 対策

- health-logs: `userId_date` / `userId` でフィルタ
- user-settings: `userId` でスコープ
- insights: `userId` でフィルタ
- reminders: `id` + `userId` で存在確認してから更新・削除
- pet / game-stats: `session.userId` でスコープ

**結論**: IDOR 脆弱性は見当たらない。

---

## 2. DRY（重複排除）

### 2.1 ⚠️ 要対応: 数値・文字列バリデーションの重複

**問題**:

- `app/api/health-logs/route.ts`: `safeTemperature(val)` … 30〜45 の範囲チェック
- `app/api/user-settings/route.ts`: `safeNumber(val, min, max)`, `safeLongString(val, maxLen)`

`safeTemperature` は `safeNumber(val, 30, 45)` の特殊ケース。`lib/json-utils.ts` に `toNumOrNull` はあるが、min/max 付きのバリデーションは共通化されていない。

**修正案: `lib/json-utils.ts` に追加**

```ts
/** unknown を min〜max の範囲内の number | null に変換（API body 用） */
export function safeNumber(val: unknown, min: number, max: number): number | null {
  if (val == null || val === '') return null;
  const n = Number(val);
  if (Number.isNaN(n)) return null;
  if (n < min || n > max) return null;
  return n;
}

/** unknown を最大 maxLen 文字に切り詰めた string | null に変換 */
export function safeLongString(val: unknown, maxLen: number): string | null {
  if (val == null || val === '') return null;
  return String(val).slice(0, maxLen);
}
```

**health-logs/route.ts**:

```ts
import { toStringOrNull, toNumOrNull, safeNumber } from '@/lib/json-utils';

function safeTemperature(val: unknown): number | null {
  return safeNumber(val, 30, 45);
}
```

**user-settings/route.ts**: ローカルの `safeNumber` / `safeLongString` を削除し、`lib/json-utils` から import。

---

### 2.2 ℹ️ 軽微: デフォルト設定オブジェクトの重複

**問題**: `app/api/advice/route.ts` と `app/api/report/route.ts` で、`userSettings` が null の場合のデフォルトオブジェクトが類似している。

```ts
// advice/route.ts と report/route.ts で繰り返し
: {
  medical_history: 'なし',
  current_medications: 'なし',
  mode_ibd: false,
  ...
}
```

**改善案**: `lib/api-utils.ts` または専用ファイルにヘルパーを置く。

```ts
export function toAdviceSettings(userSettings: UserSettings | null) {
  if (!userSettings) {
    return {
      medical_history: 'なし',
      current_medications: 'なし',
      mode_ibd: false,
      mode_diet: false,
      mode_alcohol: false,
      mode_mental: false,
    };
  }
  return {
    medical_history: userSettings.medicalHistory ?? 'なし',
    current_medications: userSettings.currentMedications ?? 'なし',
    mode_ibd: userSettings.modeIbd,
    mode_diet: userSettings.modeDiet,
    mode_alcohol: userSettings.modeAlcohol,
    mode_mental: userSettings.modeMental,
  };
}
```

---

### 2.3 ℹ️ 軽微: user-settings の slice と safeLongString の混在

**問題**: `medicationReminderTimes`, `profileName`, `birthDate`, `prefecture` で `!= null && !== '' ? String(...).slice(0, N) : null` と `safeLongString` が混在。

**改善案**: すべて `safeLongString(value, maxLen)` に統一。

```ts
medicationReminderTimes: safeLongString(medication_reminder_times, 2000),
profileName: safeLongString(profile_name, 100),
birthDate: safeLongString(birth_date, 20),
prefecture: safeLongString(prefecture, 50),
```

※ `safeLongString` が null/'' で null を返すよう定義する必要あり。

---

## 3. Clean Code

### 3.1 ⚠️ 要対応: useRecordForm の引数過多

**問題**: `useRecordForm` が 280 行超、返り値のプロパティが 50 以上。

**改善案**:

1. **オブジェクトでグループ化して返す**
   - `record`, `medication`, `meal`, `alcohol`, `period`, `actions` などに分ける
2. **サブフックへの分離**
   - `useRecordInit`, `useMealHandlers`, `usePeriodHandlers` は既に分離済み
   - 飲酒関連を `useAlcoholHandlers` に、メンタル関連を `useMentalHandlers` に分ける

```ts
return {
  // グループ化例
  record: { date, setDate, memo, setMemo, ... },
  medication: { medications, medicationTaken, saveMedicationStatusToLog, ... },
  meal: { mealDescription, mealImageBase64, ...meal },
  alcohol: { addedDrinks, handleAddDrink, handleRemoveDrink, ... },
  period: { periodStatus, savePeriodStatusToLog, ... },
  actions: { handleSubmit, handleCloseModal, ... },
  ui: { loading, isSubmitting, resultModal },
};
```

---

### 3.2 ℹ️ 軽微: buildRecordPayload の引数数

**問題**: `lib/validations/record-schema.ts` の `buildRecordPayload` が 20 以上の引数を持つ可能性。

**改善案**: オブジェクトで受け取る。

```ts
// Before
buildRecordPayload({ date, memo, mentalDiary, gender, ... }) 

// After（既にオブジェクトであれば OK、そうでなければオブジェクト化を検討）
buildRecordPayload(snapshot)
```

---

### 3.3 ℹ️ advice/route.ts の POST ハンドラの長さ

**問題**: POST ハンドラが 80 行超。ロジックが一つの関数に集中している。

**改善案**:

1. `buildAdviceInput(session, body)` で入力構築
2. `callOpenAIForAdvice(...)` は既に分離済み
3. 設定取得・プロンプト構築を `buildAdviceContext(session)` に切り出し

---

## 4. Types（型）

### 4.1 ✅ ignoreBuildErrors

`next.config.ts` で `ignoreBuildErrors: false` が設定されており、型チェックは有効。

---

### 4.2 ⚠️ correlation-stats の triggers 型

**問題**: `(stats?.triggers as Array<...>)` でキャストしており、実行時に shape が変わると不整合が発生する。

```ts
triggers: (stats?.triggers as Array<{ label: string; ratio: number; description: string }>) ?? [],
```

**改善案**: Prisma の `Json` 型用のバリデーション関数を用意。

```ts
function parseTriggers(val: unknown): Array<{ label: string; ratio: number; description: string }> {
  if (!Array.isArray(val)) return [];
  return val.filter((t): t is { label: string; ratio: number; description: string } =>
    t != null &&
    typeof t === 'object' &&
    typeof (t as { label?: unknown }).label === 'string' &&
    typeof (t as { ratio?: unknown }).ratio === 'number' &&
    typeof (t as { description?: unknown }).description === 'string'
  );
}
// 使用
triggers: parseTriggers(stats?.triggers),
```

---

### 4.3 ℹ️ pet/route.ts の型アサーション

**問題**: `(pet as { expPoints?: number })` など、Prisma モデルに存在しないカラムをアサーションしている。

**原因**: `user_pets` テーブルに Prisma schema 未反映のカラムがある可能性。

**改善案**: `prisma/schema.prisma` を確認し、不足カラムを追加。または `$extends` で型を拡張。

---

## 5. 優先度付き対応一覧

| 優先度 | 項目 | 対象 | 工数目安 |
|--------|------|------|----------|
| 高 | 1.3 analyze-meal 画像サイズ制限 | `app/api/analyze-meal/route.ts` | 小 |
| 高 | 2.1 safeNumber / safeLongString 共通化 | `lib/json-utils.ts`, health-logs, user-settings | 小 |
| 中 | 1.4 Middleware に insights / correlation-stats 追加 | `middleware.ts` | 極小 |
| 中 | 4.2 correlation-stats triggers 型 | `app/api/correlation-stats/route.ts` | 小 |
| 低 | 2.2 toAdviceSettings 共通化 | advice, report | 小 |
| 低 | 2.3 user-settings slice 統一 | `app/api/user-settings/route.ts` | 極小 |
| 低 | 3.1 useRecordForm グループ化 | `useRecordForm.ts` | 中 |
| 低 | 4.3 pet Prisma schema 確認 | `prisma/schema.prisma`, pet/route | 小 |

---

## 6. 修正コード例（高優先度のみ）

### 6.1 analyze-meal 画像サイズ制限

```ts
// app/api/analyze-meal/route.ts 内
const MAX_IMAGE_BASE64 = 3 * 1024 * 1024; // 3MB

// hasImage チェック後に追加
if (hasImage && typeof imageBase64 === 'string' && imageBase64.length > MAX_IMAGE_BASE64) {
  return NextResponse.json(
    { error: '画像サイズは3MBまでです' },
    { status: 400 }
  );
}
```

### 6.2 lib/json-utils.ts 拡張

```ts
// 既存の toNumOrNull の下に追加
export function safeNumber(val: unknown, min: number, max: number): number | null {
  if (val == null || val === '') return null;
  const n = Number(val);
  if (Number.isNaN(n)) return null;
  if (n < min || n > max) return null;
  return n;
}

export function safeLongString(val: unknown, maxLen: number): string | null {
  if (val == null || val === '') return null;
  return String(val).slice(0, maxLen);
}
```

### 6.3 health-logs route 修正

```ts
// 先頭 import に safeNumber 追加
import { toStringOrNull, toNumOrNull, safeNumber } from '@/lib/json-utils';

// safeTemperature を置き換え
function safeTemperature(val: unknown): number | null {
  return safeNumber(val, 30, 45);
}
```

### 6.4 user-settings route 修正

```ts
// ローカルの safeNumber, safeLongString を削除
// import に追加
import { parseJsonBody, withSession } from '@/lib/api-utils';
import { safeNumber, safeLongString } from '@/lib/json-utils';
```

### 6.5 middleware 修正

```ts
pathname.startsWith('/api/insights') ||
pathname.startsWith('/api/correlation-stats') ||
(pathname.startsWith('/api/line') && !pathname.startsWith('/api/line/webhook'));
```
