#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
python3 scripts/build-content.py
npm --prefix frontend run format:check
npm --prefix frontend test
npm --prefix frontend run build
# Tests always use a dedicated test database, never the development DATABASE_URL.
export DATABASE_URL="${OATH_TEST_DATABASE_URL:-jdbc:postgresql://127.0.0.1:${OATH_PGPORT:-55439}/oath_test}"
(cd backend && sbt test)
if [[ "${1:-}" == "--browser" ]]; then
  (cd frontend && npm run test:e2e)
fi
git diff --check
