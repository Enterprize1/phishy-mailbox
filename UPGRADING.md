# Upgrading

Operational steps required when a release changes infrastructure that holds
state. Application code and npm dependencies upgrade automatically when you pull
a new image; the procedures here cover the parts that do not.

## PostgreSQL 15 → 17

The Docker Compose files were moved from `postgres:15-alpine` to
`postgres:17-alpine`. PostgreSQL stores its data in a major-version-specific
on-disk format, so a 17 server **will not start** on a data directory written by
15. If you run the database from `docker-compose.yml` (the `postgres_data`
volume), you must migrate the data with a dump & restore.

This **only** applies to the bundled PostgreSQL container. If your database is a
managed service (Supabase, RDS, Cloud SQL, …), ignore the steps below and use
that provider's own major-version upgrade path instead.

> **Back up first.** The procedure removes the old data volume. Do not delete the
> dump file until you have confirmed the upgraded application works.

The commands assume you run them from the folder containing your
`docker-compose.yml`. The service is named `postgres`, and both the database and
the role are named `mailbox` (as configured in the compose file).

### 1. Dump the existing database (while still on PostgreSQL 15)

Do this **before** switching the image. If the running container is already a
freshly pulled `postgres:15-alpine`, you are fine; if you have already switched
to 17 and the container no longer starts, see [Recovery](#recovery-if-you-already-switched-the-image) below.

```bash
# Optional but recommended: stop the app so nothing writes during the dump.
docker compose stop app

# Write a plain-SQL backup to the host.
docker compose exec -T postgres pg_dump -U mailbox -d mailbox > phishy-mailbox-pg15.sql
```

Sanity-check the file before continuing:

```bash
ls -lh phishy-mailbox-pg15.sql      # should be clearly non-empty
tail -n 1 phishy-mailbox-pg15.sql   # a complete dump ends with: -- PostgreSQL database dump complete
```

### 2. Remove the old cluster

Make sure `docker-compose.yml` references `postgres:17-alpine` (the bundled file
already does), then tear everything down **including the volume**:

```bash
docker compose down -v
```

`-v` deletes the project's named volumes — here that is only `postgres_data`,
i.e. the obsolete PostgreSQL 15 data directory.

### 3. Start a fresh PostgreSQL 17 server and restore

Bring up **only** the database first, so the application's startup
`prisma db push` does not run against an empty cluster before the data is back.

```bash
docker compose pull postgres
docker compose up -d postgres

# Wait until it reports ready.
until docker compose exec -T postgres pg_isready -U mailbox; do sleep 1; done

# Restore the dump into the auto-created `mailbox` database.
docker compose exec -T postgres psql -U mailbox -d mailbox < phishy-mailbox-pg15.sql
```

### 4. Start the application

```bash
docker compose up -d
```

On startup the app runs `prisma db push`; because the restored schema already
matches, this is a no-op.

### 5. Verify

```bash
docker compose exec -T postgres psql -U mailbox -d mailbox -c '\dt'             # tables present
docker compose exec -T postgres psql -U mailbox -d mailbox -c 'SELECT version();'  # server reports 17.x
```

Then load the UI (`http://localhost:3000/admin`) and confirm your studies, emails
and users are intact. Once satisfied, you may delete `phishy-mailbox-pg15.sql`.

### Rollback

If something goes wrong, you still have the dump. Revert the image back to
`postgres:15-alpine` in `docker-compose.yml`, run `docker compose down -v`,
`docker compose up -d postgres`, restore the same dump, and start the app. No
data is lost as long as the dump file is kept.

### Recovery if you already switched the image

If you bumped the image to 17 before dumping and the container now refuses to
start (PostgreSQL logs an incompatible-data-directory error), the data is still
intact in the volume — you just need a 15 server to read it. Temporarily start
one against the existing volume, dump, then continue from step 2:

```bash
# Find the volume name (usually <folder>_postgres_data).
docker volume ls | grep postgres_data

docker run --rm -d --name pg15-dump \
  -e POSTGRES_USER=mailbox -e POSTGRES_PASSWORD=mailbox \
  -v <your>_postgres_data:/var/lib/postgresql/data \
  postgres:15-alpine

until docker exec pg15-dump pg_isready -U mailbox; do sleep 1; done
docker exec -t pg15-dump pg_dump -U mailbox -d mailbox > phishy-mailbox-pg15.sql
docker stop pg15-dump
```

Then proceed from [step 2](#2-remove-the-old-cluster).
