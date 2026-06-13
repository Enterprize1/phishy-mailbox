import {mkdirSync, writeFileSync} from 'fs';
import {randomBytes} from 'crypto';
import {join} from 'path';

// Coverage collection for the e2e suite. Only does anything when the suite was
// launched via `yarn test:e2e:coverage` (which sets COVERAGE=1 and rebuilds the
// app with babel-plugin-istanbul). Otherwise every function here is a no-op so
// the normal `yarn test:e2e` run is unaffected.

export const COVERAGE_ENABLED = process.env.COVERAGE === '1';

const OUTPUT_DIR = join(process.cwd(), '.nyc_output');

/** Append one Istanbul coverage map (client page or server process) to .nyc_output. */
export const writeCoverage = (coverage: unknown) => {
  if (!coverage || typeof coverage !== 'object' || Object.keys(coverage).length === 0) return;
  mkdirSync(OUTPUT_DIR, {recursive: true});
  const file = join(OUTPUT_DIR, `${randomBytes(16).toString('hex')}.json`);
  writeFileSync(file, JSON.stringify(coverage));
};

/** Read `window.__coverage__` from every page in the context and persist it. */
export const collectClientCoverage = async (
  pages: {evaluate: <T>(fn: () => T) => Promise<T>}[],
) => {
  if (!COVERAGE_ENABLED) return;
  for (const page of pages) {
    try {
      const coverage = await page.evaluate(
        () => (window as unknown as {__coverage__?: unknown}).__coverage__,
      );
      writeCoverage(coverage);
    } catch {
      // Page navigated away / closed / is a cross-origin popup — nothing to read.
    }
  }
};

/** Fetch the server process's coverage via the gated API route and persist it. */
export const collectServerCoverage = async (baseUrl: string) => {
  if (!COVERAGE_ENABLED) return;
  try {
    const res = await fetch(`${baseUrl}/api/__coverage__`);
    if (!res.ok) return;
    writeCoverage(await res.json());
  } catch {
    // Server already gone — skip.
  }
};
