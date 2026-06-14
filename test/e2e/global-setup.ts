import {execSync} from 'child_process';
import {existsSync} from 'fs';
import {config as loadEnv} from 'dotenv';
import {recreateTemplateDb, dbUrl, TEMPLATE_DB} from './db';

// Runs once before the whole e2e suite:
//  1. build the Next app (unless SKIP_BUILD=1 and a build already exists)
//  2. create the migrated template database that each worker clones from
export default async function globalSetup() {
  loadEnv({path: '.env.test'});

  if (!process.env.DATABASE_URL?.includes('5434')) {
    throw new Error(`Refusing to run e2e: DATABASE_URL must point at the test DB (5434). Got: ${process.env.DATABASE_URL}`);
  }

  // Production build, reused by every worker's `next start`.
  if (!(process.env.SKIP_BUILD === '1' && existsSync('.next/BUILD_ID'))) {
    const {NODE_ENV: _ignored, ...buildEnv} = process.env; // let Next set production
    execSync('node_modules/.bin/next build', {
      stdio: 'inherit',
      env: {...buildEnv, NEXT_DISABLE_STANDALONE: '1'}, // so `next start` works
    });
  }

  // Fresh template DB + schema. Workers clone from this.
  await recreateTemplateDb();
  execSync('node_modules/.bin/prisma db push --accept-data-loss', {
    stdio: 'inherit',
    env: {...process.env, DATABASE_URL: dbUrl(TEMPLATE_DB)},
  });
}
