/**
 * サーバー用環境変数スキーマ。
 * process.env を直接参照せず、このモジュールを経由して使用する。
 * ビルド時には getServerEnv() / validateRuntimeEnv() を呼ばないこと（実行時のみ評価）。
 */

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
  // ビルド時（CI環境や next build 中）はチェックをスキップ
  if (process.env.NEXT_PHASE === 'phase-production-build' || process.env.CI) {
    return;
  }

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
}

let cached: ServerEnv | null = null;

/**
 * 実行時にのみ呼び出すこと。ビルド時の静的解析では呼ばれない。
 * 必須: AUTH_SECRET, DATABASE_URL。OPENAI_API_KEY は任意（未設定時は AI API が 503 を返す）。
 * シークレットにデフォルト値は設定しない。
 */
export function getServerEnv(): ServerEnv {
  if (cached) return cached;
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
  };
  return cached;
}
