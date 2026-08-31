# DevOps Architect Pro

A Claude Code skill that gives Claude a searchable local knowledge base of DevOps, cloud, and
platform-engineering guidance — instead of one giant system prompt, each fact lives as a row in a CSV,
ranked at query time with a small stdlib-only BM25 engine (`scripts/core.py` + `scripts/search.py`). No
external services, no API keys, no network calls, no vector database.

## What's in it

23 domains, ~295 rows of real, specific, actionable guidance — each row has a topic, keywords, the actual
advice, a concrete Do/Don't pair, a runnable example (command/config/code), a severity rating, and a link
to the canonical official docs:

`aws` · `azure` · `kubernetes` · `docker` · `terraform` · `cloudformation` · `ansible` · `jenkins` ·
`github-actions` · `python` · `java` · `spring-boot` · `postgresql` · `patroni` · `kafka` · `snowflake` ·
`databricks` · `ai-agents` · `langchain` · `mcp` · `ci-cd` · `linux` · `cloudflare`

See `SKILL.md` for the full domain-to-file mapping and the workflow Claude follows when using this skill,
and `references/quick-reference.md` for a priority-ordered cheat sheet across all 23 domains.

## Example usage

```bash
python scripts/search.py "terraform state lock" --domain terraform
python scripts/search.py "kafka consumer rebalance" --domain kafka
python scripts/search.py "vacuum autovacuum" --domain postgresql
python scripts/search.py "pod without resource limits"          # domain auto-detected
python scripts/search.py "terraform state lock" --domain terraform --json
python scripts/search.py --list-domains
```

Default output is truncated human-readable text (5 results); pass `--full` to disable truncation, `-n`
to change the result count, or `--json` for machine-readable output.

## Structure

```
devops-architect-pro/
├── SKILL.md                    # skill definition + workflow instructions
├── README.md                   # this file
├── data/*.csv                  # 23 domain knowledge bases, one CSV per domain
├── references/quick-reference.md  # priority-ordered cross-domain cheat sheet
└── scripts/
    ├── core.py                 # BM25 search engine + domain auto-detection
    └── search.py               # CLI entry point
```

## Provenance

This skill's *architecture* — CSV-backed rows searched via a stdlib BM25 engine instead of a monolithic
system prompt — was modeled on a real production Claude Code skill called `ui-ux-pro-max`. No content was
copied from it: every row in `data/*.csv` and every word of `references/quick-reference.md` was written
from scratch for this skill. This is an original implementation of that architectural pattern, applied to
a different domain (DevOps/platform engineering rather than UI/UX).
