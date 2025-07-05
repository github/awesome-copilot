#!/bin/bash
# Script to fix line endings in all markdown files

echo "Normalizing line endings in markdown files..."

# Find all markdown files and convert CRLF to LF
find . -name "*.md" -type f -exec sed -i 's/\r$//' {} \;

echo "Done! All markdown files now have LF line endings."
