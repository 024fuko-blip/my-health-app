# アプリ診断レポート v2 — my-health-app

> **レビュー日**: 2026-02-26（Phase 1 修正後の再レビュー）
> **対象**: Next.js 16 + Prisma + OpenAI + LINE Messaging API ヘルスケアアプリ
> **レビュー範囲**: API ルート 33 本 / ページ 17 本 / lib 66 ファイル / コンポーネント 34 本 / フック 11 本（計 120 ファイル）

---

## 総合評価

| 分野 | 前回 | 今回 | 概要 |
|---|---|---|---|
| セキュリティ | B+ | **A-** | Cron Secret・レート制限・エラー漏洩修正済み。残: 連携コード生成・ペット経済のレースコンディション・サブルート4件のエラー漏洩 |
| 保守性 | B | **B+** | LINE Webhook分離・インデント修正済み。残: pet/page.tsx 611行、サブルート22件の冗長try/catch |
| DRY・効率性 | B- | **B+** | OpenAI集約・N+1解消済み。残: サブルート22件がerrorResponse未採用、line-chat等2件が直接new OpenAI() |
| 拡張性 | B | **B+** | API基盤(withSession+rateLimit+errorResponse)整備済み。残: lib/フラット構成、Zodスキーマ未導入11件 |

---

## 前回（Phase 1）で修正済みの項目

以下は既に解決済みのため、本レポートでは詳細を省略する。

| # | 修正内容 | 対象ファイル |
|---|---|---|
| ✅ | Cron Secret をタイミングセーフ比較に変更 | cron 3ファイル |
| ✅ | `errorResponse()` 統一ヘルパー導入 | `lib/api-utils.ts` |
| ✅ | `timingSafeCompare()` 導入 | `lib/api-utils.ts` |
| ✅ | `withSession` にレート制限統合 | `lib/api-utils.ts` + `lib/rate-limit.ts` |
| ✅ | `OpenAIKeyMissingError` 自動503変換 | `lib/openai-client.ts` |
| ✅ | `user-settings PUT` のエラーdetail漏洩修正 | `api/user-settings/route.ts` |
| ✅ | `analyze-meal` を `chatCompletion()` に統一 | `api/analyze-meal/route.ts` |
| ✅ | LINE Webhook をハンドラーパターンに分離 | `lib/line-handlers.ts` + webhook |
| ✅ | LINE チャットに `sanitizeForPrompt()` 適用 | `lib/line-handlers.ts` |
| ✅ | `pet/route.ts` エラーフォールバック関数抽出 | `api/pet/route.ts` |
| ✅ | `health-logs/route.ts` インデント修正 | `api/health-logs/route.ts` |
| ✅ | `report/route.ts` APIキーチェック集約 + 整形 | `api/report/route.ts` |
| ✅ | Cron `send-reminders` N+1クエリ → バッチクエリ | `api/cron/send-reminders/route.ts` |
| ✅ | Cron `generate-insights` 並列バッチ処理 | `api/cron/generate-insights/route.ts` |
| ✅ | `send-morning-line` を `getOpenAIClient()` に統一 | `api/cron/send-morning-line/route.ts` |
| ✅ | AI呼び出しルートにレート制限適用 | advice / report / analyze-meal |

---

## 1. セキュリティリスクの抽出

### 1.1 [高] LINE 連携コードが `Math.random()` で生成されている

**該当箇所**: `app/api/line/link-request/route.ts`

`Math.random()` は暗号学的に安全ではなく、パターンが予測可能。6桁コードの総当たりと組み合わせると、他人のアカウントに LINE を紐付けられるリスクがある。

**修正後のコード例**:

```typescript
import crypto from 'crypto';

// 現状: Math.random() — 予測可能
// const code = String(Math.floor(100000 + Math.random() * 900000));

// 修正: crypto.randomInt — 暗号学的に安全
const code = String(crypto.randomInt(100000, 999999));
```

### 1.2 [高] ペット経済のレースコンディション（ポイント二重消費）

**該当箇所**: `api/pet/buy/route.ts`, `api/pet/feed/route.ts`, `api/pet/minigame/route.ts`

全て「読み取り→判定→更新」パターンで、並行リクエストでポイントがマイナスになりうる。

```typescript
// 現状（pet/buy/route.ts 要約）:
const stats = await prisma.userGameStats.findUnique(...);
if (stats.totalPoints < cost) return error;
await prisma.userGameStats.update({ data: { totalPoints: stats.totalPoints - cost } });
// ↑ 2つのリクエストが同時に実行されると、両方が残高チェックを通過する
```

**修正後のコード例**:

```typescript
// Prisma のアトミック演算 + DB制約で防御
const result = await prisma.$transaction(async (tx) => {
  const stats = await tx.userGameStats.update({
    where: { userId: session.userId },
    data: { totalPoints: { decrement: cost } },
  });
  if (stats.totalPoints < 0) {
    throw new Error('INSUFFICIENT_POINTS');
  }
  await tx.userPetInventory.upsert({
    where: { userId_itemId: { userId: session.userId, itemId } },
    create: { userId: session.userId, itemId, quantity: 1 },
    update: { quantity: { increment: 1 } },
  });
  return stats;
});
```

### 1.3 [中] サブルート4件でエラー内部情報が漏洩

| ファイル | 漏洩内容 |
|---|---|
| `api/insights/route.ts` L83 | `error.message` がそのままJSON応答に含まれる |
| `api/push-subscribe/route.ts` L79 | `error.message.includes('does not exist')` でDB構造が推測可能 |
| `api/line/link-request/route.ts` L38 | エラーメッセージに「prisma db push を実行」と表示 |
| `api/line/setup-richmenu/route.ts` L39 | `error.message` がそのまま返される |

**修正方針**: 全箇所で `errorResponse('処理に失敗しました', 500)` に統一。

### 1.4 [中] `line/setup-richmenu` に管理者チェックがない

**該当箇所**: `app/api/line/setup-richmenu/route.ts`

認証済みユーザーなら誰でも LINE Bot のリッチメニューを上書き可能。

**修正後のコード例**:

```typescript
// 管理者メールのホワイトリスト（環境変数で管理）
const ADMIN_EMAILS = (getServerEnv().ADMIN_EMAILS ?? '').split(',').map(e => e.trim());

return withSession(async (session) => {
  if (!ADMIN_EMAILS.includes(session.email)) {
    return errorResponse('Forbidden', 403);
  }
  // ...リッチメニュー作成処理
});
```

### 1.5 [中] `user-settings/period/route.ts` の parseJsonBody エラー無視

```typescript
// 現状: エラーレスポンスを捨てて空オブジェクトで続行
const body = parsed.ok ? parsed.data : {};
```

**修正後のコード例**:

```typescript
if (!parsed.ok) return parsed.error;
const body = parsed.data;
```

### 1.6 [低] `lib/web-push.ts` の VAPID メールがハードコード

```typescript
// 現状
subject: 'mailto:app@my-health-app.local'
// 修正: 環境変数から取得
subject: `mailto:${getServerEnv().VAPID_CONTACT_EMAIL ?? 'app@example.com'}`
```

---

## 2. コードの保守性とスパゲッティ化の判定

### 2.1 [高] `pet/page.tsx` が 611 行の巨大コンポーネント

**該当箇所**: `app/(main)/game/pet/page.tsx`

UI表示 + 状態管理 + APIハンドラー（feed, buy, equip, minigame, rename等）が1ファイルに集約。

**修正方針**: カスタムフック `usePetGame` を抽出し、UIをサブコンポーネントに分割。

```
app/(main)/game/pet/
├── page.tsx           ← UIのみ（~150行）
├── hooks/
│   └── usePetGame.ts  ← 全状態+ハンドラー（~250行）
└── components/
    ├── PetDisplay.tsx  ← ペット表示・アニメーション
    ├── PetRenameForm.tsx
    └── (既存のTab系コンポーネント)
```

**修正後のコード例（usePetGame.ts 骨格）**:

```typescript
export function usePetGame() {
  const router = useRouter();
  const [petData, setPetData] = useState<PetData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPet = useCallback(async () => {
    const res = await apiFetch('/api/pet');
    if (res.ok) setPetData(await res.json());
  }, []);

  useEffect(() => { fetchPet(); }, [fetchPet]);

  const handleFeed = useCallback(async (foodId: string) => {
    await apiPost('/api/pet/feed', { food_id: foodId });
    await fetchPet();
  }, [fetchPet]);

  const handleBuy = useCallback(async (itemId: string) => {
    await apiPost('/api/pet/buy', { item_id: itemId });
    await fetchPet();
  }, [fetchPet]);

  // ... 他のハンドラー

  return { petData, loading, handleFeed, handleBuy, /* ... */ };
}
```

### 2.2 [中] サブルート22件の冗長な内部 try/catch

`withSession()` が既にグローバル catch を提供しているのに、全サブルートが個別に try/catch を書いている。

```typescript
// 現状（22ファイル共通パターン）
return withSession(async (session) => {
  try {                        // ← 冗長：withSession が既に catch する
    // ... 処理
  } catch (error) {
    console.error('xxx error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
});

// 修正: try/catch を除去（withSession に委譲）
return withSession(async (session) => {
  // ... 処理（例外は withSession が catch → 500 を返す）
});
```

**対象ファイル**: `correlation-stats`, `game-stats`, `medication-status`, `period-status`, `insights`, `insights/[id]`, `push-subscribe`, `reminders`, `reminders/[id]`, `pet/buy`, `pet/feed`, `pet/minigame`, `pet/minigame/quiz`, `pet/outfit`, `pet/room`, `line/add-friend-url`, `line/link-request`, `line/setup-richmenu`, `line/status`, `line/unlink`, `user-settings/period`

### 2.3 [中] インデント崩れが 8+ ファイルに残存

| ファイル | 状態 |
|---|---|
| `api/pet/buy/route.ts` | 2-4スペース混在 |
| `api/pet/feed/route.ts` | 2-4スペース混在 |
| `api/pet/outfit/route.ts` | 2-4スペース混在 |
| `api/push-subscribe/route.ts` | 2-4スペース混在 |
| `api/reminders/[id]/route.ts` | 2-4スペース混在 |
| `api/line/status/route.ts` | 2-4スペース混在 |
| `api/user-settings/period/route.ts` | 2-4スペース混在 |
| `api/game-stats/route.ts` | 2-4スペース混在 |

**修正方針**: ESLint/Prettier の `--fix` で一括整形。

### 2.4 [低] `useEffect` の依存配列不備（3ファイル）

| ファイル | 問題 |
|---|---|
| `calendar/hooks/useCalendarData.ts` L82 | `fetchLogs` が deps に無い |
| `game/pet/page.tsx` L136 | `fetchPet` が deps に無い |
| `reminders/page.tsx` L57 | `fetchReminders` が deps に無い |

---

## 3. 重複（DRY原則）と効率性

### 3.1 [高] `errorResponse()` がサブルート22件で未採用

Phase 1 で `errorResponse()` を導入したが、主要ルート（advice, report, health-logs 等）でのみ適用。残り22件のサブルートは旧来の `new NextResponse('text', { status })` パターンのまま。

**影響**: エラーレスポンス形式が依然不統一（plain text / JSON混在）。フロントエンドのエラーハンドリングが複雑化。

### 3.2 [高] `new OpenAI()` 直接生成が2件残存

| ファイル | 行 |
|---|---|
| `lib/line-chat.ts` | L109 |
| `lib/line-health-prediction.ts` | L123 |

両方とも `chatCompletion()` に置換可能。

**修正後のコード例** (`lib/line-chat.ts`):

```typescript
// 現状
const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
const completion = await openai.chat.completions.create({ ... });
return completion.choices[0]?.message?.content?.trim() ?? fallback;

// 修正
import { chatCompletion } from '@/lib/openai-client';
return await chatCompletion({
  systemPrompt,
  userContent: userMessage,
  model: 'gpt-4o-mini',
  temperature: 0.7,
  fallbackMessage: fallback,
});
```

### 3.3 [中] Zod スキーマ未導入のボディ受付ルートが11件

以下のルートは `parseJsonBody` を使っているが Zod スキーマを渡していないため、手動の型チェックが散在。

| ファイル | 手動チェック例 |
|---|---|
| `medication-status/route.ts` | `typeof date !== 'string'` |
| `period-status/route.ts` | `typeof date !== 'string'` |
| `push-subscribe/route.ts` | `typeof endpoint !== 'string'` |
| `reminders/route.ts` | `typeof name !== 'string'` |
| `reminders/[id]/route.ts` | `typeof name !== 'string'` |
| `pet/buy/route.ts` | `typeof item_id !== 'string'` |
| `pet/feed/route.ts` | `typeof food_id !== 'string'` |
| `pet/outfit/route.ts` | `typeof outfit_id !== 'string'` |
| `pet/room/route.ts` | `typeof room_id !== 'string'` |
| `line/link-request/route.ts` | なし（バリデーション不足） |
| `user-settings/period/route.ts` | エラーを無視 |

**修正後のコード例** (`lib/validations/api-schemas.ts` に追加):

```typescript
export const petBuySchema = z.object({
  item_id: z.string().min(1, 'item_id required'),
});

export const petFeedSchema = z.object({
  food_id: z.string().min(1, 'food_id required'),
});

export const pushSubscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export const reminderPostSchema = z.object({
  name: z.string().min(1).max(200),
  due_date: dateStrSchema,
  scheduled_time: z.string().optional().nullable(),
  memo: z.string().max(1000).optional().nullable(),
});
```

### 3.4 [中] `lib/insights/prompts.ts` のユーザーコンテキスト部分が3重複

```typescript
// 3つのプロンプト関数で同一ブロックが3回出現
## ユーザー情報
- 既往歴: ${ctx.medicalHistory}
- 薬: ${ctx.currentMedications}
- 関心分野: ${activeModesText}
```

**修正後のコード例**:

```typescript
function buildUserContextBlock(ctx: UserContext): string {
  const modes = getActiveModesText(ctx);
  return `## ユーザー情報\n- 既往歴: ${ctx.medicalHistory}\n- 薬: ${ctx.currentMedications}\n- 関心分野: ${modes}`;
}
```

### 3.5 [低] 東京デフォルト座標が3箇所に分散

| ファイル | 定義 |
|---|---|
| `lib/constants.ts` | `DEFAULT_COORDS = { lat: 35.6762, lon: 139.6503 }` |
| `lib/weather.ts` | `lat = 35.6762, lon = 139.6503` (引数デフォルト) |
| `lib/line-health-prediction.ts` | `lat = 35.6762; lon = 139.6503` (ハードコード) |

**修正方針**: 全箇所で `DEFAULT_COORDS` をインポートして使用。

### 3.6 [低] `reminders/route.ts` の検診マッピングが2重複

GET内で同じ `checkups.map(c => ({ id, name, due_date, ... }))` が2回出現。

**修正後のコード例**:

```typescript
function toCheckupApiShape(c: CheckupReminder) {
  return { id: c.id, name: c.name, due_date: c.dueDate, scheduled_time: c.scheduledTime, memo: c.memo, created_at: c.createdAt };
}
```

### 3.7 [低] カレンダーの `logs.find()` が O(n*31)

**該当箇所**: `app/(main)/calendar/page.tsx` L46

```typescript
// 現状: 各日付で配列を線形走査
const log = logs.find(l => l.date === dateStr);

// 修正: Map に事前変換
const logMap = useMemo(() => new Map(logs.map(l => [l.date, l])), [logs]);
const log = logMap.get(dateStr); // O(1)
```

---

## 4. 改善ロードマップ

### Phase 2A: セキュリティ残件（即時対応 — 1日）

| # | 課題 | 対象ファイル | 難易度 |
|---|---|---|---|
| 1 | `Math.random()` → `crypto.randomInt()` | `line/link-request/route.ts` | 低 |
| 2 | エラー漏洩4件を `errorResponse()` に統一 | insights, push-subscribe, line/link-request, line/setup-richmenu | 低 |
| 3 | `user-settings/period` の parseJsonBody エラー無視修正 | `user-settings/period/route.ts` | 低 |
| 4 | `line/setup-richmenu` に管理者チェック追加 | `line/setup-richmenu/route.ts` | 低 |
| 5 | ペット経済のレースコンディション修正 | pet/buy, pet/feed, pet/minigame | 中 |

### Phase 2B: DRY統一（3〜5日）

| # | 課題 | 対象ファイル | 難易度 |
|---|---|---|---|
| 6 | `line-chat.ts` / `line-health-prediction.ts` を `chatCompletion()` に統一 | lib 2ファイル | 低 |
| 7 | サブルート22件の冗長 try/catch 除去 + `errorResponse()` 採用 | api 22ファイル | 中（量が多い） |
| 8 | Zod スキーマ 11件追加 | `lib/validations/api-schemas.ts` + api 11ファイル | 中 |
| 9 | 東京デフォルト座標を `DEFAULT_COORDS` に統一 | weather.ts, line-health-prediction.ts | 低 |
| 10 | insights/prompts.ts のコンテキスト共通化 | `lib/insights/prompts.ts` | 低 |

### Phase 2C: 保守性向上（1〜2週間）

| # | 課題 | 対象ファイル | 難易度 |
|---|---|---|---|
| 11 | `pet/page.tsx` を usePetGame フック + サブコンポーネントに分割 | `game/pet/` | 高 |
| 12 | サブルート8件のインデント修正（Prettier --fix） | api 8ファイル | 低 |
| 13 | `useEffect` 依存配列修正（3ファイル） | calendar, pet/page, reminders | 低 |
| 14 | `reminders/route.ts` のマッピング重複解消 | `api/reminders/route.ts` | 低 |
| 15 | カレンダーの `logs.find()` → Map 化 | `calendar/page.tsx` | 低 |

### Phase 3: 将来対応

| # | 課題 | 難易度 |
|---|---|---|
| 16 | `lib/` フラット構成をドメイン別に再編成（前回レポートの推奨構成参照） | 高 |
| 17 | Push 通知の 410/404 購読自動クリーンアップ | 中 |
| 18 | Service Worker にバージョニング追加 | 低 |
| 19 | weather API のレスポンスキャッシュ | 中 |
| 20 | WMO 天候コード網羅 | 低 |

---

## 5. 推奨ディレクトリ構成（前回と同一・継続推奨）

```
lib/
├── ai/                    # OpenAI 関連
│   ├── openai-client.ts
│   ├── chara-settings.ts
│   ├── prompt-utils.ts
│   ├── health-log-prompt.ts
│   └── medication-prompt.ts
├── auth/                  # 認証
│   └── auth.ts
├── config/                # 設定・定数
│   ├── env.ts
│   ├── secrets.ts
│   ├── constants.ts
│   ├── record-constants.ts
│   └── dashboard-constants.ts
├── correlation/           # 相関分析（現状維持）
├── data/                  # 静的データ
├── db/                    # DB ユーティリティ
│   └── prisma.ts
├── health/                # ヘルスケアロジック
│   ├── alcohol-calc.ts
│   ├── cycle-phase.ts
│   ├── ndb-drugs.ts
│   ├── period-status.ts
│   └── medication-schedule.ts
├── insights/              # 現状維持
├── line/                  # LINE 関連（集約）
│   ├── client.ts
│   ├── chat.ts
│   ├── handlers.ts
│   ├── fallback-messages.ts
│   ├── health-prediction.ts
│   ├── messages.ts
│   ├── rate-limit.ts
│   ├── richmenu.ts
│   └── richmenu-image.ts
├── pet/                   # ペット関連
│   ├── pet-shop.ts
│   └── sudoku-6x6.ts
├── shared/                # 汎用ユーティリティ
│   ├── api-client.ts
│   ├── api-utils.ts
│   ├── date-utils.ts
│   ├── json-utils.ts
│   └── rate-limit.ts
├── types/                 # 型定義
├── validations/           # 現状維持
└── weather/               # 天気関連
    ├── weather.ts
    └── prefectures.ts
```

---

## 6. まとめ

### Phase 1 修正後の改善効果

| 指標 | Before | After | 改善幅 |
|---|---|---|---|
| タイミングセーフ Secret 比較 | 0/3 | **3/3** | +100% |
| レート制限付き AI エンドポイント | 0/3 | **3/3** | +100% |
| `errorResponse()` 採用ルート | 0/33 | **11/33** | +33% |
| OpenAI 集約クライアント使用率 | 5/8 | **6/8** | +12.5% |
| Cron N+1 クエリ解消 | 0/2 | **2/2** | +100% |
| LINE Webhook 関数行数 | 270行 | **~110行** | -59% |

### Aクラス到達に必要な残作業量

| 分野 | 現状 | Aクラスまでの残作業 | 見積もり |
|---|---|---|---|
| セキュリティ | A- | Phase 2A の5件（連携コード, レースコンディション, エラー漏洩） | **1日** |
| 保守性 | B+ | Phase 2B-2Cの10件（try/catch除去, pet分割, インデント修正） | **3〜5日** |
| DRY・効率性 | B+ | Phase 2Bの5件（errorResponse統一, Zod追加, OpenAI集約） | **3〜5日** |
| 拡張性 | B+ | Phase 3 の lib/ 再編成 | **1〜2週間** |

**結論**: Phase 2A（セキュリティ残件1日）を完了すればセキュリティはAクラス。Phase 2B（DRY統一3〜5日）まで完了すれば保守性・DRYもAクラスに到達する。全分野Aクラスは **約1〜2週間の作業** で実現可能。
