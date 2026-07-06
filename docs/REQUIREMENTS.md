# 要件定義書（my-health-app）

- 作成日: 2026-07-06
- ステータス: **第2版（主要方針確定・実装フェーズ移行準備中）**
- 位置づけ: 本ドキュメントが本プロジェクトの正式な要件定義書。`backup_documentation.md`（技術構成・再構築手順）と `.cursor/rules/*.mdc`（開発規約）を補足資料として参照する。旧・重複監査ドキュメント群（CODE_AUDIT_*, SECURITY_*等）は削除済み。

【要決定】マークがある箇所は、まだユーザーと合意できていない項目。それ以外は現状の実装・過去の合意事項に基づく確定事項。

---

## 1. 概要・目的・ターゲットユーザー

### 1.1 プロダクトの目的
IBD（炎症性腸疾患）を中心に、体調・食事・服薬・生活習慣を毎日記録し、AIが「ツンデレの鬼コーチ」人格でフィードバックすることで、記録の継続と体調管理の質を上げるパーソナルヘルスケアアプリ。単なるロギングツールではなく、**因果関係の発見**（例:「〇〇を食べた翌日は腹痛が出る」）と**継続のためのゲーミフィケーション**を核とする。

### 1.2 ターゲットユーザー
- **規模**: 少人数限定公開（開発者本人 + 家族・友人。数名〜数十名程度を想定）。不特定多数向けの一般公開SaaSは現時点のスコープ外。
- 現状はIBD特化の設計だが、**他の慢性疾患ユーザーへの汎用化も将来検討する**（モード制の仕組みを疾患非依存な形に一般化できるかを見据える）。
- 想定ユーザー像: 慢性疾患（IBD等）を抱え、日々の体調・食事・服薬管理が必要な人。医療従事者向け機能（診断・処方提案等）は対象外。

### 1.3 チャネルの位置づけ
- **Webアプリが主**。詳細な記録入力・グラフ分析・設定変更はすべてWebで完結させる。
- **LINEは補助**。プッシュ通知が届きにくい/開かない問題を補うための「通知」と「簡易記録」（例:「体調4」とLINEに送るだけで記録できる）が役割。LINEだけで完結する体験は目指さない。

### 1.4 対象外（スコープ外）とするもの
- 医療診断・処方（あくまで生活記録とAIの気づき提示に留める。医療行為の代替ではない旨をconsentページで明示する）
- 不特定多数への一般公開・多言語化（マルチテナントSaaS化）
- Web/LINE以外のチャネル（ネイティブアプリ、Slack等）

---

## 2. アーキテクチャ・技術スタック

| レイヤ | 技術 |
|---|---|
| フロントエンド | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS |
| BFF / API | Next.js Route Handlers (`app/api/**/route.ts`) |
| 認証 | NextAuth (v4) + `@next-auth/prisma-adapter`。**Google OAuthのみ**（メール/パスワード認証は廃止済み。`User.password`は互換のため残存するのみで未使用）。セッションはJWT戦略、有効期限7日。 |
| DB | PostgreSQL（Google Cloud SQL）+ Prisma ORM |
| AI | OpenAI API（`gpt-4o-mini`通常、画像解析時`gpt-4o` Vision） |
| 外部連携 | LINE Messaging API（Webhook・リッチメニュー）、Web Push（`web-push`ライブラリ）、天気API（`lib/weather.ts`） |
| インフラ | Google Cloud Run（コンテナ実行）+ Cloud Build（CI/CD）+ Secret Manager |
| 運用方針 | **本番環境のみで開発**（ローカル `npm run dev` は使わず、Cloud Run上の実環境で確認する運用）。デプロイは `git push` → Cloud Build 自動トリガー。 |
| テスト | Vitest（`vitest.config.ts`、一部ユニットテストのみ: `alcohol-calc.test.ts`, `cycle-phase.test.ts`, `health-logs/route.test.ts`） |

### 2.1 環境変数管理
- `process.env` 直接参照は禁止。サーバー用は必ず `lib/env.ts` の `getServerEnv()` を経由（バリデーション済みスキーマ）。
- シークレットにデフォルト値（`"temporary-secret"`等）を設定しない。未設定時は実行時エラーで落とす。
- Secret Manager経由の取得は `lib/secrets.ts` を使用（`scripts/setup-secrets.mjs`, `scripts/grant-secret-access.mjs` で運用）。

---

## 3. 機能要件

### 3.1 認証
- Google OAuthのみでログイン（`allowDangerousEmailAccountLinking: false`）。
- 新規登録ページ（`app/(auth)/register`）はGoogleログインへの導線。
- 未認証ユーザーは `middleware.ts` によって保護ページ・保護APIから `/login` にリダイレクト/401。
- **確定**: Google OAuthのみを正式な認証方式とする。少人数限定公開の想定ユーザーは全員Googleアカウントを保有している前提のため、他のOAuthプロバイダやパスワード認証の復活は行わない。パスワードリセット機能も概念ごと不要。

### 3.2 日次記録（`/record`）
ユーザーがONにしているモードに応じて記録セクションが動的に出し分けられる。

| セクション | 主な項目 | 対応モード |
|---|---|---|
| 基本情報 | 日付・体調(1-5)・体温・服薬チェック・生理ステータス（女性設定時） | 常時 |
| 食事 | 食事メモ（テキスト）＋写真（GPT-4o Visionで栄養解析） | 常時 |
| IBD | 腹痛レベル(1-5)・便の状態（普通/軟便/下痢/血便） | mode_ibd |
| ボディメイク | 体脂肪・カロリー・タンパク質・歩数（体重は基本情報を参照表示） | mode_diet |
| アルコール | 飲酒プリセット選択・純アルコール量自動計算・飲酒理由 | mode_alcohol |
| メンタル | 感情選択（7種の絵文字）・睡眠の質（悪い/普通/良い）・ひとこと日記 | mode_mental |

保存は同一日付につき upsert（1日1レコード、`@@unique([userId, date])`）。保存時にAIアドバイス生成 → `ai_comment` として記録に紐付け。

**対応済みギャップ（2026-07-06 実装フェーズで修正）**:
- ~~`exercise_minutes`（運動時間）の入力UI欠落~~ → `DietSection.tsx`（通常版）・`record/cards/page.tsx`（カード版）の両方に入力欄を追加済み。保存・読み込み（`buildRecordPayload`, `applyLogToForm`）は元々配線済みだったため、UI追加のみで解消。
- ついでに、`DietSection.tsx` の各入力が `onUserEdit` を呼んでいなかった点（他セクションと不整合で、日付切替時の再取得により入力中の値が上書きされ得るバグ）も同時に修正。

**現状確認できている仕様上の注記**:
- `stress_level`（DBフィールド、旧仕様の1-10スケール）は、現在のUIでは直接入力されておらず、メンタルモードの感情選択（`selectedEmotion`、7種の絵文字ID）をそのまま`stress_level`として送信する設計に置き換わっている。動作上の不具合ではないが、フィールド名と実際の意味（感情ID）が乖離しているため、将来的にリネームまたはドキュメント化が望ましい。

### 3.3 AIアドバイス（`/api/advice`）
- 4種類のAI人格（`ai_personality`: tsundere・kibishime・amayama・naruse）から選択可能（設定画面）。
- 優先順位ルール: ①体調急変・危険信号（腹痛3以上・血便等）は最優先でダイエット/運動の話をせず安静を促す ②生活習慣の矛盾（体調不良時の飲酒等）を指摘 ③通常のフィードバック ④頑張った日は素直に褒める（デレ）。
- 食事写真がある場合は栄養解析（品目・カロリー目安）も加味。
- 既往歴・服薬情報はフロントから送信させず、必ずAPI内で`user_settings`から取得（機微情報の露出防止）。

### 3.4 ダッシュボード・カレンダー（`/dashboard`, `/calendar`）
- ダッシュボード: 7日/30日切替の推移グラフ（体調・腹痛・ストレス等）、期間AIレポート（因果関係分析）、相関マップ、トリガーカード、服薬状況カード等。
- カレンダー: 月表示（体調で色分け）、日別の詳細閲覧・編集・削除。

### 3.5 相関分析・AIインサイトエンジン
- `lib/correlation/*`: Pearson相関係数の計算とトリガー検出（例:「飲酒した日は翌日の体調が悪化しやすい」）を`UserCorrelationStats`に保存。`/api/correlation-stats`で取得。
- `lib/insights/*`: 週次・月次・年次でAIが生成する「気づき」を`Insight`テーブルに保存。Cron (`/api/cron/generate-insights`) で定期生成。

### 3.6 LINE連携（補助チャネル）
- Webhook（署名検証あり）でLINEメッセージを受信し、「体調4」のような自然文コマンドで簡易記録が可能（`lib/line-handlers.ts`）。
- リッチメニュー経由でよく使う機能への導線を提供。
- 連携は「連携コード」方式（`LineLinkRequest`で有効期限付きコード発行 → LINE側で入力して`LineLink`を作成）。
- 毎朝、天気・花粉情報を加味したAIメッセージをLINEで配信（`send-morning-line`、Cron）。
- **確定**: LINEのみで記録・利用しているユーザーへのリマインド対応（未記入時のリマインド、毎朝メッセージ等）は既知の未対応項目だが、優先度を上げて対応する（7章ロードマップP1）。Webが主軸という方針は変えないが、「Webを開かないユーザーを取りこぼさない」ことを補助チャネルの重要要件とする。

### 3.7 リマインダー・プッシュ通知
- 服薬・検診リマインダー（`CheckupReminder`）をWeb Push または LINE で送信。
- Cron (`/api/cron/send-reminders`、15分毎)で期限チェック。
- ブラウザのPush購読は`PushSubscription`で管理。

### 3.8 ペット育成ゲーム（`/game/pet`）
- **位置づけ: 記録継続のためのインセンティブ機構として明確に維持・継続する。**
- 記録・ログイン等の行動でポイント・経験値を獲得し、ペット（猫・犬・うさぎ）を育成。餌やり・着せ替え・部屋の家具配置・ショップでのアイテム購入。
- ミニゲーム4種（キャッチ、メモリー、クイズ、6x6数独）でもポイント獲得可能。
- ポイント経済は`prisma.$transaction`で保護済み（二重取得・レースコンディション対策済み）。
- **確定**: 拡張優先度は中。まずP0（コア安定化）を優先し、その後に新ペット種・新ミニゲーム等の拡張に着手する（7章ロードマップP3）。

### 3.9 お薬DB検索
- 厚労省NDBオープンデータ（`001495390.csv`、実体はExcel）を`scripts/convert-ndb-to-json.py`で`lib/data/ndb-drugs.json`に変換し、`/api/drugs/search`で検索可能。
- 服薬管理（`MedicationManager`）と連携し、処方薬名の入力補助として使用。

### 3.10 生理周期予測
- `lib/cycle-phase.ts`で周期フェーズ（生理前/生理中等）を推定し、AIアドバイスや設定画面（`PeriodCycleSettings`）に反映。性別設定が女性の場合のみ表示。

### 3.11 設定（`/settings`）
- `basic`（プロフィール・性別・生年月日等）、`health`（既往歴・服薬・生理周期）、`profile`（AI人格・表示名等）の3ページに分割。
- モードON/OFF切り替え（IBD/アルコール/メンタル/ボディメイク）。
- LINE連携カード、Push通知許可設定。

### 3.12 法務・同意
- `app/consent`, `app/privacy`, `app/terms` で利用規約・プライバシーポリシー・医療行為ではない旨の同意を取得。

---

## 4. データモデル概要

主要Prismaモデル（詳細は`prisma/schema.prisma`参照）:

- **認証系**: `User`, `Account`, `Session`, `VerificationToken`（NextAuth標準）
- **LINE**: `LineLink`, `LineLinkRequest`
- **通知**: `PushSubscription`, `CheckupReminder`
- **設定**: `UserSettings`（モードフラグ・既往歴・AI人格・身長体重・位置情報等）
- **記録**: `HealthLog`（1ユーザー1日1レコード、IBD/ボディメイク/アルコール/メンタル/生理の全項目を1レコードに集約）
- **分析**: `Insight`（週次/月次/年次AI生成インサイト）, `UserCorrelationStats`（相関・トリガー）
- **ゲーム**: `UserGameStats`（ポイント・連続記録日数・バッジ）, `UserPet`, `UserPetInventory`

---

## 5. 非機能要件

### 5.1 セキュリティ（`APP_DIAGNOSTIC_REPORT.md`（削除済み・2026-02-26時点）の評価を正として踏襲）
- 認証はGoogle OAuthのみ、`getSession`/`requireSession`経由でAPI保護。
- LINE Webhookは署名検証あり、タイミングセーフ比較を使用。
- 機微情報（既往歴・服薬）はクライアントからPOSTさせずAPI内でDB取得。
- CSPヘッダー導入済みだが `script-src 'unsafe-inline'` が残存（nonceベースへの移行は未着手）。
- レート制限はインスタンスローカルな`Map`実装（Cloud Run複数インスタンスでは制限が緩くなる制約が残る）。
- Secret ManagerでAPIキー等を管理、コードにハードコードしない。

### 5.2 可用性・運用
- Google Cloud Run（オートスケール）+ Cloud SQL。
- Cronジョブ（reminders送信・insights生成・朝のLINEメッセージ）はCloud Scheduler等から`/api/cron/*`を呼ぶ想定。
- デプロイはCloud Buildで自動化、本番環境のみで検証する運用方針（ローカル開発環境は正式にサポートしない）。

### 5.3 コーディング規約（詳細は`.cursorrules`, `.cursor/rules/*.mdc`を参照）
- 1ファイル500行以内を目安に分割（SOLID/DRY）。
- `any`禁止、型定義を必ず用意。
- 新機能追加時は`app/guide/page.tsx`（使い方ガイド）を更新する。
- Supabase関連コードは全面禁止（Prisma + Cloud SQLに統一済み）。

---

## 6. 既知の技術的負債・積み残し課題

過去の監査（削除済みの`APP_DIAGNOSTIC_REPORT.md`等）から、コード確認で現時点でも残存が濃厚と判断したもの:

1. レート制限がインスタンスローカル（Cloud Run複数インスタンスで実効性が下がる）
2. CSPの `unsafe-inline` が残存（nonceベースXSS対策が未完了）
3. `lib/`がフラット構成のまま（ドメイン別再編成: `ai/`, `auth/`, `line/`, `pet/`, `weather/`等への整理が未着手）
4. `errorResponse()`共通化の採用が一部ルートに留まる（全APIルートへの統一が未完了）
5. 一部APIルート（pet/buy, pet/feed, pet/outfit, pet/room, reminders等）でZodスキーマ未導入の可能性（要個別確認）
6. 日次記録の`exercise_minutes`未入力・`stress_level`とUIの対応不整合（3.2節参照）

---

## 7. 今後のロードマップ（確定）

- **P0（安定化）**: 6章の技術的負債のうち影響度が高いもの（レート制限の永続化、日次記録の入力欠落修正）の解消
- **P1（LINE補助チャネルの充実）**: LINEのみで記録・利用しているユーザーへのリマインド対応（未記入リマインド・毎朝メッセージ等、既知の未対応項目への対応）
- **P2（コア体験強化）**: 相関分析・インサイトの精度向上、AIアドバイスの一貫性向上
- **P3（ゲーミフィケーション拡張）**: ペットゲームの新要素追加（コア安定化後、中優先度）
- **P4（疾患汎用化の検証）**: IBD以外の慢性疾患ユーザーを見据えたモード設計の一般化

---

## 8. 開発規約への参照
本ドキュメントの機能要件・アーキテクチャ方針は、以下の既存規約と矛盾しないことを前提とする。齟齬が見つかった場合は本ドキュメントを正とし、規約側を追従修正する。
- `.cursorrules`
- `.cursor/rules/project-conventions.mdc`
- `.cursor/rules/auth-middleware.mdc`
- `.cursor/rules/deploy-production.mdc`
- `.cursor/rules/guide-update.mdc`
- `.cursor/rules/periodic-audit.mdc`
