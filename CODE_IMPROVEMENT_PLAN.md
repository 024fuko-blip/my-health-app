# コード改善計画

改善の観点（初回 audit 基準）:
- **Security**: process.env の直接参照、認証チェック、IDOR、入力値の信頼
- **DRY**: 重複ロジック、共通化可能なユーティリティ
- **Clean Code**: 引数過多、関数の長さ
- **Types**: 型の曖昧さ、ignoreBuildErrors への依存

---

## 1. Security

### 1.1 process.env
現状: `lib/env.ts`, `lib/secrets.ts`, `instrumentation.ts` のみ。いずれも責務内で妥当。追加の direct ref は未検出。

### 1.2 認証
全 API で `requireSession()` 使用、未認証は 401。問題なし。

### 1.3 IDOR
`health-logs`, `reminders`, `pet/*` で session.userId を where に含めスコープ。問題なし。

### 1.4 入力値（要対応）
| 箇所 | 課題 |
|------|------|
| `analyze-meal` | `meal_description` が無制限でプロンプトに埋め込み |
| `user-settings` | `slice(0,N)` と `safeLongString` が混在 |

**修正（analyze-meal）**:
```ts
const MAX_MEAL_DESCRIPTION = 2000;
const mealDescription =
  typeof body.meal_description === 'string'
    ? body.meal_description.trim().slice(0, MAX_MEAL_DESCRIPTION)
    : '';
```

**修正（user-settings）**:
```ts
medicationReminderTimes: safeLongString(medication_reminder_times, 2000),
profileName: safeLongString(profile_name, 100),
birthDate: safeLongString(birth_date, 20),
prefecture: safeLongString(prefecture, 50),
```

---

## 2. DRY

### 2.1 withSession 導入（優先: 高）
全 API で `requireSession` + `instanceof` の 2 行が繰り返し。共通ヘルパーで削減。

```ts
// lib/api-utils.ts
export async function withSession(
  handler: (session: Session) => Promise<NextResponse>
): Promise<NextResponse> {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  return handler(session);
}
```

**使用例**:
```ts
export async function GET() {
  return withSession(async (session) => {
    try {
      const row = await prisma.userSettings.findUnique({
        where: { userId: session.userId },
      });
      return NextResponse.json(row ?? defaultSettings);
    } catch (e) {
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  });
}
```

**移行**: `lib/api-utils` に追加 → 1ルートで試験 → 他へ段階適用。

### 2.2 文字列長制限
`user-settings` で `safeLongString` を統一（上記 1.4 参照）。

---

## 3. Clean Code

### 3.1 AlcoholSection props（17個 → オブジェクト化）
**現状**: 17 個の props を列挙。

**修正**:
```ts
interface AlcoholSectionProps {
  onUserEdit?: () => void;
  drinks: {
    added: AddedDrink[];
    selectedKey: string;
    setSelectedKey: (v: string) => void;
    count: number;
    setCount: (v: number) => void;
    onAdd: () => void;
    onRemove: (id: number) => void;
  };
  time: { start: string; setStart: (v: string) => void; end: string; setEnd: (v: string) => void };
  calc: { totalPureAlcohol: number; totalMl: number; decompositionHours: number; soberTime: string };
  previousSummary: string;
  userWeight: number;
  setUserWeight: (v: number) => void;
}
```

**page.tsx 例**:
```ts
<AlcoholSection
  onUserEdit={form.markUserEdit}
  drinks={{
    added: form.addedDrinks,
    selectedKey: form.selectedDrinkKey,
    setSelectedKey: form.setSelectedDrinkKey,
    count: form.drinkCount,
    setCount: form.setDrinkCount,
    onAdd: form.handleAddDrink,
    onRemove: form.handleRemoveDrink,
  }}
  time={{
    start: form.drinkStartTime,
    setStart: form.setDrinkStartTime,
    end: form.drinkEndTime,
    setEnd: form.setDrinkEndTime,
  }}
  calc={{
    totalPureAlcohol: form.currentTotalPureAlcohol,
    totalMl: form.currentTotalMl,
    decompositionHours: form.decompositionHours,
    soberTime: form.soberTime,
  }}
  previousSummary={form.previousAlcoholSummary}
  userWeight={form.userWeight}
  setUserWeight={form.setUserWeight}
/>
```

### 3.2 useRecordForm（約550行）
- state 約50個、handleSubmit 90行以上、return 80+ プロパティ
- **案**: (1) `buildSubmitPayload`, `callAdviceApi`, `saveHealthLog` に分割 (2) state を `useRecordFormState` 等に切り出し (3) 記録画面用 `RecordFormContext` の検討
- 優先度: 低（工数大）

### 3.3 applyLogToForm（21 setter）
型でまとまり役割は明確。優先度: 低。

---

## 4. Types

### 4.1 現状
- `ignoreBuildErrors: false` ✅
- `skipLibCheck: true`（一般的）

### 4.2 曖昧な箇所
| 箇所 | 対応 |
|------|------|
| `pet/route.ts` | Prisma に `expPoints`, `feedCount`, `adoptedAt` があれば `as` 削除。なければ `UserPet & { expPoints?: number; ... }` で拡張型定義 |
| `advice/route.ts` | `interface AdviceRequestBody { mode?: 'daily'\|'weekly'; logs?: unknown[]; meal_image_base64?: string; [key: string]: unknown }` を定義 |
| `analyze-meal` | 現状 `Record<string, unknown>` で返却。呼び出し元で `safeParseJson<NutritionType>(s, fallback)` と明示する運用推奨 |

---

## 5. 優先度

| 優先度 | 項目 | 工数 |
|--------|------|------|
| 高 | 1.4 analyze-meal 入力長制限 | 小 |
| 高 | 2.1 withSession 導入 | 中 |
| 中 | 2.2 / 1.4 user-settings safeLongString 統一 | 小 |
| 中 | 3.1 AlcoholSection props 整理 | 中 |
| 中 | 4.2 advice 型定義 | 小 |
| 低 | 3.2 useRecordForm 分割 | 大 |
| 低 | 3.3 applyLogToForm | 中 |

---

## 6. 修正コード一覧

### 6.1 lib/api-utils.ts（withSession 追記）
```ts
import { requireSession } from '@/lib/auth';
import type { Session } from '@/lib/auth';

export async function withSession(
  handler: (session: Session) => Promise<NextResponse>
): Promise<NextResponse> {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  return handler(session);
}
```

### 6.2 analyze-meal/route.ts
```ts
const MAX_MEAL_DESCRIPTION = 2000;
const mealDescription =
  typeof body.meal_description === 'string'
    ? body.meal_description.trim().slice(0, MAX_MEAL_DESCRIPTION)
    : '';
```

### 6.3 user-settings/route.ts
```ts
medicationReminderTimes: safeLongString(medication_reminder_times, 2000),
profileName: safeLongString(profile_name, 100),
birthDate: safeLongString(birth_date, 20),
prefecture: safeLongString(prefecture, 50),
```
※ `safeLongString` は null/'' で null を返すため、`!= null && !== ''` は不要の場合あり。既存の条件分岐と整合を確認して適用。

---

## 7. 補足

### Prisma UserPet
`schema.prisma` に `expPoints`, `feedCount`, `adoptedAt` が無い場合、追加して `prisma migrate`。あれば `as` 不要。

### handleSubmit 分割イメージ
```ts
// record-form-submit.ts
function buildSubmitPayload(form: RecordFormState): Record<string, unknown> { /* ... */ }
async function callAdviceApi(form: RecordFormState): Promise<string> { /* ... */ }
```
`handleSubmit` 内で `buildSubmitPayload` → `callAdviceApi` → `saveHealthLog` を順に呼ぶ形に分離。
