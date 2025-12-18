#!/bin/bash

# Awesome Copilot MCP Server Beta Release Script
# This script prepares and publishes a beta version of the MCP server

set -e

echo "🚀 Preparing Awesome Copilot MCP Server Beta Release"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "eng/mcp-server" ]; then
    echo -e "${RED}Error: Please run this script from the awesome-copilot repository root${NC}"
    exit 1
fi

# Run tests
echo -e "${YELLOW}Running tests...${NC}"
npm run test:mcp

# Build the MCP server
echo -e "${YELLOW}Building MCP server...${NC}"
npm run build:mcp

# Check if user is logged in to npm
if ! npm whoami > /dev/null 2>&1; then
    echo -e "${RED}Error: You must be logged in to npm. Run 'npm login' first.${NC}"
    exit 1
fi

# Confirm beta release
echo -e "${YELLOW}Ready to publish @github/awesome-copilot-mcp@beta${NC}"
read -p "Do you want to proceed with the beta release? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Beta release cancelled."
    exit 0
fi

# Publish beta version
echo -e "${GREEN}Publishing beta version...${NC}"
npm run publish:mcp:beta

echo -e "${GREEN}✅ Beta release published successfully!${NC}"
echo ""
echo "📦 Package: @github/awesome-copilot-mcp@beta"
echo "📖 Installation: npm install @github/awesome-copilot-mcp@beta"
echo "🐛 Report issues: https://github.com/github/awesome-copilot/issues"
echo ""
echo "Next steps:"
echo "1. Update the beta version number in eng/mcp-server/package.json for the next release"
echo "2. Announce the beta release in relevant channels"
echo "3. Monitor for feedback and issues"