# セキュリティ修正計画

**作成日**: 2025年2月12日  
**参照**: SECURITY_AUDIT_REPORT.md

---

## 修正項目と実行順序

| # | 項目 | 優先度 | 工数 | 対応内容 |
|---|------|--------|------|----------|
| 1 | セキュリティヘッダー追加 | 高 | 小 | next.config.ts に X-Frame-Options, X-Content-Type-Options 等を追加 |
| 2 | /api/analyze-meal を Middleware に追加 | 高 | 小 | middleware.ts の isAuthRequired に pathname.startsWith('/api/analyze-meal') を追加 |
| 3 | allowDangerousEmailAccountLinking の見直し | 高 | 小 | lib/auth.ts を false に変更（同一メールでのアカウント乗っ取りリスク低減） |
| 4 | Server Actions bodySizeLimit | 中 | 小 | 4mb → 2mb に変更（DoS リスク低減） |
| 5 | Next.js 脆弱性対応 | 高 | 中 | npm update next でパッチ適用（破壊的変更に注意） |

**保留・別途対応**:
- `npm audit fix --force` … breaking change のため、ESLint 系は別チケットで段階的アップデート
- `ignoreBuildErrors` 解除 … 型エラー修正が必要なため大工数、別チケット
- レートリミット … 新規実装のため中〜大工数、別チケット

---

## 実行チェックリスト

- [x] 1. セキュリティヘッダー追加
- [x] 2. Middleware に /api/analyze-meal 追加
- [x] 3. allowDangerousEmailAccountLinking → false
- [x] 4. bodySizeLimit 2mb
- [x] 5. npm update next（16.1.6 へアップデート済み）
- [x] ビルド成功確認
- [ ] ローカル動作確認
