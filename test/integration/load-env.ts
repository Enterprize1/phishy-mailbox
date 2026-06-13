// Runs first in every Vitest worker (before setup.ts and before any test module
// imports `~/env.mjs` / PrismaClient). Loading the env here guarantees DATABASE_URL
// and friends are present before env validation kicks in.
import {config as loadEnv} from 'dotenv';

loadEnv({path: '.env.test'});
