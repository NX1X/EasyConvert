#!/usr/bin/env bash
# Fails if the app version drifts between the files that must agree on it.
# app.js and style.css are not fingerprinted, so the ?v= query in index.html is
# what busts browser and edge caches on a new release; if it silently stays
# behind package.json, users keep running the previous build.
set -euo pipefail

cd "$(dirname "$0")/.."

pkg="$(node -p "require('./package.json').version")"
sw="$(grep -oE "const APP_VERSION = '[0-9]+\.[0-9]+\.[0-9]+'" public/sw.js \
  | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')"
assets="$(grep -oE '(app\.js|style\.css)\?v=[0-9]+\.[0-9]+\.[0-9]+' public/index.html \
  | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | sort -u)"

fail=0

if [ -z "$sw" ]; then
  echo "MISSING: public/sw.js has no APP_VERSION constant"
  fail=1
elif [ "$sw" != "$pkg" ]; then
  echo "MISMATCH: package.json is ${pkg} but public/sw.js APP_VERSION is ${sw}"
  fail=1
fi

asset_count="$(printf '%s\n' "$assets" | grep -c . || true)"
if [ "$asset_count" -eq 0 ]; then
  echo "MISSING: public/index.html does not reference app.js/style.css with a ?v= query"
  fail=1
elif [ "$asset_count" -ne 1 ] || [ "$assets" != "$pkg" ]; then
  echo "MISMATCH: package.json is ${pkg} but index.html asset queries are:"
  printf '%s\n' "$assets" | sed 's/^/  /'
  fail=1
fi

# Both app-shell assets must carry the query, or the one without it stays cached
for asset in 'app\.js' 'style\.css'; do
  if ! grep -qE "${asset}\?v=[0-9]+\.[0-9]+\.[0-9]+" public/index.html; then
    echo "MISSING: public/index.html references ${asset//\\/} without a ?v= cache-busting query"
    fail=1
  fi
done

[ "$fail" -eq 0 ] && echo "OK: version ${pkg} in sync across package.json, sw.js, and index.html"

exit "$fail"
