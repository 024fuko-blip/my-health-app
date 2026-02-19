/**
 * Next.js Instrumentation: サーバー起動時（ランタイム）に一度だけ実行される。
 * ビルド時（next build / CI）ではスキップし、コンテナ起動時のみ必須環境変数をチェックする。
 * Cloud Run 等では Secret Manager から環境変数を事前読み込みする。
 */
export async function register() {
  const { shouldSkipRuntimeValidation, validateRuntimeEnv } = await import('./lib/env');
  if (shouldSkipRuntimeValidation()) return;

  const { shouldUseSecretManagerAsync, loadSecretsFromSecretManager } = await import('./lib/secrets');
  if (await shouldUseSecretManagerAsync()) {
    await loadSecretsFromSecretManager();
  }

  validateRuntimeEnv();
}
