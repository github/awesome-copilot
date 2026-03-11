#!/usr/bin/env bash
# Fetch aggregated Copilot usage metrics for an organization
# Usage: get-org-metrics.sh <org> [day]
#   org  - GitHub organization name
#   day  - (optional) specific day in YYYY-MM-DD format

set -euo pipefail

ORG="${1:?Usage: get-org-metrics.sh <org> [day]}"
DAY="${2:-}"

if [ -n "$DAY" ]; then
  gh api \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "/orgs/$ORG/copilot/usage/day?day=$DAY"
else
  gh api \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "/orgs/$ORG/copilot/usage"
fi
