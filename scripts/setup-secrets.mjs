#!/usr/bin/env node
/**
 * Secret Manager にシークレットを作成（本番用）
 * .env.local または .env の値を Secret Manager に登録
 *
 * 実行: npm run setup-secrets
 * 事前: gcloud auth application-default login
 */
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const PROJECT_ID = 'my-health-app-485805';

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
];

function loadEnv() {
  const paths = [resolve(process.cwd(), '.env.local'), resolve(process.cwd(), '.env')];
  for (const p of paths) {
    try {
      const content = readFileSync(p, 'utf8');
      const env = {};
      for (const line of content.split('\n')) {
        const m = line.match(/^([^#=]+)=(.*)$/);
        if (m) env[m[1].trim()] = m[2].replace(/^["']|["']$/g, '').trim();
      }
      return { ...process.env, ...env };
    } catch {
      continue;
    }
  }
  return process.env;
}

async function main() {
  const env = loadEnv();
  const client = new SecretManagerServiceClient();
  const parent = `projects/${PROJECT_ID}`;

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const name of SECRET_NAMES) {
    const value = env[name]?.trim();
    if (!value) {
      console.log(`⏭️  ${name}: スキップ（値なし）`);
      skipped++;
      continue;
    }

    try {
      let existed = false;
      try {
        await client.createSecret({
          parent,
          secretId: name,
          secret: { replication: { automatic: {} } },
        });
        console.log(`✅ ${name}: 新規作成`);
        created++;
      } catch (e) {
        if (e.code === 6) {
          existed = true;
        } else throw e;
      }

      await client.addSecretVersion({
        parent: `${parent}/secrets/${name}`,
        payload: { data: Buffer.from(value, 'utf8') },
      });
      if (existed) {
        console.log(`✅ ${name}: バージョン追加`);
        updated++;
      }
    } catch (e) {
      console.error(`❌ ${name}: エラー`, e.message);
    }
  }

  console.log(`\n完了: 新規 ${created}, 更新 ${updated}, スキップ ${skipped}`);

  const { execSync } = await import('child_process');
  let projectNumber;
  try {
    projectNumber = execSync(
      `gcloud projects describe ${PROJECT_ID} --format="value(projectNumber)"`,
      { encoding: 'utf8' }
    ).trim();
  } catch {
    projectNumber = 'PROJECT_NUMBER';
  }

  console.log('\n--- Cloud Run へ権限付与 ---');
  console.log(
    `以下のコマンドで全シークレットへのアクセス権を付与します（一括）:\n`
  );
  console.log(
    `gcloud projects add-iam-policy-binding ${PROJECT_ID} \\\n` +
      `  --member="serviceAccount:${projectNumber}-compute@developer.gserviceaccount.com" \\\n` +
      `  --role="roles/secretmanager.secretAccessor"\n`
  );
}

main().catch(console.error);
