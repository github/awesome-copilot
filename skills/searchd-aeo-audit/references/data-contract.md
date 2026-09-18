# Audit data contract

`audit.json` must conform to `schemas/audit.schema.json`.

## Top-level fields

- `schema_version`: always `searchd-aeo-audit-v1`.
- `audit`: target and measurement metadata.
- `questions`: ordered question definitions.
- `runs`: one completed or failed record per research worker.
- `insights`: evidence-linked recommendations.

## Run rules

- `status` is `completed` or `failed`.
- `agent_version`, `searched_at`, and `search_queries` preserve execution
  provenance. Use an empty query list when the host cannot expose its search
  queries; do not reconstruct them.
- Completed runs may be named or not named.
- `answer_text` preserves the complete worker answer; `answer_excerpt` is the
  short report preview.
- Failed runs must have empty answer fields and are excluded from calculated
  rates.
- `brand_position` is a positive one-based integer only when the answer
  contains an ordered list and the target brand appears in it.
- `relationship` is one of:
  - `first_party`
  - `competitor_owned`
  - `editorial`
  - `directory`
  - `community`
  - `other`

## Calculation rules

```text
named rate = completed runs naming the brand / all completed runs
question coverage = questions with at least one named completed run /
                    questions with at least one completed run
competitor mentions = completed runs naming each competitor
cited-domain answers = completed runs citing each normalized domain
```

Co-mentions are not mutually exclusive. Do not render competitor totals as a
pie chart or call them market share.

## Evidence rules

- Preserve exact source URLs after validating that each uses `http` or `https`
  and includes a host.
- Excerpts should be short enough to review but must not alter their meaning.
- Analyst notes are commentary and must not be presented as source text.
- Every insight references at least one run ID in `evidence_ids`.
