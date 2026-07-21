#!/bin/bash

# EasyConvert Release Script
# Automates version bumping and release process

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    print_error "Not in a git repository!"
    exit 1
fi

# Check if there are uncommitted changes
if [[ -n $(git status --porcelain) ]]; then
    print_warning "You have uncommitted changes. Please commit or stash them first."
    git status --short
    exit 1
fi

# Parse arguments
if [[ $# -lt 1 ]]; then
    echo "Usage: $0 <patch|minor|major|version> [release-notes]"
    echo ""
    echo "Examples:"
    echo "  $0 patch \"Fixed table detection bug\""
    echo "  $0 minor \"Added new export format\""
    echo "  $0 major \"Complete UI redesign\""
    echo "  $0 1.2.3 \"Custom version with release notes\""
    exit 1
fi

BUMP_TYPE=$1
RELEASE_NOTES=${2:-"Version bump"}

# Get current version from package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")
print_status "Current version: $CURRENT_VERSION"

# Calculate new version
if [[ $BUMP_TYPE =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    # Custom version provided
    NEW_VERSION=$BUMP_TYPE
else
    # Calculate based on bump type
    IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
    MAJOR=${VERSION_PARTS[0]}
    MINOR=${VERSION_PARTS[1]}
    PATCH=${VERSION_PARTS[2]}

    case $BUMP_TYPE in
        "patch")
            PATCH=$((PATCH + 1))
            ;;
        "minor")
            MINOR=$((MINOR + 1))
            PATCH=0
            ;;
        "major")
            MAJOR=$((MAJOR + 1))
            MINOR=0
            PATCH=0
            ;;
        *)
            print_error "Invalid bump type: $BUMP_TYPE"
            exit 1
            ;;
    esac

    NEW_VERSION="$MAJOR.$MINOR.$PATCH"
fi

print_status "New version: $NEW_VERSION"

# Confirm the release
echo ""
print_warning "About to release version $NEW_VERSION"
print_status "Release notes: $RELEASE_NOTES"
echo ""
read -p "Continue? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_status "Release cancelled."
    exit 0
fi

# Update version using Node.js script
print_status "Updating version files..."
if [[ -f "scripts/update-version.js" ]]; then
    node scripts/update-version.js "$NEW_VERSION" "$RELEASE_NOTES"
else
    print_error "Version update script not found!"
    exit 1
fi

# Commit changes
print_status "Committing version changes..."
git add .
git commit -m "Release v$NEW_VERSION

$RELEASE_NOTES"

# Create and push tag
print_status "Creating git tag v$NEW_VERSION..."
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION

$RELEASE_NOTES"

# Push changes and tags
print_status "Pushing to remote repository..."
git push origin main
git push origin "v$NEW_VERSION"

print_success "Successfully released version $NEW_VERSION!"
print_status "🎉 Release completed! Version $NEW_VERSION is now live."
print_status "📝 Changelog updated with release notes"
print_status "🏷️  Git tag v$NEW_VERSION created and pushed"
print_status "🚀 All changes pushed to remote repository"

echo ""
print_status "View your release at: https://github.com/nx1xlab/easyconvert/releases/tag/v$NEW_VERSION" 