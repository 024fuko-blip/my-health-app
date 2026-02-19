/**
 * Next.js Instrumentation: サーバー起動時（ランタイム）に一度だけ実行される。
 * ビルド時（next build / CI）ではスキップし、コンテナ起動時のみ必須環境変数をチェックする。
 */
export async function register() {
  const { shouldSkipRuntimeValidation, validateRuntimeEnv } = await import('./lib/env');
  if (shouldSkipRuntimeValidation()) return;
  validateRuntimeEnv();
}
