/**
 * サーバー用環境変数スキーマ。
 * process.env を直接参照せず、このモジュールを経由して使用する。
 * ビルド時（next build / CI）では getServerEnv() はダミー値を返し、validateRuntimeEnv はスキップする。
 */

/** ビルド中かどうか（next build や CI では true） */
function isBuildTime(): boolean {
  return (
    process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.CI === 'true' ||
    process.env.CI === '1'
  );
}

/**
 * ランタイム検証（validateRuntimeEnv）をスキップすべきか。
 * ビルド時・Edge ランタイム時は true。instrumentation から使用。
 */
export function shouldSkipRuntimeValidation(): boolean {
  return isBuildTime() || process.env.NEXT_RUNTIME !== 'nodejs';
}

/** 必須環境変数名（ランタイム起動時チェック用） */
export const REQUIRED_RUNTIME_ENV_KEYS = [
  'AUTH_SECRET',
  'DATABASE_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'NEXTAUTH_URL',
] as const;

/**
 * ランタイム起動時（コンテナ立ち上げ時）に呼び出すバリデーション。
 * ビルド時（CI や next build）はスキップする。instrumentation.ts から呼ぶ想定。
 * AUTH_SECRET, DATABASE_URL, GOOGLE_*, NEXTAUTH_URL が未設定なら即座に throw する。
 */
export function validateRuntimeEnv(): void {
  if (isBuildTime()) return;

  const env = process.env as Record<string, string | undefined>;
  const missingKeys = REQUIRED_RUNTIME_ENV_KEYS.filter(
    (key) => !env[key] || env[key]?.trim() === ''
  );

  if (missingKeys.length > 0) {
    const errorMessage = `
[Runtime Env] 必須の環境変数が未設定です。コンテナ実行時に設定してください。
未設定: ${missingKeys.join(', ')}
例: Docker の -e AUTH_SECRET=xxx -e DATABASE_URL=postgresql://... 
    または Cloud Run の環境変数設定画面で入力してください。
    `;

    console.error(errorMessage);
    throw new Error(`Missing environment variables: ${missingKeys.join(', ')}`);
  }
}

const required = (name: string, value: string | undefined): string => {
  const v = value?.trim();
  if (!v) {
    throw new Error(
      `Missing required environment variable: ${name}. Set it at runtime (e.g. Cloud Build / container env).`
    );
  }
  return v;
};

const optional = (value: string | undefined): string | undefined =>
  value?.trim() || undefined;

export interface ServerEnv {
  AUTH_SECRET: string;
  DATABASE_URL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  NEXTAUTH_URL: string;
  OPENAI_API_KEY: string | undefined;
  NODE_ENV: 'development' | 'production' | 'test';
  /** LINE Messaging API（未設定時は LINE 連携オフ） */
  LINE_CHANNEL_ID: string | undefined;
  LINE_CHANNEL_SECRET: string | undefined;
  LINE_CHANNEL_ACCESS_TOKEN: string | undefined;
  /** Web Push VAPID キー（未設定時はプッシュ通知オフ） */
  VAPID_PUBLIC_KEY: string | undefined;
  VAPID_PRIVATE_KEY: string | undefined;
  /** Cron API 保護用（Cloud Scheduler が X-Cron-Secret で送信） */
  CRON_SECRET: string | undefined;
}

let cached: ServerEnv | null = null;

/** ビルド時のみ使用するダミー値（next build 中に getServerEnv が参照されても throw しない） */
function getBuildTimeDummyEnv(): ServerEnv {
  return {
    AUTH_SECRET: 'build-time-dummy',
    DATABASE_URL: process.env.DATABASE_URL?.trim() || 'postgresql://build:build@localhost:5432/build',
    GOOGLE_CLIENT_ID: 'build-time-dummy',
    GOOGLE_CLIENT_SECRET: 'build-time-dummy',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL?.trim() || 'http://localhost:3000',
    OPENAI_API_KEY: undefined,
    NODE_ENV: (process.env.NODE_ENV as ServerEnv['NODE_ENV']) || 'development',
    LINE_CHANNEL_ID: undefined,
    LINE_CHANNEL_SECRET: undefined,
    LINE_CHANNEL_ACCESS_TOKEN: undefined,
    VAPID_PUBLIC_KEY: undefined,
    VAPID_PRIVATE_KEY: undefined,
    CRON_SECRET: undefined,
  };
}

/**
 * 実行時は必須の環境変数を検証して返す。ビルド時はダミーを返す（ビルド失敗を防ぐ）。
 * 本番実行時は validateRuntimeEnv() で未設定なら throw する。
 */
export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  if (isBuildTime()) {
    cached = getBuildTimeDummyEnv();
    return cached;
  }
  cached = {
    AUTH_SECRET: required('AUTH_SECRET', process.env.AUTH_SECRET),
    DATABASE_URL: required('DATABASE_URL', process.env.DATABASE_URL),
    GOOGLE_CLIENT_ID: required('GOOGLE_CLIENT_ID', process.env.GOOGLE_CLIENT_ID),
    GOOGLE_CLIENT_SECRET: required(
      'GOOGLE_CLIENT_SECRET',
      process.env.GOOGLE_CLIENT_SECRET
    ),
    NEXTAUTH_URL: required('NEXTAUTH_URL', process.env.NEXTAUTH_URL),
    OPENAI_API_KEY: optional(process.env.OPENAI_API_KEY),
    NODE_ENV:
      (process.env.NODE_ENV as ServerEnv['NODE_ENV']) || 'development',
    LINE_CHANNEL_ID: optional(process.env.LINE_CHANNEL_ID),
    LINE_CHANNEL_SECRET: optional(process.env.LINE_CHANNEL_SECRET),
    LINE_CHANNEL_ACCESS_TOKEN: optional(process.env.LINE_CHANNEL_ACCESS_TOKEN),
    VAPID_PUBLIC_KEY: optional(process.env.VAPID_PUBLIC_KEY),
    VAPID_PRIVATE_KEY: optional(process.env.VAPID_PRIVATE_KEY),
    CRON_SECRET: optional(process.env.CRON_SECRET),
  };
  return cached;
}
