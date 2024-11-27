#!/bin/sh

prisma db push --accept-data-loss

yarn node ./prisma/seed.js

exec "$@"
