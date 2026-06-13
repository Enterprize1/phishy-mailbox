#!/usr/bin/env node
// Orchestrates the instrumented e2e coverage run.
//
//   1. Drop a temporary Babel config so the Next build is instrumented with
//      babel-plugin-istanbul. We generate it on the fly (instead of committing
//      it) because the mere presence of a Babel config switches Next off SWC for
//      *every* build — we only want that during coverage runs.
//   2. Run the Playwright suite with COVERAGE=1. global-setup rebuilds the app
//      (now instrumented) and the fixtures dump per-page / per-server coverage
//      maps into .nyc_output.
//   3. Always remove the temporary Babel config, then merge + report via nyc.
//
// Requires the test database to be up (yarn test:db:up).

import {execSync} from 'child_process';
import {rmSync, writeFileSync, existsSync} from 'fs';
import {join, dirname} from 'path';
import {fileURLToPath} from 'url';
import {writeCoverageBaseline} from './coverage-baseline.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const babelrcPath = join(root, '.babelrc');

const babelConfig = {
  presets: ['next/babel'],
  plugins: [
    [
      'istanbul',
      {
        include: ['src/**'],
        exclude: ['**/*.test.ts', 'src/pages/api/__coverage__.ts', 'src/env.mjs', '**/*.d.ts'],
      },
    ],
  ],
};

const run = (cmd, env = {}) =>
  execSync(cmd, {cwd: root, stdio: 'inherit', env: {...process.env, ...env}});

if (existsSync(babelrcPath)) {
  throw new Error('.babelrc already exists — refusing to overwrite it. Remove it and retry.');
}

// Start clean: a stale .next would otherwise be reused uninstrumented, and stale
// coverage maps would inflate the report.
rmSync(join(root, '.next'), {recursive: true, force: true});
rmSync(join(root, '.nyc_output'), {recursive: true, force: true});
rmSync(join(root, 'coverage/e2e'), {recursive: true, force: true});

writeFileSync(babelrcPath, JSON.stringify(babelConfig, null, 2));

try {
  // Pass through any extra args (e.g. a specific spec) to playwright.
  const extra = process.argv.slice(2).join(' ');
  run(`node_modules/.bin/playwright test ${extra}`.trim(), {COVERAGE: '1', SKIP_BUILD: '0'});
} finally {
  rmSync(babelrcPath, {force: true});
}

// Fill in files that were never loaded at runtime so they report at 0% instead
// of vanishing from the report entirely.
const baselined = writeCoverageBaseline(root);
console.log(`Seeded coverage baseline for ${baselined} untouched file(s).`);

run('node_modules/.bin/nyc report');
console.log('\nCoverage report written to coverage/e2e/index.html');
