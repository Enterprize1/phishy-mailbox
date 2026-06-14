#!/bin/sh
set -e

prisma db push

yarn node ./prisma/seed.mjs

exec "$@"