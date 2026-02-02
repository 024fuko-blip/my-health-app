/**
 * Next.js Instrumentation: サーバー起動時（ランタイム）に一度だけ実行される。
 * ビルド時には実行されない。コンテナが立ち上がったタイミングで必須環境変数をチェックする。
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateRuntimeEnv } = await import('./lib/env');
    validateRuntimeEnv();
  }
}
