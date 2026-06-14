import {PrismaClient} from '@prisma/client';
import {PrismaPg} from '@prisma/adapter-pg';
import {PrismaTestingHelper} from '@chax-at/transactional-prisma-testing';
import {afterAll, afterEach, beforeAll, beforeEach} from 'vitest';

// One real connection per worker. Every test runs inside a transaction that is
// rolled back afterwards, so nothing is ever committed -> complete isolation
// between tests, and parallel-safe across workers (each has its own client).
const baseClient = new PrismaClient({
  adapter: new PrismaPg({connectionString: process.env.DATABASE_URL}),
});

let testingHelper: PrismaTestingHelper<PrismaClient>;

// Live binding: helpers/tests import this and get the active transactional proxy.
export let prismaTest: PrismaClient;

beforeAll(() => {
  testingHelper = new PrismaTestingHelper(baseClient);
  prismaTest = testingHelper.getProxyClient();
});

beforeEach(async () => {
  await testingHelper.startNewTransaction();
});

afterEach(() => {
  testingHelper.rollbackCurrentTransaction();
});

afterAll(async () => {
  await baseClient.$disconnect();
});
