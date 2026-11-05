#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if [[ -n "$(git status --porcelain)" ]]; then
  echo 'Commit intended source changes before packaging; the archive must match a reviewable commit.' >&2
  exit 1
fi
mkdir -p .local
REVISION="$(git rev-parse --short HEAD)"
OUTPUT="$ROOT/.local/oath-source-$REVISION.tar.gz"
# Only tracked source and authored assets; excludes runtime DB, identities and dependencies.
git archive --format=tar.gz --prefix=oath-unchained/ -o "$OUTPUT" HEAD
printf 'Source archive: %s\nCommit: %s\n' "$OUTPUT" "$(git rev-parse HEAD)"
