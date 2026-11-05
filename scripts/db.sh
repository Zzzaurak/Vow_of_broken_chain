#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA="$ROOT/.local/postgres"
PORT="${OATH_PGPORT:-55439}"
export PGHOST=127.0.0.1 PGPORT="$PORT" PGUSER=oath
mkdir -p "$ROOT/.local"
if [[ ! -f "$DATA/PG_VERSION" ]]; then
  initdb -D "$DATA" -U oath --auth-local=trust --auth-host=trust --encoding=UTF8 --locale=C > "$ROOT/.local/initdb.log"
fi
if ! pg_ctl -D "$DATA" status >/dev/null 2>&1; then
  if pg_isready -h 127.0.0.1 -p "$PORT" >/dev/null 2>&1; then
    echo "Port $PORT belongs to another PostgreSQL instance; refusing to reuse it." >&2
    exit 1
  fi
  pg_ctl -D "$DATA" -l "$ROOT/.local/postgres.log" -o "-h 127.0.0.1 -p $PORT -k $ROOT/.local" start
fi
for database in oath oath_test; do
  if [[ "$(psql -d postgres -Atc "SELECT count(*) FROM pg_database WHERE datname='$database'")" == 0 ]]; then
    createdb "$database"
  fi
done
printf 'Project PostgreSQL ready on 127.0.0.1:%s (oath / oath_test)\n' "$PORT"
