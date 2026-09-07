#!/usr/bin/env bash
# pdf.js and SheetJS are self-hosted under public/vendor/ (formerly loaded
# from cdnjs with SRI pins). This checks the vendored files exist and that
# every reference to them in index.html, app.js and sw.js uses the same
# filename, so a stale or typo'd path in one place doesn't go unnoticed.
# PDF.js in particular requires pdf.min.js and pdf.worker.min.js to be the
# exact same version, or parsing breaks at runtime - keeping them as one pair
# under public/vendor/ (bumped together) is what enforces that now.
set -euo pipefail

cd "$(dirname "$0")/.."

fail=0

# Pin the exact bytes we vendored, not just their presence. Bump these
# together with the file, deliberately, when updating a library version.
declare -A EXPECTED_SHA256=(
  ["public/vendor/pdf.min.js"]="5b5799e6f8c680663207ac5b42ee14eed2a406fa7af48f50c154f0c0b1566946"
  ["public/vendor/pdf.worker.min.js"]="feabdf309770ed24bba31a5467836cdc8cf639c705af27d52b585b041bb8527b"
  ["public/vendor/xlsx.full.min.js"]="c9506197caf809a075b6dee1da0d36fb19da7158ffe8a88e7b0c96c5d8623c99"
)

check_vendored_file() {
  local path="$1"
  if [ ! -f "$path" ]; then
    echo "MISSING: ${path} does not exist"
    fail=1
    return
  fi
  local expected="${EXPECTED_SHA256[$path]:-}"
  local actual
  actual="$(sha256sum "$path" | cut -d' ' -f1)"
  if [ -z "$expected" ]; then
    echo "OK: ${path} present (no pinned hash on record - add one)"
    fail=1
  elif [ "$actual" != "$expected" ]; then
    echo "TAMPERED OR STALE: ${path} sha256=${actual}, expected ${expected}"
    fail=1
  else
    echo "OK: ${path} present, sha256 matches"
  fi
}

check_reference_consistency() { # $1 = filename, $2..$n = files to check
  local name="$1"; shift
  local hits
  hits="$(grep -l "/vendor/${name}" "$@" 2>/dev/null | wc -l | tr -d ' ')"
  if [ "$hits" -eq 0 ]; then
    echo "MISMATCH: no reference to /vendor/${name} found in $*"
    fail=1
  else
    echo "OK: /vendor/${name} referenced in ${hits} of $# expected file(s)"
  fi
}

check_vendored_file "public/vendor/pdf.min.js"
check_vendored_file "public/vendor/pdf.worker.min.js"
check_vendored_file "public/vendor/xlsx.full.min.js"

check_reference_consistency "pdf.min.js" public/index.html
check_reference_consistency "pdf.worker.min.js" public/app.js
check_reference_consistency "xlsx.full.min.js" public/index.html
check_reference_consistency "pdf.min.js" public/sw.js
check_reference_consistency "pdf.worker.min.js" public/sw.js
check_reference_consistency "xlsx.full.min.js" public/sw.js

exit "$fail"
