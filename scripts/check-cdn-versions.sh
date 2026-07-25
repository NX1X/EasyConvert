#!/usr/bin/env bash
# Fails if the cdnjs library versions drift out of sync between the files that
# reference them, or if any cdnjs reference in index.html is missing a valid
# SRI integrity attribute. PDF.js in particular requires pdf.min.js and
# pdf.worker.min.js to be the exact same version, or parsing breaks at runtime.
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
    printf '%s\n' "$versions" | sed 's/^/  /'
    fail=1
  else
    echo "OK: ${name} pinned to ${versions} everywhere"
  fi
}

# Every cdnjs <link>/<script> tag must carry a real SRI hash and
# crossorigin="anonymous". A version-only check passes green even when the
# integrity attribute has been stripped, which silently disables the
# browser's SRI enforcement for that resource.
check_sri_attrs() {
  local html="public/index.html"
  local line n tag
  while IFS= read -r line; do
    n="${line%%:*}"
    tag="${line#*:}"
    if ! printf '%s' "$tag" | grep -qE 'integrity="sha(384|512)-[A-Za-z0-9+/=]+"'; then
      echo "MISSING SRI: ${html}:${n} cdnjs reference has no valid integrity attribute"
      fail=1
    fi
    if ! printf '%s' "$tag" | grep -q 'crossorigin="anonymous"'; then
      echo "MISSING crossorigin: ${html}:${n} cdnjs reference lacks crossorigin=\"anonymous\""
      fail=1
    fi
  done < <(grep -n 'cdnjs\.cloudflare\.com' "$html")
}

# The same asset must use one identical digest everywhere it appears
# (preload tag + script tag), so a single tampered reference cannot slip
# through while the other still looks correct.
check_sri_consistency() { # $1 = asset filename
  local asset="$1"
  local digests count
  digests="$(grep -E "cdnjs\.cloudflare\.com.*/${asset}" public/index.html \
    | grep -oE 'integrity="sha[0-9]+-[A-Za-z0-9+/=]+"' | sort -u)"
  count="$(printf '%s\n' "$digests" | grep -c . || true)"
  if [ "$count" -ne 1 ]; then
    echo "SRI MISMATCH: ${asset} digests differ or are absent across index.html:"
    printf '%s\n' "$digests" | sed 's/^/  /'
    fail=1
  else
    echo "OK: ${asset} SRI digest identical across index.html"
  fi
}

check "pdf.js" "pdf.js" public/index.html public/app.js public/sw.js
check "xlsx"   "xlsx"   public/index.html public/sw.js

check_sri_attrs
check_sri_consistency "pdf.min.js"
check_sri_consistency "xlsx.full.min.js"

exit "$fail"
