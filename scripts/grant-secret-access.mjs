#!/usr/bin/env node
/**
 * Cloud Run のサービスアカウントに Secret Manager へのアクセス権を付与
 *
 * 実行: npm run grant-secret-access
 * 事前: gcloud auth login（編集権限が必要）
 */
import { execSync } from 'child_process';

const PROJECT_ID = 'my-health-app-485805';

async function main() {
  const projectNumber = execSync(
    `gcloud projects describe ${PROJECT_ID} --format="value(projectNumber)"`,
    { encoding: 'utf8' }
  ).trim();

  const member = `serviceAccount:${projectNumber}-compute@developer.gserviceaccount.com`;
  console.log(`付与先: ${member}\n`);

  execSync(
    `gcloud projects add-iam-policy-binding ${PROJECT_ID} ` +
      `--member="${member}" ` +
      `--role="roles/secretmanager.secretAccessor"`,
    { stdio: 'inherit' }
  );

  console.log('\n✅ 権限付与完了');
}

main().catch(console.error);
