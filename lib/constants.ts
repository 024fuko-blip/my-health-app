/**
 * アプリ全体で共有する定数（DRY 原則）
 */

/** 画像 Base64 の最大サイズ（3MB、DoS 防止） */
export const MAX_IMAGE_BASE64 = 3 * 1024 * 1024;

/** デフォルト生理周期（日数） */
export const DEFAULT_PERIOD_CYCLE = 28;

/** デフォルト生理期間（日数） */
export const DEFAULT_PERIOD_DURATION = 5;

/** HTTP ステータスコード（DRY・意図の明確化） */
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/** 認証・ナビゲーション用パス */
export const PATH = {
  LOGIN: '/login',
} as const;
