#!/usr/bin/env bash
# Runs the Supabase migration on a throwaway local Postgres database and checks
# the gender-separation and privacy rules. Needs psql access to a server with
# PostGIS (e.g. `apt-get install postgresql postgis`).
#   PSQL="sudo -u postgres psql" scripts/db-test/run.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
PSQL=${PSQL:-psql}
DB=${DB:-shilla_test}

$PSQL -q -v ON_ERROR_STOP=1 -d postgres -c "drop database if exists $DB" -c "create database $DB"
sed "s/current_database_placeholder/$DB/" scripts/db-test/auth_stub.sql | $PSQL -q -v ON_ERROR_STOP=1 -d "$DB"
for f in supabase/migrations/*.sql supabase/seed.sql scripts/db-test/grants.sql scripts/db-test/checks.sql; do
  echo "== $f"
  # pg_net is a Supabase extension; auth_stub.sql provides a stand-in.
  grep -v "create extension if not exists pg_net" "$f" | $PSQL -q -v ON_ERROR_STOP=1 -d "$DB"
done
echo "All database checks passed."
