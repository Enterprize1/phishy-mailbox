import * as crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {Page, test as baseTest} from '@playwright/test';
import { execSync, exec } from 'child_process';
import findFreePorts from "find-free-ports";
import { addCoverageReport } from 'monocart-reporter';
import { CDPClient } from 'monocart-coverage-reports';

export function generateUUID(): string {
  return crypto.randomBytes(16).toString('hex');
}

export const test = baseTest.extend({
  autoTestFixture: ([async ({ page }: {page: Page}, use: any) => {
    const isChromium = false && test.info().project.name === 'Desktop Chromium';
    if (isChromium) {
      await Promise.all([
        page.coverage.startJSCoverage({
          resetOnNavigation: false
        }),
        page.coverage.startCSSCoverage({
          resetOnNavigation: false
        })
      ]);
    }

    await use('autoTestFixture');

    // console.log('autoTestFixture teardown...');
    if (isChromium) {
      const [jsCoverage, cssCoverage] = await Promise.all([
        page.coverage.stopJSCoverage(),
        page.coverage.stopCSSCoverage()
      ]);
      const coverageList = [... jsCoverage, ... cssCoverage];
      await addCoverageReport(coverageList, test.info());
    }

  }, {
    scope: 'test',
    auto: true
  }]) as any,
  page: (async ({ page }: {page: Page}, use: any) => {
    const name = generateUUID();

    execSync(`docker compose exec -it postgres psql -d postgres -U mailbox -c "CREATE DATABASE db_${name}"`);

    const dbEnv = `DATABASE_URL="postgresql://mailbox:mailbox@localhost:5432/db_${name}?schema=public"`;

    execSync(`${dbEnv} yarn prisma db push`);
    execSync(`${dbEnv} yarn node ./prisma/seed.js`);

    const [serverPort, inspectPort] = await findFreePorts(2);

    const server = exec(`${dbEnv} PORT=${serverPort} NODE_V8_COVERAGE=monocart-report/server-coverage/${name} NODE_OPTIONS=--inspect=${inspectPort} yarn dev`);

    await new Promise<void>((resolve) => {
      server.stdout?.on('data', (data) => {
        console.log(data);
        if (data.toString().includes('Ready')) {
          resolve();
        }
      });
      server.stderr?.on('data', (data) => {
        console.error(data);

      });
    });

    await page.goto(`http://localhost:${serverPort}`);

    const originalGoto = page.goto;
    page.goto = async (url: string, options?: {
      referer?: string;
      timeout?: number;
      waitUntil?: "load"|"domcontentloaded"|"networkidle"|"commit";
    }) => {
      const newUrl = new URL(url, `http://localhost:${serverPort}`);
      return originalGoto.call(page, newUrl.toString(), options);
    }

    await use(page);

    const client = await CDPClient({port: inspectPort});
    const dir = await client?.writeCoverage();

    const files = fs.readdirSync(dir!);
    for (const filename of files) {
      const content = fs.readFileSync(path.resolve(dir!, filename)).toString('utf-8');
      const json = JSON.parse(content);
      let coverageList = json.result;

      coverageList = coverageList.filter((entry: any) => entry.url && entry.url.startsWith('file:'));
      coverageList = coverageList.filter((entry: any) => entry.url.includes('next/server'));
      coverageList = coverageList.filter((entry: any) => !entry.url.includes('manifest.js'));

      if (!coverageList.length) {
        continue;
      }

      coverageList.forEach((entry: any) => {
        const filePath = fileURLToPath(entry.url);
        if (fs.existsSync(filePath)) {
          entry.source = fs.readFileSync(filePath).toString('utf8');
        } else {
          console.log('not found file', filePath);
        }
      });

      await addCoverageReport(coverageList, test.info());
    }
    server.kill(9);
    execSync(`docker compose exec -it postgres psql -d postgres -U mailbox -c "DROP DATABASE db_${name} WITH (FORCE)"`);
  }) as any,
});

export const expect = test.expect;
