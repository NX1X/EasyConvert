#!/usr/bin/env bash
# Fails if the cdnjs library versions drift out of sync between the files that
# reference them. PDF.js in particular requires pdf.min.js and pdf.worker.min.js
# to be the exact same version, or parsing breaks at runtime.
set -euo pipefail

cd "$(dirname "$0")/.."

extract() { # $1 = library slug, $2..$n = files
  local lib="$1"; shift
  grep -hoE "libs/${lib}/[0-9]+\.[0-9]+\.[0-9]+/" "$@" \
    | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | sort -u
}

fail=0

check() {
  local name="$1"; shift
  local versions
  versions="$(extract "$@")"
  local count
  count="$(printf '%s\n' "$versions" | grep -c . || true)"
  if [ "$count" -ne 1 ]; then
    echo "MISMATCH: ${name} versions are not in sync across files:"
    printf '  %s\n' $versions
    fail=1
  else
    echo "OK: ${name} pinned to ${versions} everywhere"
  fi
}

check "pdf.js" "pdf.js" public/index.html public/app.js public/sw.js
check "xlsx"   "xlsx"   public/index.html public/sw.js

exit "$fail"
