#!/bin/sh

prisma db push

yarn node ./prisma/seed.js

exec "$@"