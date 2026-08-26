# Fastah geofeed quality analyzer

Portable final-release Python 3.14+ implementation bundled with the
`tuning-geofeeds` Agent Skill. It parses public RFC 8805 geofeeds locally into a typed, versioned
Analysis IR and provides deterministic validation, relationship analysis,
optional direct-RIR RDAP evidence, host-mediated Fastah MCP exchange, IR-only
renderers, and explicit approval-gated corrected CSV export.

Install from a user-selected working directory. Keep the release tree
read-only so committed schemas and dashboard assets remain unchanged:

```bash
PACKAGE_ROOT="/absolute/path/to/tuning-geofeeds/package"
python3.14 -m venv /absolute/work-directory/.venv
cp -R "$PACKAGE_ROOT" /absolute/work-directory/tuning-geofeeds-runtime
/absolute/work-directory/.venv/bin/python -m pip install \
  /absolute/work-directory/tuning-geofeeds-runtime
/absolute/work-directory/.venv/bin/python -m geofeed_quality.cli --help
```

Install from the working copy, never from the read-only distribution tree;
Python build frontends may write local build metadata beside their input.

Verify that Python reports a final release, not an alpha, beta, or release
candidate. If Python 3.14 is unavailable and current `uv` is already installed,
`uv python install 3.14` and `uv venv --python 3.14 /absolute/work-directory/.venv`
are supported alternatives. Do not assume `uv` exists. Update it through its
trusted installation channel (`uv self update` is for standalone installs).

If a cloud or corporate host cannot safely fetch an arbitrary public URL, ask
the user to upload the CSV. Do not bypass the host's network policy or
reconstruct the feed. Analysis records `source.sha256` for optional audits and
for binding approvals to the analyzed file.

The skill workflow and safety boundaries are in [`../SKILL.md`](../SKILL.md).

## MCP schema boundary

`schema/mcp-place-search-request.schema.json` and
`schema/mcp-place-search-response.schema.json` are frozen local
adapter/exchange contract v1.0 schemas. They validate the analyzer's local
export/import envelope and retained audit captures; they do not define the live
Fastah MCP server contract. After normal host OAuth, discover the current tool
definition with `tools/list` before enrichment. This workflow uses
`rfc8805-row-place-search` when its discovered `inputSchema` and `outputSchema`
support the local privacy-preserving adapter. If it has no `outputSchema` or is
incompatible, skip MCP enrichment and continue with local analysis.
