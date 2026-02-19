# LINE 連携 環境変数・キー一覧

## 一覧表

| 変数名 | 取得場所 | 用途 | 必須 |
|--------|----------|------|------|
| LINE_CHANNEL_ID | LINE Developers → Basic settings → Channel ID | Messaging API 認証 | ○（連携するなら） |
| LINE_CHANNEL_SECRET | LINE Developers → Basic settings → Channel secret | Webhook 署名検証 | ○ |
| LINE_CHANNEL_ACCESS_TOKEN | LINE Developers → Messaging API → Channel access token（長期） | プッシュ・返信送信 | ○ |
| LINE_BOT_BASIC_ID | LINE Developers → Basic settings → Bot basic ID（例: @156ipswe） | 友だち追加URL生成 | △（どちらか） |
| LINE_ADD_FRIEND_URL | LINE Developers または lin.ee の短縮URL | 友だち追加リンク | △（どちらか） |

## 取得手順（LINE Developers Console）

1. [LINE Developers Console](https://developers.line.biz/console/) にログイン
2. プロバイダー → チャネル（Messaging API）を選択
3. **Basic settings** タブ
   - **Channel ID** → `LINE_CHANNEL_ID`
   - **Channel secret** → `LINE_CHANNEL_SECRET`
   - **Bot basic ID** → `@156ipswe` のような値（`@` なしで `LINE_BOT_BASIC_ID=156ipswe` として設定可）
4. **Messaging API** タブ
   - **Channel access token** → 「発行」で長期トークンを取得 → `LINE_CHANNEL_ACCESS_TOKEN`
5. **Messaging API** タブ
   - **Webhook URL** → `https://あなたのドメイン/api/line/webhook` を設定して有効化
6. 友だち追加URL（任意）
   - `LINE_BOT_BASIC_ID` を設定すれば `https://line.me/R/ti/p/@BASIC_ID` が自動生成される
   - または lin.ee の短縮URLを `LINE_ADD_FRIEND_URL` に設定

## Secret Manager への設定例（setup-secrets 用の入力元）

```env
# LINE 連携（Messaging API 必須3つ）
LINE_CHANNEL_ID=1234567890
LINE_CHANNEL_SECRET=abcdef1234567890abcdef1234567890
LINE_CHANNEL_ACCESS_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 友だち追加URL（いずれか）
LINE_BOT_BASIC_ID=156ipswe
# または
# LINE_ADD_FRIEND_URL=https://line.me/R/ti/p/@156ipswe
```

## 本番（Secret Manager）

Secret Manager に上記変数名と同じ名前でシークレットを作成してください。
- `LINE_CHANNEL_ID`
- `LINE_CHANNEL_SECRET`
- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_BOT_BASIC_ID` または `LINE_ADD_FRIEND_URL`
