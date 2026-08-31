#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DevOps Architect Pro Search
Usage: python search.py "<query>" [--domain <domain>] [-n <max_results>] [--json] [--full] [--list-domains]

Domains: aws, azure, kubernetes, docker, terraform, cloudformation, ansible, jenkins,
         github-actions, python, java, spring-boot, postgresql, patroni, kafka,
         snowflake, databricks, ai-agents, langchain, mcp, ci-cd, linux, cloudflare
"""

import argparse
import io
import json as json_module
import sys

from core import DOMAINS, MAX_RESULTS, UNTRUNCATED_COLS, search

# Force UTF-8 stdout/stderr to handle non-ASCII on Windows (cp1252 default)
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
if sys.stderr.encoding and sys.stderr.encoding.lower() != "utf-8":
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

TRUNCATE_AT = 300


def format_output(result, full=False):
    if "error" in result:
        return f"Error: {result['error']}"

    lines = ["## DevOps Architect Pro - Search Results"]
    domain_note = result["domain"]
    if result.get("auto_detected"):
        domain_note += " (auto-detected"
        if result.get("runner_up_domain"):
            domain_note += f", runner-up: {result['runner_up_domain']}"
        domain_note += ")"
    lines.append(f"**Domain:** {domain_note} | **Query:** {result['query']}")
    lines.append(f"**Source:** {result['file']} | **Found:** {result['count']} results\n")

    if result["count"] == 0:
        lines.append(
            "No matches. This is not a match with an empty value -- the query did not hit "
            "the database. Retry once with broader/different keywords (try the technology "
            "name alone, separately from the symptom) before falling back to general "
            "knowledge, and say explicitly that no database match was found if you do."
        )
        suggestions = result.get("suggestions") or []
        if suggestions:
            lines.append(f"**Closest known terms:** {', '.join(suggestions)}")
        return "\n".join(lines)

    for i, row in enumerate(result["results"], 1):
        lines.append(f"### Result {i}")
        for key, value in row.items():
            value_str = str(value)
            if not full and key not in UNTRUNCATED_COLS and len(value_str) > TRUNCATE_AT:
                value_str = value_str[:TRUNCATE_AT] + "..."
            lines.append(f"- **{key}:** {value_str}")
        lines.append("")

    return "\n".join(lines)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="DevOps Architect Pro Search")
    parser.add_argument("query", nargs="?", default="", help="Search query")
    parser.add_argument("--domain", "-d", choices=list(DOMAINS.keys()), help="Search domain")
    parser.add_argument("--max-results", "-n", type=int, default=MAX_RESULTS, help="Max results (default: 5)")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--full", action="store_true", help="Do not truncate long field values")
    parser.add_argument("--list-domains", action="store_true", help="List available domains and exit")
    args = parser.parse_args()

    if args.list_domains:
        for d in DOMAINS:
            print(d)
        sys.exit(0)

    if not args.query:
        parser.error("query is required unless --list-domains is passed")

    result = search(args.query, args.domain, args.max_results)
    if args.json:
        print(json_module.dumps(result, indent=2, ensure_ascii=False))
    else:
        print(format_output(result, full=args.full))
