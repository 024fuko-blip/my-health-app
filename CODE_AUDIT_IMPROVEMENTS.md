# コード監査: 改善一覧

Security / DRY / Clean Code / Types の観点で改善が必要な箇所と具体的な修正案。

---

## 1. Security

### 1.1 process.env の直接参照

| ファイル | 内容 | 判定 |
|----------|------|------|
| `lib/secrets.ts` | `process.env` でフォールバック | 許容（secrets 取得の責務内） |
| `lib/env.ts` | `isBuildTime()` で `process.env.NEXT_PHASE` 等、`getBuildTimeDummyEnv()` で `process.env.DATABASE_URL` 等 | ビルド時判定用のため許容 |
| `instrumentation.ts` | エラーメッセージ内で言及 | 影響なし |

**結論**: 現状で重大な問題なし。`lib/env.ts` のビルド時判定は Next.js の仕様に依存しており、`getSecret` 経由に寄せるとビルドが複雑になるため、現状維持を推奨。

---

### 1.2 入力値の信頼・バリデーション不足

#### A. `app/api/health-logs/route.ts` — date パラメータ

- **問題**: `date`、`startDate`、`endDate` に任意の文字列を渡せる。`YYYY-MM-DD` 形式でない値で想定外の動作やクエリ負荷の可能性。
- **修正**: 日付形式のバリデーションを追加。

```ts
// lib/date-utils.ts（新規）
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export function isValidDateStr(s: string): boolean {
  if (!DATE_REGEX.test(s)) return false;
  const d = new Date(s);
  return !isNaN(d.getTime());
}
```

```ts
// health-logs/route.ts GET
if (date) {
  if (!isValidDateStr(date)) {
    return new NextResponse('Bad Request: invalid date format (YYYY-MM-DD)', { status: 400 });
  }
  // ...
}
if (startDate && endDate) {
  if (!isValidDateStr(startDate) || !isValidDateStr(endDate)) {
    return new NextResponse('Bad Request: invalid date format', { status: 400 });
  }
  // ...
}
```

#### B. `app/api/user-settings/route.ts` — PUT body

- **問題**: `body` がオブジェクトでない場合に `body.mode_ibd` 等で例外。文字列フィールドの長さ制限なし。
- **修正**: 入力がオブジェクトか確認し、文字列長を制限。

```ts
// user-settings/route.ts PUT
const body = await req.json();
if (body === null || typeof body !== 'object' || Array.isArray(body)) {
  return new NextResponse('Bad Request: body must be object', { status: 400 });
}
const MAX_STR = 10000; // medical_history 等の上限
if (typeof body.medical_history === 'string' && body.medical_history.length > MAX_STR) {
  return new NextResponse('Bad Request: medical_history too long', { status: 400 });
}
// 以降、既存の destructuring...
```

---

### 1.3 IDOR

- **現状**: `health-logs`、`reminders`、`pet` 等で `session.userId` を where 条件に含めており、他ユーザーのデータへアクセスする IDOR の脆弱性はなし。
- **結論**: 現状の設計で問題なし。

---

## 2. DRY

### 2.1 `getTodayJST()` の重複

- **場所**: `send-reminders/route.ts`、`send-morning-line/route.ts`、`line/webhook/route.ts` の 3 箇所で同一ロジック。
- **修正**: 共通ユーティリティに抽出。

```ts
// lib/date-utils.ts（新規）
export function getTodayJST(): string {
  const formatter = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(new Date());
  const y = parts.find((p) => p.type === 'year')!.value;
  const m = parts.find((p) => p.type === 'month')!.value;
  const d = parts.find((p) => p.type === 'day')!.value;
  return `${y}-${m}-${d}`;
}

export function getPastDates(days: number): string[] {
  const formatter = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dates: string[] = [];
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const parts = formatter.formatToParts(d);
    const y = parts.find((p) => p.type === 'year')!.value;
    const m = parts.find((p) => p.type === 'month')!.value;
    const day = parts.find((p) => p.type === 'day')!.value;
    dates.push(`${y}-${m}-${day}`);
  }
  return dates;
}
```

各 route では `import { getTodayJST, getPastDates } from '@/lib/date-utils'` に置き換え。

---

### 2.2 `charaSettings` の重複

- **場所**: `app/api/advice/route.ts` と `app/api/cron/send-morning-line/route.ts` で AI 口調設定が似ている。
- **修正**: 口調用の定数を共通化（任意）。

```ts
// lib/ai-personality.ts（新規）
export const AI_CHARA_SETTINGS = {
  tsundere: '...',
  amayama: '...',
  ikemen: '...',
} as const;
```

---

## 3. Clean Code

### 3.1 `app/api/advice/route.ts` — 長大な POST 関数

- **問題**: 約 220 行の 1 関数。可読性・テストのしやすさが悪い。
- **修正**: 責任ごとに分割。

```ts
// 例: データ準備 → buildAdviceInput()、プロンプト構築 → buildAdvicePrompts()
function buildAdviceInput(sessionUserId: string, body: Record<string, unknown>) {
  // ...
}
function buildAdvicePrompts(params: { mode: string; settings: ...; ... }) {
  // ...
}
// POST は getSession → buildAdviceInput → buildAdvicePrompts → OpenAI 呼び出し の流れに
```

---

### 3.2 `generateMorningMessage` — 引数の多さ

- **現状**: 既に `params` オブジェクトにまとまっている。
- **結論**: 現状で問題なし。

---

### 3.3 `toApiShape` 系の重複

- **場所**: `user-settings`、`health-logs` で snake_case 変換を個別実装。
- **修正**: Prisma の select 結果に対して汎用変換を用意するか、型付きで共通化を検討（影響範囲が大きいため低優先）。

---

## 4. Types

### 4.1 `next.config.ts` — ignoreBuildErrors: true

- **問題**: 型エラーを無視しているため、ビルドが型安全でない。
- **対応**: 型エラーを解消してから `ignoreBuildErrors: false` に戻す（SECURITY_IMPROVEMENT_PLAN と同方針）。

---

### 4.2 型が曖昧な箇所

#### A. `app/api/advice/route.ts`

```ts
const { mode, logs, meal_image_base64: mealImageBase64, ...dailyInput } = body;
```

- **問題**: `body` が `Record<string, unknown>` で、`mode` や `logs` の型が未定義。
- **修正**: 入力型を定義。

```ts
interface AdviceRequestBody {
  mode?: 'daily' | 'weekly';
  logs?: unknown[];
  meal_image_base64?: string;
  [key: string]: unknown;
}
const body = (await req.json()) as AdviceRequestBody;
```

#### B. `app/api/user-settings/route.ts`

- **問題**: `body` の型がなく、各フィールドを `as` なしで利用。
- **修正**: PUT 用の入力型を定義。

```ts
interface UserSettingsPutBody {
  mode_ibd?: boolean;
  mode_alcohol?: boolean;
  prefecture?: string;
  // ...
}
```

---

## 5. 優先度付き実施リスト

| 優先度 | 項目 | 工数 | ファイル |
|--------|------|------|----------|
| 高 | `getTodayJST` / `getPastDates` 共通化 | 小 | lib/date-utils.ts + 3 routes |
| 高 | health-logs 日付バリデーション | 小 | health-logs/route.ts |
| 中 | user-settings PUT body 検証 | 小 | user-settings/route.ts |
| 中 | advice 入力型定義 | 小 | advice/route.ts |
| 低 | advice POST 関数分割 | 中 | advice/route.ts |
| 低 | ignoreBuildErrors 解除 | 大 | next.config.ts + 型修正 |

---

## 6. 追加・更新分（LINE チャット、webhook、line-chat 等）

### 6.1 Security

#### A. LINE webhook — JSON パース、テキスト長制限

- **問題**: `JSON.parse(rawBody)` に try-catch なし。不正 JSON で例外。また `text` に長さ制限がなく、巨大メッセージで AI トークン消費・コスト増のリスク。
- **修正**:

```ts
// webhook/route.ts
let body: unknown;
try {
  body = JSON.parse(rawBody);
} catch {
  return new NextResponse('Invalid JSON', { status: 400 });
}
// ...
const text = (event.message?.text ?? '').trim();
if (text.length > 500) {
  if (replyToken && config.accessToken) {
    await replyLineMessages(config.accessToken, replyToken, [
      { type: 'text', text: 'メッセージが長すぎるわ。500文字以内で送ってね。' },
    ]);
  }
  continue;
}
```

#### B. lib/line-chat — userMessage 長さ制限

- **問題**: `replyAsCompanion(userMessage, context)` に長さ制限なし。
- **修正**: 呼び出し元（webhook）で 500 文字制限をかけるか、`replyAsCompanion` 内で truncate。

---

### 6.2 DRY

#### A. `charaSettings` / `CHARA_SETTINGS` の重複

- **場所**: `advice/route.ts`、`send-morning-line/route.ts`、`line-chat.ts` の 3 箇所で類似の口調設定。
- **修正**: 共通モジュールに集約。

```ts
// lib/ai-personality.ts（新規）
export const AI_PERSONALITY_PROMPTS = {
  tsundere: (role: string) =>
    `あなたはユーザーの「${role}」であるツンデレオネエの鬼コーチよ。口調は強めのオネエ言葉。本当は心配している愛のある相棒として、簡潔に答えること。`,
  amayama: (role: string) =>
    `あなたはユーザーの「${role}」である優しい看護師のような存在。温かい口調で、ねぎらいの言葉を忘れずに答えること。`,
  ikemen: (role: string) =>
    `あなたはユーザーの「${role}」であるクールで頼れる男性。簡潔に、でもちゃんと気を配るアドバイスをすること。`,
} as const;

export type AiPersonality = keyof typeof AI_PERSONALITY_PROMPTS;
```

利用例: `AI_PERSONALITY_PROMPTS[personality]('健康相棒')` など。

※ advice は詳細な priorityRules など別ロジックが多いため、完全共通化は任意。

---

### 6.3 Clean Code

#### A. webhook POST — 長大化（約 190 行）

- **問題**: 1 関数に follow・連携・記録・チャット・postback が全て入っている。
- **修正**: イベント種別ごとにハンドラを分割。

```ts
// webhook/route.ts
async function handleFollow(accessToken: string, replyToken: string) {
  await replyLineMessages(accessToken, replyToken, [
    buildWelcomeMessage(),
    buildWelcomeButtons(),
  ]);
}

async function handleLinkCommand(code: string, lineUserId: string, ...) { /* ... */ }
async function handleRecordCommand(text: string, linked: LineLink, ...) { /* ... */ }
async function handleChatCommand(text: string, linked: LineLink, ...) { /* ... */ }

// POST 内
for (const event of events) {
  if (event.type === 'follow') await handleFollow(...);
  else if (event.type === 'message' && ...) {
    if (linkMatch) await handleLinkCommand(...);
    else if (linked) {
      if (isRecordCommand) await handleRecordCommand(...);
      else await handleChatCommand(...);
    }
  }
  // ...
}
```

---

### 6.4 Types

#### A. LINE webhook body の型

- **問題**: `body` をインラインで `as { events?: Array<...> }` としている。
- **修正**: 型を切り出し。

```ts
// types/line-webhook.ts または webhook 内
interface LineWebhookEvent {
  type: string;
  replyToken?: string;
  source?: { userId?: string };
  message?: { type: string; text?: string };
  postback?: { data?: string };
}

interface LineWebhookBody {
  events?: LineWebhookEvent[];
}

const body = JSON.parse(rawBody) as LineWebhookBody;
```

#### B. buildQuickReplyItems の戻り値型

- **問題**: 戻り値の型が明示されていない。
- **修正**: LINE Messaging API の Quick Reply 型を定義して利用。

---

## 7. 優先度付き実施リスト（更新）

| 優先度 | 項目 | 工数 | ファイル |
|--------|------|------|----------|
| 高 | LINE webhook: JSON try-catch、text 500文字制限 | 小 | webhook/route.ts |
| 中 | charaSettings 共通化（lib/ai-personality） | 小 | 新規 + 3ファイル |
| 中 | webhook ハンドラ分割 | 中 | webhook/route.ts |
| 中 | user-settings PUT body 検証 | 小 | user-settings/route.ts |
| 低 | webhook body 型定義 | 小 | types/line-webhook.ts |
| 低 | ignoreBuildErrors 解除 | 大 | next.config.ts + 型修正 |

---

## 8. 修正コード案（DRY + Security の高優先分）

実装する場合は上記に従い、`lib/date-utils.ts` を新規作成し、該当 route を順次更新してください。
