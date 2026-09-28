---
name: gsc-seo-optimizer
description: 'Analyze Google Search Console exports or authorized API data to prioritize page improvements. Use for traffic changes, page/query opportunities, indexing evidence, and deciding when to leave recently edited or weakly supported pages alone.'
license: MIT
---

# GSC SEO Optimizer

Turn the user's own search evidence into a small, justified optimization batch. Default to read-only diagnosis. Execute changes only within the user's explicit authorization; existing approval for a concrete batch remains valid. An analysis request never authorizes publishing or spending.

## Establish scope and data route

Confirm the exact GSC property (domain property or URL prefix), target market, Web/other search type, and requested period. Verify the property returned by a connector matches the requested site before using any numbers. Do not choose the first accessible property. Infer from the user's site and supplied context when unambiguous; ask if multiple properties or markets remain plausible.

For ranking analysis use the user's target market, not a universal US default. Global performance totals may be useful separately; label them and never mix scopes in comparisons. If no market can be established, label aggregate findings and defer market-specific ranking claims.

Use the least-friction route already available:

1. **Supplied exports:** CSV or ZIP can be analyzed without credentials. Read [references/data-access.md](references/data-access.md) for the bundled local importer and export requirements.
2. **Existing Google API access:** prefer it for reproducible filtering and comparison. The same reference documents the bundled read-only fetcher, authentication, and URL Inspection.
3. **Connected tools:** inspect their actual capabilities and verify property, scope, freshness, authorization and any cost before use.
4. **Available browser:** use the user's available authorized browser integration for UI-only evidence or missing API access. On login, account selection, 2FA, or permission screens, let the user complete the interaction. Never extract cookies, browser profile data, or passwords. If browser access is unavailable, request exports and continue with available evidence rather than blocking all analysis.

Do not install packages/connectors or start OAuth unless needed and within the user's request. The CSV importer uses Python's standard library. API dependencies are optional and separate.

## Validate before interpreting

Read [references/data-quality.md](references/data-quality.md) before drawing conclusions. Every run must record property, date range, search type, country/device/page filters, data source, and completeness limitations.

- Default to the most recent 28 complete GSC days, compared with the preceding non-overlapping 28 days when assessing change. Use 90 days for sparse sites and 7-day windows for recent releases, without treating short-term movement as causality.
- Dates use GSC's Pacific-time calendar. Inclusive 28-day windows start 27 days before the end. Prefer finalized data and label the latest available date; a missing day is not proof of zero traffic or of ingestion completeness.
- Get overall totals independently from page/query detail. Check row caps, pagination, anonymized queries, filter scope, and aggregation before reporting changes.
- Separate brand, non-brand, and ambiguous terms using user-confirmed brand spellings/aliases. Inspect page-specific queries before calling a low-CTR page an opportunity; branded sitelinks are a common false signal.
- Compare the same query and page when interpreting rank movement. An aggregate average can improve because lower-ranking queries disappeared.
- Do not join separately exported page and query tables to invent query-to-page relationships. Without that evidence, offer page-level findings and state what targeted export is needed.
- Impressions are not an indexing verdict. For indexing conclusions use URL Inspection or explicit UI evidence. Sitemap counts do not establish the indexed count of the whole site.

If query evidence is absent or too sparse, try a targeted page export/query or available UI. UI may also omit anonymized queries. If no stronger evidence is available, lower confidence and continue only with supported findings; never conclude that the page has no keywords.

## Prioritize

Read [references/roi-rubric.md](references/roi-rubric.md) when ranking opportunities. Prefer relevant business intent, a plausible small intervention, and adequate evidence. Call this an opportunity assessment, not measured ROI unless conversion and cost data are supplied.

Distinguish ranking gaps, snippet/intent mismatch, missing query coverage, and confirmed technical problems. Do not diagnose intent mismatch from CTR alone. Two pages appearing for a query do not by themselves prove cannibalization.

Check recent edits in supplied change notes or repository history. Usually observe for at least 7–14 complete post-change days before another overlapping edit; larger ranking effects may take longer. Do not promise a time-to-impact.

Recommend only as many pages as the evidence supports, often 1–5 and sometimes none. For each include URL, scope, clicks/impressions/CTR/position, supporting queries, diagnosis, proposed action, business relevance, confidence, and review interval. Explain important skips. Keep broad informational, irrelevant report, and very sparse pages out of the batch unless a strategic reason is explicit.

## Deliver and optionally execute

Lead with what changed and what to do next. State limitations that would change the decision. Use [references/report-template.md](references/report-template.md) to save a baseline when useful; analysis artifacts belong in the workspace and are not committed by default. Preserve private search data locally unless the user authorizes an external destination.

For approved edits, inspect the project's own instructions and content storage first. Follow existing code/CMS patterns and limit changes to approved pages. Back up changed CMS rows. Align copy with the page's actual functionality; add FAQ/schema only for visible supported content. Avoid mass year updates, keyword stuffing, speculative canonicals, or replacing useful conversion copy with generic SEO prose.

Verify the relevant rendered title, description, canonical, robots, schema, links, and visible content. Run the project's checks appropriate to the changes. Deploy only if authorized. Record changed URLs, edit/deployment dates, baseline, expected mechanism, and review interval. A later comparison can show association, not isolate the edit's causal effect.

## Bundled tools and validation

Use [scripts/import_gsc.py](scripts/import_gsc.py) for local CSV/ZIP exports. The optional [scripts/gsc_fetch.py](scripts/gsc_fetch.py) requires [scripts/requirements-api.txt](scripts/requirements-api.txt) and authorized Google access; setup is in the data-access reference. Python 3.9 or newer is required.

Run `python3 -m unittest discover -s tests -v` from this skill directory. [tests/test_gsc.py](tests/test_gsc.py) checks parsing, scope, date windows, pagination and read-only request construction using synthetic [fixtures](tests/fixtures). API responses are mocked; these tests do not prove live authorization or host compatibility.

## Provenance

Adapted from [Tracetify Skills](https://github.com/tracetify/skills/tree/6ac8e87f7aa76b1ebec9148812b215158f04a059/skills/gsc-seo-optimizer), MIT. See [LICENSE](LICENSE).
