import {test as base, expect} from '@playwright/test';
import {PrismaClient} from '@prisma/client';
import {ChildProcess, spawn} from 'child_process';
import {createWorkerDb, dbUrl, dropWorkerDb, workerDbName} from './db';
import {resetDb, seedAdmin, seedParticipantStudy} from './seed';
import {collectClientCoverage, collectServerCoverage} from './coverage';

const BASE_PORT = 3100;
export const portForWorker = (parallelIndex: number) => BASE_PORT + parallelIndex;

interface WorkerServer {
  port: number;
  prisma: PrismaClient;
}

interface Db {
  prisma: PrismaClient;
  seedParticipantStudy: () => Promise<{code: string; studyId: string}>;
}

const waitForServer = async (port: number, timeoutMs = 90_000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://localhost:${port}/`);
      if (res.status < 500) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Next server on port ${port} did not become ready in ${timeoutMs}ms`);
};

const stopServer = (server: ChildProcess) =>
  new Promise<void>((res) => {
    if (server.exitCode !== null) return res();
    const kill = setTimeout(() => server.kill('SIGKILL'), 10_000);
    server.on('exit', () => {
      clearTimeout(kill);
      res();
    });
    server.kill('SIGTERM');
  });

export const test = base.extend<{db: Db; collectClientCoverage: void}, {workerServer: WorkerServer}>({
  // One Next server + one database per parallel worker.
  workerServer: [
    async ({}, use, workerInfo) => {
      const index = workerInfo.parallelIndex;
      const name = workerDbName(index);
      const url = dbUrl(name);
      const port = portForWorker(index);

      await createWorkerDb(name);

      // Drop NODE_ENV so `next start` runs in production mode.
      const {NODE_ENV: _ignored, ...baseEnv} = process.env;
      const env: NodeJS.ProcessEnv = {
        ...baseEnv,
        DATABASE_URL: url,
        NEXTAUTH_URL: `http://localhost:${port}`,
        PORT: String(port),
        NEXT_DISABLE_STANDALONE: '1', // build was non-standalone, so `next start` works
      };

      const server = spawn('node_modules/.bin/next', ['start', '-p', String(port)], {
        env,
        stdio: 'pipe',
      });
      server.stderr?.on('data', (d) => process.stderr.write(`[next:${port}] ${d}`));

      await waitForServer(port);
      const prisma = new PrismaClient({datasources: {db: {url}}});

      await use({port, prisma});

      // Pull the server process's accumulated coverage before we shut it down.
      await collectServerCoverage(`http://localhost:${port}`);

      await prisma.$disconnect();
      await stopServer(server);
      await dropWorkerDb(name);
    },
    {scope: 'worker'},
  ],

  // Point the browser at this worker's server.
  baseURL: async ({workerServer}, use) => {
    await use(`http://localhost:${workerServer.port}`);
  },

  // Auto fixture: after each test, harvest client-side coverage from every page
  // (including popups) in the context before Playwright tears the context down.
  collectClientCoverage: [
    async ({context}, use) => {
      await use(undefined);
      await collectClientCoverage(context.pages());
    },
    {auto: true},
  ],

  // Clean slate + admin user before each test; exposes seed helpers.
  db: async ({workerServer}, use) => {
    await resetDb(workerServer.prisma);
    await seedAdmin(workerServer.prisma);
    await use({
      prisma: workerServer.prisma,
      seedParticipantStudy: () => seedParticipantStudy(workerServer.prisma),
    });
  },
});

export {expect};
