#!/bin/sh

yarn prisma db push

yarn node ./prisma/seed.js

exec "$@"