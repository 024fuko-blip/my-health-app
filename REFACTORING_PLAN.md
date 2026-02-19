# リファクタリング計画

**作成日**: 2025年2月12日  
**方針**: 1ファイル500行以内、SOLID原則、DRY原則、テスト駆動開発（TDD）

---

## 1. ファイル行数分析（500行超）

| ファイル | 行数 | 判定 |
|----------|------|------|
| app/(main)/record/page.tsx | **1548** | 要リファクタ |
| app/(main)/calendar/page.tsx | 409 | 許容（500以内） |
| app/api/health-logs/route.ts | 233 | 許容 |
| app/api/advice/route.ts | 220 | 許容 |
| その他 | < 220 | 許容 |

**対象**: `app/(main)/record/page.tsx` のみが500行超

---

## 2. record/page.tsx の構造分析

### 2.1 責務の塊（SOLID: 単一責任の原則）

| 塊 | 行数目安 | 責務 | 抽出先 |
|----|----------|------|--------|
| 生理周期ロジック | 1-118 | getCyclePhase, getTsundereComment, CyclePhase | lib/cycle-phase.ts |
| 飲酒ロジック・定数 | 121-267 | DRINK_PRESETS, AddedDrink, 分解計算, parseAlcoholType | lib/alcohol-calc.ts |
| 感情定数 | 167-175 | EMOTIONS | lib/record-constants.ts または定数ファイル |
| フォーム状態・applyLogToForm | 269-424 | 多数の state, applyLogToForm | カスタムフック useRecordForm |
| init/loadLog useEffect | 426-523 | 初期化・日付変更時の取得 | useRecordForm 内 |
| 飲酒 UI ハンドラ | 525-544 | handleAddDrink, handleRemoveDrink 等 | useRecordForm または AlcoholSection |
| 画像処理 | 546-600付近 | processImageFile | lib/image-utils.ts または hooks |
| フォーム submit | 650-820付近 | handleSubmit（AI呼び出し、DB保存） | useRecordForm 内または submit 関数 |
| IBD セクション UI | 複数箇所 | 腹痛・便・トイレ回数 | components/record/IbdSection.tsx |
| ボディメイクセクション UI | 複数箇所 | 体重・カロリー・歩数等 | components/record/DietSection.tsx |
| アルコールセクション UI | 複数箇所 | 飲酒追加・内訳・分解時間 | components/record/AlcoholSection.tsx |
| メンタルセクション UI | 複数箇所 | 感情・睡眠・日記 | components/record/MentalSection.tsx |
| 結果モーダル | 1515-1548 | ResultModal | components/record/ResultModal.tsx |

### 2.2 DRY 違反の可能性

- モード別の条件分岐（`modes.mode_ibd`, `modes.mode_diet` 等）が散在 → セクションコンポーネント化で集約
- ボタンの className パターン（active/inactive）が類似 → 共通スタイルまたはコンポーネント化
- applyLogToForm の reset ロジックが長い → リセット用オブジェクト/関数に切り出し

### 2.3 リファクタリング順序（TDD）

1. **テスト環境構築** … Vitest + API ルートテスト（getSession をモック）
2. **既存動作のテスト作成** … /api/health-logs GET, POST, /api/advice POST がモック認証下で 200 を返すことを確認
3. **ライブラリ抽出**（副作用なし・テスト容易）
   - `lib/cycle-phase.ts` … getCyclePhase, getTsundereComment
   - `lib/alcohol-calc.ts` … DRINK_PRESETS, calculateDecompositionTime, addHoursToTime, parseAlcoholTypeToAddedDrinks
   - `lib/record-constants.ts` … EMOTIONS 等
4. **コンポーネント抽出**
   - IbdSection, DietSection, AlcoholSection, MentalSection
   - ResultModal
5. **カスタムフック抽出** … useRecordForm（state, applyLogToForm, submit）
6. **record/page.tsx の統合** … 500行以内に収める
7. **テスト再実行** … 200 確認、リグレッションなし

---

## 3. テスト戦略

### 3.1 テスト対象

| 種類 | 対象 | 確認内容 |
|------|------|----------|
| API 単体 | /api/health-logs | GET: 認証あり → 200, 認証なし → 401 |
| API 単体 | /api/health-logs | POST: 認証あり + 正当 body → 200 |
| API 単体 | /api/advice | POST: 認証あり + 正当 body → 200 |
| ユニット | lib/cycle-phase.ts | getCyclePhase の戻り値が期待通り |
| ユニット | lib/alcohol-calc.ts | 分解時間計算が正しい |

### 3.2 ツール

- **Vitest** … 単体・API ルートテスト
- **モック** … vi.mock('@/lib/auth') で getSession を偽装

### 3.3 200 確認の定義

- API ルート: モック認証で `NextResponse.json(...)` が status 200 相当で返ることを検証
- フロント: リファクタ後の record/page がレンダリング可能（React Testing Library の render がエラーにならない）ことも確認

---

## 4. 実行チェックリスト

- [x] Vitest セットアップ
- [x] API テスト作成（health-logs, advice）
- [x] 現状のテスト実行（200 確認）
- [x] lib/cycle-phase.ts 抽出 + テスト
- [x] lib/alcohol-calc.ts 抽出 + テスト
- [x] lib/record-constants.ts 抽出
- [x] IbdSection 等 UI コンポーネント抽出
- [x] useRecordForm 抽出
- [x] record/page.tsx 統合（500行以内 → 219行達成）
- [x] 全テスト再実行・リグレッション確認
