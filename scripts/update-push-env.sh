#!/bin/bash
# プッシュ通知用の環境変数を Cloud Run に追加
# 使用例:
#   export VAPID_PUBLIC_KEY="your_public_key"
#   export VAPID_PRIVATE_KEY="your_private_key"
#   export CRON_SECRET="your_random_secret"
#   ./scripts/update-push-env.sh
#
# または:
#   VAPID_PUBLIC_KEY=xxx VAPID_PRIVATE_KEY=yyy CRON_SECRET=zzz ./scripts/update-push-env.sh

set -e
PROJECT=my-health-app-485805
SERVICE=my-health-apps
REGION=asia-northeast2

if [[ -z "$VAPID_PUBLIC_KEY" || -z "$VAPID_PRIVATE_KEY" || -z "$CRON_SECRET" ]]; then
  echo "VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, CRON_SECRET を設定してください"
  echo "例: npx web-push generate-vapid-keys でキーを生成"
  exit 1
fi

gcloud run services update "$SERVICE" \
  --project "$PROJECT" \
  --region "$REGION" \
  --update-env-vars "VAPID_PUBLIC_KEY=$VAPID_PUBLIC_KEY,VAPID_PRIVATE_KEY=$VAPID_PRIVATE_KEY,CRON_SECRET=$CRON_SECRET"

echo "環境変数を更新しました"
