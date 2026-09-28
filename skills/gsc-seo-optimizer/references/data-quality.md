# Data quality gates

## Scope

Match exact property and URL prefix, inclusive dates, market, device, search type, and page/query filters. Record whether scope came from API requests, export metadata, or user declaration. Country-filtered rankings and worldwide totals answer different questions. Do not compare them directly.

Use the latest returned finalized date as an available-data endpoint, not proof that a site with no rows has no traffic. API date rows can omit zero-data days. Search Analytics reports Pacific-time calendar dates, not the user's local midnight.

## Totals and detail

Property aggregation counts a property's appearance differently from page aggregation. Query rows omit anonymized searches; detailed exports and API responses can be capped. Page/query sums can be above or below the property total. Never compute a simplistic “coverage percentage” or derive missing non-brand clicks by subtraction without compatible aggregates and classifications.

Use zero-dimension API totals with matching filters, or the chart totals from the same UI/export scope. A page-filtered baseline is page-scoped, not the whole property. If no independent totals exist, report “visible rows only.” Zero clicks in visible query rows is not proof of zero non-brand clicks overall.

Search Analytics sorts most result sets by clicks; low-click rows can disappear at the row limit. Requesting more rows and pagination avoids a client-imposed cutoff, but the API still does not guarantee all underlying rows. A response reaching the configured cap is a warning, not proof that exactly N additional rows exist. A shorter response is not proof of complete query coverage.

For a shortlisted page, query that exact page directly rather than inferring absence from a sitewide top-row set. Preserve missing values as unknown; do not turn them into zeros. Do not average CTR percentages or positions unweighted; totals use clicks / impressions, and descriptive weighted positions require consistent aggregation and impression weights.

## Exports

Standard GSC exports commonly contain separate Queries, Pages, Countries, Devices, Search appearance, Chart and Filters tables. Tables are separate views, not joinable records. Pages and queries have no inferred one-to-one mapping.

For page-specific diagnosis, the user can filter GSC to a URL and export its Queries table. Record the page filter. Country/device/date-filter metadata must be checked against the declared scope. The importer preserves Filters tables but does not interpret localized natural-language dates; the agent must reconcile them before analysis. Comparison exports with duplicated/date-prefixed columns should be re-exported as two separate windows or mapped explicitly, never guessed.

Even an exported page/query table does not automatically provide property totals. Respect export row caps and note the sampling window. If a browser/connector is missing, a valid page-level report is preferable to insisting on that tool.

## Brand, sitelinks and interpretation

Build a case-insensitive brand alias list from the user/site. Include known misspellings only when supported; a generic word inside a query is not automatically brand intent. Mark ambiguous terms separately.

Inspect page-specific queries. A pricing/about/contact page ranking near position one with low CTR can simply be a brand sitelink. Do not propose title changes based on a generic CTR curve. Compare intent, device, and SERP context where available; small counts do not support precise CTR forecasts.

Changes in page/query/market mix can move average rank independently of existing keyword performance. Compare matched query-page pairs, while separately describing newly visible and disappearing rows. Do not treat a disappearing row as definite lost ranking.

## Indexing and causal claims

Use URL Inspection for Google-selected canonical, last crawl, fetch state, robots and indexing verdict. Current live HTML and Google's last crawl may differ. A sitemap API `indexed=0` field is not a full-site deindexing diagnosis. Exact Page indexing UI buckets require UI evidence; a URL sample cannot establish a sitewide rate.

Before interpreting an SEO edit, check deployment date, Google's recrawl if relevant, complete post-change days, seasonal patterns, and other releases. Provide a review date, not a promised ranking lift. Anchor a post-change review window to the actual deployment date, not the historical baseline endpoint. For proposed edits, make the review date conditional on deployment; count complete post-change evidence days only through the latest finalized data date, not through today. Low volume may justify waiting or fixing a confirmed technical issue, not fabricating an opportunity batch.

API reference: https://developers.google.com/webmaster-tools/v1/searchanalytics/query
