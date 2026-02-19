# 進捗レポート

**更新日**: 2025年2月12日

---

## 1. 全ファイル500行前後へのリファクタリング

### 1.1 対象ファイルと現状

| ファイル | 行数 | 目標 | ステータス |
|----------|------|------|------------|
| **useRecordForm.ts** | 494 | ≤500 | ✅ 達成 |
| **game/pet/page.tsx** | 541 | ≤500 | ⏳ 未着手 |
| package-lock.json | 約9000 | — | 除外（自動生成のため手動編集不可） |

### 1.2 useRecordForm.ts の対応内容（619行→494行）

以下のモジュールへ分割して行数を削減：

| 抽出先 | 内容 | 行数 |
|--------|------|------|
| `hooks/record-form-types.ts` | HealthLogRow, UserSettingsMode, NutritionData | 39 |
| `hooks/record-form-utils.ts` | applyLogToForm | 139 |
| `hooks/meal-image-handler.ts` | processMealImageFile（食事画像処理） | 80 |

### 1.3 残タスク

- **game/pet/page.tsx**（541行）：500行以下にするため、コンポーネント・フック・型などの分割が必要

---

## 2. ビルド・テスト

| 項目 | 結果 |
|------|------|
| `npm run build` | ✅ 成功 |
| `npm run test` | 要確認 |

---

## 3. 500行を超えるファイル一覧（現時点）

- `game/pet/page.tsx` … 541行

---

## 4. 参考：全ソースファイルの行数（主要）

**TS/TSX:**
- record/page.tsx: 219
- record/hooks/useRecordForm.ts: 494
- game/pet/page.tsx: 541 ← 次に対象
- calendar/page.tsx: 409
- dashboard/page.tsx: 307
- settings/health/page.tsx: 310
- その他: 200行以下
