#!/usr/bin/env bash

# EasyConvert release script.
#
# The version bump and CHANGELOG entry land on main through a normal PR
# (package.json, README badge, sw.js CACHE_NAME, CHANGELOG.md). This script
# then tags that version and pushes the tag; the GitHub Release itself is
# created by .github/workflows/release.yml, which uses the matching
# CHANGELOG.md section as the release notes.

set -euo pipefail

REPO_URL="https://github.com/NX1X/EasyConvert"

fail() { echo "ERROR: $1" >&2; exit 1; }

git rev-parse --git-dir > /dev/null 2>&1 || fail "Not in a git repository."

BRANCH=$(git rev-parse --abbrev-ref HEAD)
[ "$BRANCH" = "main" ] || fail "Releases are tagged from main (currently on '$BRANCH')."

[ -z "$(git status --porcelain)" ] || fail "Working tree is not clean. Commit or stash first."

git fetch origin main --tags
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || \
    fail "Local main is not in sync with origin/main. Pull or push first."

VERSION=$(node -p "require('./package.json').version")
TAG="v$VERSION"

grep -q "^## \[$VERSION\]" CHANGELOG.md || \
    fail "CHANGELOG.md has no '## [$VERSION]' section. Add it before releasing."

if git rev-parse "$TAG" > /dev/null 2>&1; then
    fail "Tag $TAG already exists."
fi

echo "About to tag and push $TAG (version from package.json)."
read -p "Continue? (y/N): " -n 1 -r
echo ""
[[ $REPLY =~ ^[Yy]$ ]] || { echo "Cancelled."; exit 0; }

git tag -a "$TAG" -m "Release $TAG"
git push origin "$TAG"

echo ""
echo "Tag $TAG pushed. The release workflow is creating the GitHub Release:"
echo "  $REPO_URL/actions/workflows/release.yml"
echo "  $REPO_URL/releases/tag/$TAG"
