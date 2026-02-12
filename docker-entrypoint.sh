#!/bin/sh
set -e
# スキーマ変更をDBに反映（失敗時は無視して起動を継続）
npx prisma db push --skip-generate 2>/dev/null || true
exec node server.js
