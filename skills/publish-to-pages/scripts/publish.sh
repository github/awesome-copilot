#!/bin/bash
# Main publish script
# Args: $1 = path to index.html, $2 = repo name, $3 = visibility (private|public), $4 = description
set -euo pipefail

HTML_FILE="$1"
REPO_NAME="$2"
VISIBILITY="${3:-public}"
DESCRIPTION="${4:-Published via publish-to-pages}"

USERNAME=$(gh api user --jq '.login')

# Check if repo exists
if gh repo view "$USERNAME/$REPO_NAME" &>/dev/null; then
    echo "ERROR: Repository $USERNAME/$REPO_NAME already exists"
    exit 1
fi

# Create repo
gh repo create "$REPO_NAME" --"$VISIBILITY" --description "$DESCRIPTION"

# Clone, push, enable pages
TMPDIR=$(mktemp -d)
git clone "https://github.com/$USERNAME/$REPO_NAME.git" "$TMPDIR"

HTML_DIR=$(dirname "$HTML_FILE")

# Copy HTML file as index.html
cp "$HTML_FILE" "$TMPDIR/index.html"

# Copy assets directory if it exists alongside the HTML file
if [ -d "$HTML_DIR/assets" ]; then
    cp -r "$HTML_DIR/assets" "$TMPDIR/assets"
    echo "Copied assets/ directory ($(find "$HTML_DIR/assets" -type f | wc -l) files)"
fi

cd "$TMPDIR"
git add -A
git commit -m "Publish content"
git push origin main

# Enable GitHub Pages
gh api "repos/$USERNAME/$REPO_NAME/pages" -X POST -f source[branch]=main -f source[path]=/ 2>/dev/null || true

echo "REPO_URL=https://github.com/$USERNAME/$REPO_NAME"
echo "PAGES_URL=https://$USERNAME.github.io/$REPO_NAME/"
echo ""
echo "GitHub Pages may take 1-2 minutes to deploy."

# Cleanup
rm -rf "$TMPDIR"
