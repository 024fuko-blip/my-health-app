# コード品質監査レポート

改善が必要な箇所を、Security / DRY / Clean Code / Types の観点でリストアップし、具体的な修正コード案を提示する。

---

## 1. Security（セキュリティ）

### 1.1 `req.json()` の未処理エラー

**問題**: 多くの API ルートで `await req.json()` に try-catch がなく、不正 JSON で未ハンドル例外→500 が返る。

**影響箇所**:
- `app/api/user-settings/route.ts` (PUT)
- `app/api/health-logs/route.ts` (POST, PATCH)
- `app/api/reminders/route.ts` (POST)
- `app/api/reminders/[id]/route.ts` (PATCH)
- `app/api/analyze-meal/route.ts`
- `app/api/report/route.ts`
- `app/api/push-subscribe/route.ts`
- `app/api/pet/feed/route.ts`, `pet/outfit/route.ts`, `pet/buy/route.ts`

**修正案**: 共通の `parseJsonBody` ヘルパーを作成し、全 API で利用する。

```ts
// lib/api-utils.ts
export async function parseJsonBody<T = Record<string, unknown>>(
  req: Request,
  defaultValue?: T
): Promise<{ ok: true; data: T } | { ok: false; error: NextResponse }> {
  try {
    const data = (await req.json()) as T;
    return { ok: true, data };
  } catch {
    return {
      ok: false,
      error: new NextResponse(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }
}
```

使用例:
```ts
const parsed = await parseJsonBody<{ date: string; memo?: string }>(req);
if (!parsed.ok) return parsed.error;
const { data } = parsed;
```

---

### 1.2 入力値の信頼・バリデーション不足

**問題**: `user-settings` PUT で `medical_history`, `current_medications` に長さ制限がなく、`Number(height)` が `NaN` になる可能性。

**影響箇所**: `app/api/user-settings/route.ts`

**修正案**:
```ts
const MAX_STRING_LENGTH = 10000; // 適切な上限を設定

function safeNumber(val: unknown, min?: number, max?: number): number | null {
  const n = Number(val);
  if (Number.isNaN(n)) return null;
  if (min != null && n < min) return null;
  if (max != null && n > max) return null;
  return n;
}

// 使用例
medicalHistory: typeof medical_history === 'string' && medical_history.length <= MAX_STRING_LENGTH
  ? medical_history
  : null,
height: safeNumber(height, 0, 300) ?? null,
weight: safeNumber(weight, 0, 500) ?? null,
latitude: safeNumber(latitude, -90, 90) ?? null,
longitude: safeNumber(longitude, -180, 180) ?? null,
```

---

### 1.3 `process.env` の直接参照

**現状**: `lib/env.ts`, `lib/secrets.ts`, `instrumentation.ts` はビルド時判定・Secrets 層のため許容されている。

**確認**: プロジェクトルールではサーバー用は `getServerEnv()` 経由とされている。上記は例外として妥当。追加の `process.env` 直接参照は見つかっていない。

---

## 2. DRY（重複排除）

### 2.1 相棒プロンプト（charaSettings）の重複

**問題**: `charaSettings` が 3 箇所で重複定義されている。

- `app/api/advice/route.ts`
- `lib/line-chat.ts`
- `app/api/cron/send-morning-line/route.ts`

**修正案**: 共通モジュールに集約する。

```ts
// lib/chara-settings.ts
export type AiPersonality = 'asuka' | 'tsundere' | 'amayama' | 'ikemen';

export const CHARA_PROMPTS: Record<AiPersonality, string> = {
  asuka: `あなたは「あすか」という25歳の健康相棒。性格は温厚・ポジティブ・知的・楽観的...`,
  tsundere: `あなたはIBDとボディメイクを指導する「ツンデレオネエの鬼コーチ」よ。...`,
  amayama: `...`,
  ikemen: `...`,
};

export function getCharaPrompt(personality: string | null, context: 'advice' | 'line' | 'morning'): string {
  const key = (['asuka', 'tsundere', 'amayama', 'ikemen'].includes(personality ?? '') ? personality : 'asuka') as AiPersonality;
  return CHARA_PROMPTS[key] ?? CHARA_PROMPTS.asuka;
}
```

※ `advice` と `line`/`morning` で文言が異なる場合は `context` で分岐するか、別マップを用意する。

---

### 2.2 服薬・リマインダー解析ロジックの重複

**問題**: `app/api/reminders/route.ts` の GET 内で、`medicationReminderTimes` と `currentMedications` の JSON 解析＋スケジュール構築が 2 回（`type === null` と `type === 'medication'`）ほぼ同一で書かれている。

**修正案**: 共通関数に抽出する。

```ts
// lib/medication-schedule.ts
export interface MedicationScheduleItem {
  time: string;
  label?: string;
  medications: string[];
}

const DEFAULT_TIMES: Record<string, string> = {
  朝: '08:00', 昼: '12:00', 晩: '18:00', 眠前: '22:00',
};

export function buildMedicationSchedule(
  medicationReminderTimes: string | null,
  currentMedications: string | null,
  options?: { includeLabel?: boolean }
): MedicationScheduleItem[] {
  let times = { ...DEFAULT_TIMES };
  try {
    if (medicationReminderTimes) {
      const parsed = JSON.parse(medicationReminderTimes) as Record<string, string>;
      times = { ...times, ...parsed };
    }
  } catch { /* use defaults */ }

  let medications: Array<{ name: string; timings: string[] }> = [];
  try {
    const medData = JSON.parse(currentMedications || '{}') as { medications?: Array<{ name: string; timings: string[] }> };
    if (medData.medications?.length) medications = medData.medications;
  } catch { /* empty */ }

  const timeToMeds: Record<string, string[]> = {};
  for (const med of medications) {
    for (const t of med.timings) {
      const time = times[t] ?? t;
      if (!timeToMeds[time]) timeToMeds[time] = [];
      timeToMeds[time].push(med.name);
    }
  }
  return Object.entries(timeToMeds)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, meds]) => ({
      time,
      ...(options?.includeLabel && { label: time }),
      medications: meds,
    }));
}
```

`reminders/route.ts` では:
```ts
const schedule = buildMedicationSchedule(
  settings?.medicationReminderTimes ?? null,
  settings?.currentMedications ?? null,
  { includeLabel: type !== 'medication' }
);
```

---

### 2.3 `JSON.parse` の安全ラッパー不足

**問題**: `JSON.parse(x || '{}')` が多数箇所で重複。不正 JSON で例外になる箇所もある。

**修正案**:
```ts
// lib/json-utils.ts
export function safeParseJson<T = unknown>(str: string | null | undefined, fallback: T): T {
  if (!str || str.trim() === '') return fallback;
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}
```

使用例: `safeParseJson<{ medications?: ... }>(settings.currentMedications, {})`

---

## 3. Clean Code（可読性・保守性）

### 3.1 `applyLogToForm` の setter 数

**問題**: `ApplyLogSetters` に 19 個のプロパティがあり、引数としてのオブジェクトはやや大きい。

**現状**: 既にオブジェクトでまとめているため、致命的ではない。

**改善案（任意）**: 論理的にグループ化する。
```ts
export interface ApplyLogSetters {
  basic: { setMemo, setGeneralMood, setPeriodStatus, setSkinCondition, ... };
  diet: { setWeight, setBodyFat, setCalories, setProtein, setSteps, setExerciseMinutes };
  mental: { setSelectedEmotion, setSleepQuality, setMentalDiary };
  alcohol: { setAddedDrinks, setPreviousAlcoholSummary, setDrinkStartTime, setDrinkEndTime };
  // ...
}
```
※ 既存呼び出し側の変更が大きいため、優先度は低め。

---

### 3.2 `advice/route.ts` の長大な POST

**問題**: 1 関数が 220 行以上あり、責務が混在している。

**修正案**: 以下のように分割する。

```ts
// advice/route.ts
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return new NextResponse('Unauthorized', { status: 401 });

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.error;
  const body = parsed.data;

  const input = await buildAdviceInput(session.userId, body);
  if (input.error) return input.error;

  const advice = await callOpenAIForAdvice(input.data);
  return NextResponse.json({ advice });
}

async function buildAdviceInput(userId: string, body: Record<string, unknown>) { ... }
async function callOpenAIForAdvice(input: AdviceInput) { ... }
```

---

### 3.3 `useRecordForm` の肥大化

**問題**: 500 行超、useState が 40 以上。見通しが悪い。

**改善案（中長期）**:
1. `useReducer` で state を集約する
2. サブフックに分割: `useRecordBasicState`, `useRecordDietState`, `useRecordAlcoholState`, `useRecordSubmit` など

---

## 4. Types（型安全性）

### 4.1 `ignoreBuildErrors: true`

**問題**: `next.config.ts` で型エラーを無視してビルドしている。型の不整合が本番に潜り込むリスクがある。

**対応方針**: 型エラーを順次解消し、`ignoreBuildErrors: false` に戻す。

```ts
// next.config.ts
typescript: {
  ignoreBuildErrors: false,  // 型修正後に変更
},
```

---

### 4.2 `medical_history` の型不整合

**問題**: `medical_history` が JSON 文字列で、構造が文脈によって異なる。
- プロフィール由来: `{ text?: string }`
- 健康管理由来: `{ lastPeriodDate?: string; periodCycle?: number; periodDuration?: number }`

**修正案**: スキーマを明確にする。

```ts
// lib/medical-history-types.ts
export interface MedicalHistoryProfile {
  text?: string;
  lastPeriodDate?: string;
  periodCycle?: number;
  periodDuration?: number;
}

export function parseMedicalHistory(raw: string | null): MedicalHistoryProfile {
  return safeParseJson<MedicalHistoryProfile>(raw, {});
}
```

`line-chat.ts` の `buildChatContextFromSettings` では、`medicalHistory` から `text` を取るか、`lastPeriodDate` 等を取るか、用途に応じて `MedicalHistoryProfile` を参照する。

---

### 4.3 API body の型アサーション

**問題**: `(await req.json()) as ReportRequestBody` のように、実行時バリデーションなしで型アサーションしている。

**修正案**: 簡易バリデータを用意する。

```ts
function parseReportBody(body: unknown): ReportRequestBody | null {
  if (body && typeof body === 'object' && 'period' in body) {
    const p = (body as { period?: number }).period;
    return p === 7 || p === 30 ? { period: p } : null;
  }
  return null;
}

const body = parseReportBody(await req.json());
if (!body) return new NextResponse('Bad Request: period must be 7 or 30', { status: 400 });
```

---

### 4.4 `pet/feed`, `pet/outfit`, `pet/buy` の `itemId`/`outfitId`

**問題**: `body.itemId as string | undefined` で型アサーションのみ。存在チェックはあるが、型が string である保証はない。

**修正案**:
```ts
const itemId = typeof body?.itemId === 'string' ? body.itemId : undefined;
if (!itemId) return new NextResponse('Bad Request: itemId required', { status: 400 });
```

---

## 5. 優先度サマリ

| 優先度 | 項目 | 工数 | 効果 |
|--------|------|------|------|
| 高 | 1.1 req.json() の try-catch | 中 | 不正 JSON 時の安定した 400 応答 |
| 高 | 1.2 user-settings 入力バリデーション | 小 | DoS 防止・データ整合性 |
| 中 | 2.1 charaSettings 共通化 | 小 | 保守性・一貫性 |
| 中 | 2.2 服薬スケジュール共通化 | 小 | DRY・バグ修正の一元化 |
| 中 | 2.3 safeParseJson 導入 | 小 | 安全な JSON 解析 |
| 中 | 3.2 advice/route 分割 | 中 | 可読性・テスト容易性 |
| 低 | 4.1 ignoreBuildErrors 解除 | 大 | 型安全性 |
| 低 | 4.2 medical_history 型定義 | 中 | 型の明確化 |
| 低 | 4.3, 4.4 body バリデーション | 小 | 型と実行時整合 |

---

## 6. 即時適用可能な修正例（最小変更）

### 6.1 user-settings PUT に req.json() の try-catch を追加

```ts
// app/api/user-settings/route.ts
let body: Record<string, unknown>;
try {
  body = await req.json();
} catch {
  return new NextResponse(
    JSON.stringify({ error: 'Invalid JSON' }),
    { status: 400, headers: { 'Content-Type': 'application/json' } }
  );
}
```

### 6.2 user-settings PUT の数値バリデーション

```ts
const safeNum = (v: unknown, min: number, max: number): number | null => {
  const n = Number(v);
  return !Number.isNaN(n) && n >= min && n <= max ? n : null;
};
// height: safeNum(height, 0, 300) ?? row.height ?? null,
// weight: safeNum(weight, 0, 500) ?? row.weight ?? null,
```

### 6.3 lib/json-utils.ts を新規作成

```ts
export function safeParseJson<T>(str: string | null | undefined, fallback: T): T {
  if (!str?.trim()) return fallback;
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}
```

これらを `reminders`, `line-chat`, `user-settings/period`, `settings/health` 等で段階的に置き換える。
