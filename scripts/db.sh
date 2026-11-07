#!/usr/bin/env bash
# POSIX entry point kept for the documented workflow; the logic lives in db.py so that
# native Windows and macOS use the same implementation.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec python3 "$ROOT/scripts/db.py" "$@"
