import {execSync} from 'child_process';

// Runs once before the whole integration suite. Applies the Prisma schema to the
// test database (port 5434). The env is already loaded by vitest.config.ts.
export default function setup() {
  if (!process.env.DATABASE_URL?.includes('5434')) {
    throw new Error(
      `Refusing to run integration tests: DATABASE_URL does not point at the test DB (5434). Got: ${process.env.DATABASE_URL}`,
    );
  }

  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    stdio: 'inherit',
    env: process.env,
  });
}
