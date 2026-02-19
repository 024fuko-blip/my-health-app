/**
 * Next.js Instrumentation: 本番（Cloud Run）起動時に実行される。
 * Secret Manager から環境変数を読み込み、必須項目を検証する。
 * ビルド時（next build / CI）はスキップ。
 */
export async function register() {
  const { shouldSkipRuntimeValidation, validateRuntimeEnv } = await import('./lib/env');
  if (shouldSkipRuntimeValidation()) return;

  const { shouldUseSecretManagerAsync, loadSecretsFromSecretManager } = await import('./lib/secrets');
  if (await shouldUseSecretManagerAsync()) {
    try {
      await loadSecretsFromSecretManager();
    } catch (e) {
      console.error('[Instrumentation] Secret Manager 読み込み失敗。process.env を使用します:', e);
    }
  }

  validateRuntimeEnv();
}
