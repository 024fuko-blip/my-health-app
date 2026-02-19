/**
 * Google Secret Manager から環境変数を取得。
 * GOOGLE_CLOUD_PROJECT が設定されている場合（Cloud Run 等）は Secret Manager を使用。
 * ローカル開発時は process.env にフォールバック。
 */

import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

/** Secret Manager から取得した値をキャッシュ */
let secretsCache: Record<string, string> | null = null;

/** GCP プロジェクトIDを取得（環境変数またはメタデータサーバー） */
async function getProjectId(): Promise<string | null> {
  const fromEnv = process.env.GOOGLE_CLOUD_PROJECT?.trim() || process.env.GCLOUD_PROJECT?.trim();
  if (fromEnv) return fromEnv;
  try {
    const res = await fetch(
      'http://metadata.google.internal/computeMetadata/v1/project/project-id',
      { headers: { 'Metadata-Flavor': 'Google' } }
    );
    if (res.ok) return (await res.text()).trim();
  } catch {
    /* ローカル等ではメタデータサーバーに到達しない */
  }
  return null;
}

/** Secret Manager を使用するか（GCP 上でプロジェクトIDが取得できれば true） */
export async function shouldUseSecretManagerAsync(): Promise<boolean> {
  if (process.env.USE_SECRET_MANAGER === 'false') return false;
  const projectId = await getProjectId();
  return !!projectId;
}

/** Secret Manager から取得するシークレット名一覧（ServerEnv のキーと対応） */
const SECRET_NAMES = [
  'AUTH_SECRET',
  'DATABASE_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'NEXTAUTH_URL',
  'OPENAI_API_KEY',
  'LINE_CHANNEL_ID',
  'LINE_CHANNEL_SECRET',
  'LINE_CHANNEL_ACCESS_TOKEN',
  'LINE_ADD_FRIEND_URL',
  'LINE_BOT_BASIC_ID',
  'VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
  'CRON_SECRET',
] as const;

/**
 * Secret Manager から全シークレットを取得してキャッシュに格納。
 * 未作成のシークレットはスキップし、取得できたものだけキャッシュする。
 */
export async function loadSecretsFromSecretManager(): Promise<void> {
  const projectId = await getProjectId();
  if (!projectId) {
    console.warn('[Secrets] プロジェクトIDが取得できません。process.env を使用します。');
    return;
  }

  const client = new SecretManagerServiceClient();
  const cache: Record<string, string> = {};

  await Promise.all(
    SECRET_NAMES.map(async (name) => {
      try {
        const [version] = await client.accessSecretVersion({
          name: `projects/${projectId}/secrets/${name}/versions/latest`,
        });
        const payload = version.payload?.data;
        if (payload && payload.length > 0) {
          cache[name] = Buffer.from(payload as Uint8Array).toString('utf8').trim();
        }
      } catch (e) {
        const err = e as { code?: number; message?: string };
        if (err.code === 5) {
          // NOT_FOUND: シークレットが存在しない（オプションの場合は無視）
        } else {
          console.error(`[Secrets] ${name} の取得に失敗:`, err.message ?? err);
        }
      }
    })
  );

  secretsCache = cache;
  console.log(`[Secrets] Secret Manager から ${Object.keys(cache).length} 件を読み込みました。`);
}

/**
 * キャッシュまたは process.env から値を取得。
 * loadSecretsFromSecretManager() 実行後はキャッシュ優先。
 */
export function getSecret(key: string): string | undefined {
  const v = secretsCache?.[key];
  if (v !== undefined) return v;
  return process.env[key]?.trim() || undefined;
}

/** キャッシュをクリア（主にテスト用） */
export function clearSecretsCache(): void {
  secretsCache = null;
}
