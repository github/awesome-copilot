# Data access

Resolve script paths relative to this skill's installed directory, not the workspace or a private home directory. In the commands below, run from the skill directory or substitute its absolute path.

## CSV / ZIP: no account or third-party Python dependencies

In GSC Performance select the exact property, search type, date range and market/device filters, then export CSV. A ZIP of the CSV tables is supported. For comparisons export each window separately; the importer intentionally rejects ambiguous comparison columns. For a shortlisted page, add an exact page filter and export its Queries table separately.

```bash
python3 scripts/import_gsc.py /path/to/export.zip \
  --property sc-domain:example.com --start 2026-08-28 --end 2026-09-24 \
  --country deu --output /path/to/workspace/gsc-current.json
```

`--country`, `--device`, and `--page` **declare the export's filters; they do not filter the file**. Check preserved Filters records against these declarations. The importer never guesses a site's property or market from a filename. Scope remains user-declared until reconciled. If the exact property is unknown, omit `--property`: the output preserves null/unknown and marks scope incomplete. Do not invent a placeholder or infer domain versus URL-prefix property from page URLs. You can inspect the supplied rows while asking for the exact property, but defer cross-period/sitewide conclusions until scope is confirmed.

Supported: UTF-8 CSV (including BOM), comma/semicolon/tab separation, English and common Chinese metric headers, standard separate export tables, and explicit combined page/query tables. `--number-format de` supports decimal-comma numbers **with supported headers**; it does not translate German headers. Other headers require deliberate mapping or an English re-export. XLSX is not supported by this helper. Use other available file tools only when their mapping is explicit.

Missing metrics stay null. Tables stay separate. The output has `scopeTotal: null`; use the verified Chart table/API response for an independently scoped total, rather than summing query/page tables. ZIPs are read in memory, never extracted. Limits: 25 MiB input/uncompressed CSV data, 100 CSV members. Nothing is uploaded and there is no telemetry.

## Google API: existing user authorization

Use existing authorized credentials; never inspect browser credentials. If API setup is desired, the user's Google OAuth credential must authorize Search Console read access and the selected property. Application Default Credentials (ADC) alone may lack the Search Console scope. A service account also needs property access. Follow current Google guidance: https://developers.google.com/webmaster-tools/v1/how-tos/authorizing

Install optional dependencies in a virtual environment, not the system Python:

```bash
python3 -m venv /path/to/workspace/.venv-gsc
/path/to/workspace/.venv-gsc/bin/pip install -r scripts/requirements-api.txt
/path/to/workspace/.venv-gsc/bin/python scripts/gsc_fetch.py sites
```

The script uses `google.auth.default` with the readonly scope. Quota attribution uses the credential's own setting, `GOOGLE_CLOUD_QUOTA_PROJECT`, or explicit `--quota-project`. No account, project, or credential is embedded. Do not print tokens, credential files, or secrets while diagnosing auth failures.

```bash
# Select the exact property returned by sites; this is an example only.
python3 scripts/gsc_fetch.py query --property sc-domain:example.com \
  --days 28 --country deu --dimensions page --compare \
  --output /path/to/workspace/gsc-pages.json

# Query a shortlisted page directly, using exactly the same date window.
python3 scripts/gsc_fetch.py query --property sc-domain:example.com \
  --start 2026-08-28 --end 2026-09-24 --country deu \
  --page https://example.com/tool --dimensions query --limit 50000

python3 scripts/gsc_fetch.py inspect --property sc-domain:example.com \
  --page https://example.com/tool
python3 scripts/gsc_fetch.py sitemaps --property sc-domain:example.com
```

Without `--end`, the fetcher probes the last 90 Pacific-calendar days for finalized date rows in the selected scope and uses the latest returned day. Reuse that resulting window explicitly for other tables so all comparisons align. Sparse scopes can have an earlier last observed day: this is an available-data date, not proof of when processing finished.

`--start` requires `--end`. `--days 28` includes exactly 28 days. `--compare` requests the preceding non-overlapping window of equal length. `--limit` is a client cap across 25,000-row batches; reaching it is flagged, and even paginated results are not guaranteed exhaustive. `scopeTotal` comes from a separate zero-dimension query with matching filters; failures do not silently become zero totals.

The commands are read-only. They never submit a sitemap, request indexing, alter a property or deploy content. Output file names are user-selected; keep private data out of version control.

## Browser fallback

Use the browser tool actually available to the user, rather than requiring a particular vendor's tool name. Request login/property selection when necessary; continue other supported work while waiting. Use UI for exact indexing aggregate buckets or additional query checks, while acknowledging that anonymized queries may remain hidden there too.
