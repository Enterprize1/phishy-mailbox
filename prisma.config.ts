import {defineConfig} from 'prisma/config';

// Prisma 7 no longer reads the connection URL from the schema's datasource block.
// CLI commands (db push, migrate, studio) get it from here instead.
//
// Load a local .env for development convenience. In CI and the production
// container the variables are already present in the environment and dotenv is
// not necessarily installed (it is pruned from the standalone build), so its
// absence is non-fatal. dotenv does not override variables already set, so the
// test/e2e setups that pre-set DATABASE_URL (port 5434) keep precedence.
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv').config();
} catch {
  // dotenv unavailable — rely on the ambient environment.
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
