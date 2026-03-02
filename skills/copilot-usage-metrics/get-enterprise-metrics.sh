#!/usr/bin/env bash
# Fetch aggregated Copilot usage metrics for an enterprise
# Usage: get-enterprise-metrics.sh <enterprise> [day]
#   enterprise - GitHub enterprise slug
#   day        - (optional) specific day in YYYY-MM-DD format

set -euo pipefail

ENTERPRISE="${1:?Usage: get-enterprise-metrics.sh <enterprise> [day]}"
DAY="${2:-}"

if [ -n "$DAY" ]; then
  gh api \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "/enterprises/$ENTERPRISE/copilot/usage/day?day=$DAY"
else
  gh api \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "/enterprises/$ENTERPRISE/copilot/usage"
fi
