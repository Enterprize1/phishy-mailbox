// Seed an empty 0%-coverage baseline for every source file into .nyc_output.
//
// The e2e suite collects Istanbul coverage from `window.__coverage__` (and the
// server), which only contains files that were actually *loaded* at runtime. A
// file that is never imported by an executed page (e.g. a module exporting only
// helpers/types) therefore never shows up in the report at all.
//
// nyc's own `all: true` is meant to fill those gaps, but it does so by
// `require()`-ing each uncovered file — which silently fails for .ts/.tsx since
// there is no TypeScript loader in the require pipeline. So we build the
// baseline ourselves with istanbul-lib-instrument, whose Babel parser handles
// TS/JSX, and emit a zero-count FileCoverage for each file the run didn't touch.

import {readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync} from 'fs';
import {join} from 'path';
import {createInstrumenter} from 'istanbul-lib-instrument';
import TestExclude from 'test-exclude';

// Mirror the include/exclude from .nycrc.json so the baseline matches the report.
const INCLUDE = ['src/**'];
const EXCLUDE = ['src/**/*.test.ts', 'src/pages/api/__coverage__.ts', 'src/env.mjs', '**/*.d.ts'];
const EXTENSION = ['.js', '.cjs', '.mjs', '.ts', '.tsx', '.jsx'];

/** Absolute paths of files that already have real coverage maps in temp-dir. */
const coveredPaths = (tempDir) => {
  const paths = new Set();
  if (!existsSync(tempDir)) return paths;
  for (const entry of readdirSync(tempDir)) {
    if (!entry.endsWith('.json')) continue;
    try {
      const map = JSON.parse(readFileSync(join(tempDir, entry), 'utf8'));
      for (const fileCov of Object.values(map)) {
        if (fileCov?.path) paths.add(fileCov.path);
      }
    } catch {
      // Unreadable/partial map — ignore, worst case we baseline a covered file.
    }
  }
  return paths;
};

export function writeCoverageBaseline(root) {
  const tempDir = join(root, '.nyc_output');
  const already = coveredPaths(tempDir);

  const exclude = new TestExclude({cwd: root, include: INCLUDE, exclude: EXCLUDE, extension: EXTENSION});
  const instrumenter = createInstrumenter({
    esModules: true,
    parserPlugins: [
      'asyncGenerators',
      'bigInt',
      'classProperties',
      'classPrivateProperties',
      'classPrivateMethods',
      'dynamicImport',
      'importMeta',
      'numericSeparator',
      'objectRestSpread',
      'optionalCatchBinding',
      'topLevelAwait',
      'jsx',
      'typescript',
    ],
  });

  const baseline = {};
  let added = 0;
  for (const relFile of exclude.globSync()) {
    const file = join(root, relFile);
    if (already.has(file)) continue; // real data wins; never merge over it
    try {
      instrumenter.instrumentSync(readFileSync(file, 'utf8'), file);
      const cov = instrumenter.lastFileCoverage();
      // Skip files with nothing to instrument (e.g. pure re-exports / `export {}`).
      if (cov && Object.keys(cov.statementMap).length > 0) {
        baseline[cov.path] = cov;
        added++;
      }
    } catch {
      // Genuinely unparseable file — leave it out rather than crash the report.
    }
  }

  mkdirSync(tempDir, {recursive: true});
  writeFileSync(join(tempDir, 'baseline.json'), JSON.stringify(baseline));
  return added;
}
