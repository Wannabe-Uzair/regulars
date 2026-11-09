#!/bin/sh
# With a command (`docker compose run --rm tenure <command>`), run it instead of the server.
# Otherwise seed the demo gym the first time the data volume is empty, then start the server.
set -eu

if [ "$#" -gt 0 ]; then
  exec "$@"
fi

: "${TENURE_DB:=/data/tenure.db}"

if [ ! -e "$TENURE_DB" ]; then
  echo "No database at $TENURE_DB, seeding the Northside demo gym."
  # Seed into a file beside the database and move it into place only once the seed has finished, so an
  # interrupted seed never leaves a database without a gym. Clear what an earlier interrupted seed left first, and
  # any log files without their database, which SQLite would otherwise replay into the new one.
  tmp="$TENURE_DB.seeding"
  rm -f "$tmp" "$tmp-wal" "$tmp-shm" "$TENURE_DB-wal" "$TENURE_DB-shm"
  TENURE_DB="$tmp" node apps/api/src/seed.ts
  mv "$tmp" "$TENURE_DB"
  echo "The seeded database is now at $TENURE_DB."
fi

exec node apps/api/src/main.ts
