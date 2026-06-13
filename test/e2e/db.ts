import {Client} from 'pg';

// Per-worker database isolation for the e2e suite.
//
// A migrated TEMPLATE database is created once in global-setup. Every Playwright
// worker then clones its own database from that template (instant, no migrations)
// and drops it on teardown -> workers never share state and can run in parallel.

export const TEMPLATE_DB = 'mailbox_test_template';

const base = () => new URL(process.env.DATABASE_URL as string);

/** Connection to the maintenance DB (`mailbox`) used to CREATE/DROP other databases. */
const adminClient = () => {
  const u = base();
  return new Client({
    host: u.hostname,
    port: Number(u.port),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: 'mailbox',
  });
};

/** Build a DATABASE_URL for a named database, preserving host/credentials/params. */
export const dbUrl = (name: string) => {
  const u = base();
  u.pathname = `/${name}`;
  return u.toString();
};

export const workerDbName = (index: number) => `mailbox_test_w${index}`;

const withAdmin = async (fn: (client: Client) => Promise<void>) => {
  const client = adminClient();
  await client.connect();
  try {
    await fn(client);
  } finally {
    await client.end();
  }
};

/** (Re)create the empty template database. Schema is applied separately via prisma db push. */
export const recreateTemplateDb = () =>
  withAdmin(async (client) => {
    await client.query(`DROP DATABASE IF EXISTS "${TEMPLATE_DB}" WITH (FORCE)`);
    await client.query(`CREATE DATABASE "${TEMPLATE_DB}"`);
  });

export const createWorkerDb = (name: string) =>
  withAdmin(async (client) => {
    await client.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await client.query(`CREATE DATABASE "${name}" TEMPLATE "${TEMPLATE_DB}"`);
  });

export const dropWorkerDb = (name: string) =>
  withAdmin(async (client) => {
    await client.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  });
