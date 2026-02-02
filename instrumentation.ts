/**
 * Next.js Instrumentation: サーバー起動時（ランタイム）に一度だけ実行される。
 * ビルド時（next build / CI）ではスキップし、コンテナ起動時のみ必須環境変数をチェックする。
 */
export async function register() {
  const isBuild =
    process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.CI === 'true' ||
    process.env.CI === '1';
  if (isBuild || process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { validateRuntimeEnv } = await import('./lib/env');
  validateRuntimeEnv();
}
