# game/pet/page.tsx リファクタリング計画

**対象**: `app/(main)/game/pet/page.tsx` (541行)

---

## 1. SOLID診断：複数責務を抱えている箇所

| 箇所 | 責務が混在している内容 | 単一責務への分割提案 |
|------|------------------------|------------------------|
| **GamePetPage 本体** | ① データ取得・認証 ② ペットCRUD ③ 餌/衣装の購入・使用 ④ 全UI表示 | データ・ハンドラを usePetGame に、UIをコンポーネントに分離 |
| **handleCreatePet** | フォーム送信 + エラー表示 + リダイレクト | フォーム送信ロジックとUIを分離 |
| **details 内 form** | ペット更新 + フォームUI（handleCreatePetとほぼ同一） | 共通化して CreatePetForm / EditPetForm に |
| **メッセージ表示** | 成功/失敗の判定（`includes("失敗")`等）とスタイル適用が同じロジックで複数箇所 | StatusMessage コンポーネントに集約 |
| **餌タブ / 衣装タブ** | 所持一覧 + ショップ一覧 + 購入/使用ボタン | FeedTab / OutfitTab に分離 |

---

## 2. DRY診断：共通化できるロジック

| 重複パターン | 出現箇所 | 共通化先 |
|--------------|----------|----------|
| **認証チェック + fetch + 401時redirect** | fetchPet, handleCreatePet, handleFeed, handleBuy, handleEquip | `lib/api-client.ts` の `fetchWithAuth()` または `usePetGame` 内で集約 |
| **成功/失敗メッセージの表示** | 行218-225, 行377-381（判定ロジックは微妙に異なる） | `components/StatusMessage.tsx`（または game/pet/components 内） |
| **PET_SPECIES 選択ボタン** | 行250-265（作成フォーム）, 行355-368（編集フォーム） | `SpeciesSelector` コンポーネント |
| **ショップアイテム行のレイアウト** | 餌（行327-361）, 衣装（行396-416）構造が類似 | `PetShopItemRow` コンポーネント（共通レイアウト） |
| **日数計算** | 行323: `Math.floor((Date.now()-new Date(...))/...)` | `lib/date-utils.ts` の `daysSince(dateStr: string): number` |
| **タブボタンの active スタイル** | feed/outfit タブ（行389-407） | 共通 `TabButton` または既存UIパターンとして切り出し |

---

## 3. 分割後のファイル構成と依存関係

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  app/(main)/game/pet/page.tsx  (メイン：〜150行)                              │
│  - usePetGame 呼び出し                                                       │
│  - レイアウト・コンポーネント組み立て                                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
┌──────────────────────────┐ ┌─────────────────────┐ ┌────────────────────────┐
│ hooks/usePetGame.ts      │ │ components/         │ │ components/             │
│ - fetchPet               │ │ CreatePetForm.tsx   │ │ PetDisplay.tsx         │
│ - handleCreatePet        │ │ - 名前入力           │ │ - ペット表示            │
│ - handleFeed/Buy/Equip   │ │ - SpeciesSelector   │ │ - 幸福度バー             │
│ - state管理              │ │ - 迎えるボタン       │ │ - 編集フォーム(details)  │
└──────────────────────────┘ └─────────────────────┘ └────────────────────────┘
                    │                 │                         │
                    │                 └──────────┬───────────────┘
                    ▼                            ▼
┌──────────────────────────┐         ┌─────────────────────────┐
│ components/              │         │ components/             │
│ FeedTab.tsx              │         │ SpeciesSelector.tsx     │
│ OutfitTab.tsx            │         │ StatusMessage.tsx       │
│ - 所持一覧 + ショップ     │         │ - 成功/失敗メッセージ    │
└──────────────────────────┘         └─────────────────────────┘
                    │                            │
                    ▼                            ▼
┌──────────────────────────┐         ┌─────────────────────────┐
│ lib/game/pet-types.ts    │         │ lib/pet-shop.ts (既存)   │
│ - PetState, FoodItem,    │         │ - PET_SPECIES等          │
│   OutfitItem, PetData    │         └─────────────────────────┘
└──────────────────────────┘
                    │
                    ▼
┌──────────────────────────┐
│ lib/date-utils.ts (新規)  │
│ - daysSince(dateStr)     │
└──────────────────────────┘
```

---

## 4. 安全な分割の手順（依存関係の図・実行順）

```
[Step 1] 型定義の切り出し（依存なし）
    lib/game/pet-types.ts  ← PetState, FoodItem, OutfitItem, PetData

[Step 2] ユーティリティの追加（既存libに依存するのみ）
    lib/date-utils.ts     ← daysSince()  ※他画面でも利用可

[Step 3] 共通UIコンポーネント（型・既存libに依存）
    components/SpeciesSelector.tsx   ← PET_SPECIES 選択
    components/StatusMessage.tsx     ← メッセージ表示

[Step 4] フォーム・表示コンポーネント
    components/CreatePetForm.tsx     ← 迎え入れフォーム（SpeciesSelector利用）
    components/PetDisplay.tsx        ← ペットカード（編集フォーム含む）
    components/FeedTab.tsx           ← 餌タブ
    components/OutfitTab.tsx         ← 衣装タブ

[Step 5] カスタムフック（API呼び出し・state）
    hooks/usePetGame.ts              ← fetchPet, 各種handle, state

[Step 6] メインページの簡素化
    page.tsx                         ← usePetGame + コンポーネント組み立て
```

---

## 5. 各ファイルの責務（単一責任）

| ファイル | 責務 |
|----------|------|
| `lib/game/pet-types.ts` | ペット関連の型定義のみ |
| `lib/date-utils.ts` | 日付計算ユーティリティ |
| `SpeciesSelector.tsx` | 種類選択UIのみ |
| `StatusMessage.tsx` | 成功/失敗メッセージ表示のみ |
| `CreatePetForm.tsx` | ペット作成フォームのみ |
| `PetDisplay.tsx` | ペット表示＋編集フォーム |
| `FeedTab.tsx` | 餌の所持一覧＋ショップ |
| `OutfitTab.tsx` | 衣装の着せ替え＋ショップ |
| `usePetGame.ts` | データ取得・API呼び出し・状態管理 |
| `page.tsx` | レイアウト・コンポーネント組み立てのみ |

---

## 6. 想定行数（目安）

| ファイル | 行数目安 |
|----------|----------|
| page.tsx | ～120 |
| usePetGame.ts | ～120 |
| PetDisplay.tsx | ～100 |
| FeedTab.tsx | ～90 |
| OutfitTab.tsx | ～80 |
| CreatePetForm.tsx | ～60 |
| PetDisplay.tsx（編集込） | ～100 |
| その他（型・utils・小コンポーネント） | 各 ～50 |

合計 541 行を複数ファイルに分散し、各ファイル 500 行以内を維持。
