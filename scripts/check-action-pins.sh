#!/usr/bin/env bash
# Fails if any third-party GitHub Action is referenced by a mutable ref (tag or
# branch) instead of a full 40-character commit SHA. Local actions (./...) and
# docker refs are allowed. This enforces SHA pinning across the repo.
set -euo pipefail

cd "$(dirname "$0")/.."

violations=0

while IFS= read -r line; do
  # Pull the value after "uses:"
  ref="$(printf '%s\n' "$line" | sed -E 's/.*uses:[[:space:]]*//; s/[[:space:]]*(#.*)?$//' | tr -d '"'"'"'')"
  [ -z "$ref" ] && continue
  case "$ref" in
    ./*|docker://*) continue ;;            # local or docker action: allowed
  esac
  sha="${ref##*@}"
  if ! printf '%s' "$sha" | grep -qE '^[0-9a-f]{40}$'; then
    echo "NOT SHA-PINNED: $ref"
    violations=$((violations + 1))
  fi
done < <(grep -rhnE '^[[:space:]]*(- )?uses:' .github/workflows 2>/dev/null || true)

if [ "$violations" -ne 0 ]; then
  echo "FAIL: ${violations} action(s) not pinned to a full commit SHA."
  exit 1
fi
echo "OK: all actions are pinned to a full commit SHA."
