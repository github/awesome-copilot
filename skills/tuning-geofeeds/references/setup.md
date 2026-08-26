# Python setup

The portable analyzer requires a final—not alpha, beta, or release
candidate—Python 3.14 or newer. Resolve the skill root from the installed skill
location and choose a user working directory:

```bash
SKILL_ROOT="/absolute/path/to/tuning-geofeeds"
cd "$SKILL_ROOT"
WORK="/absolute/path/to/user-selected-work-directory"
mkdir -p "$WORK"
BOOTSTRAP_PYTHON="/absolute/path/to/python3.14"
"$BOOTSTRAP_PYTHON" -c 'import sys; assert sys.version_info >= (3, 14) and sys.version_info.releaselevel == "final", sys.version'
PACKAGE_ROOT="$("$BOOTSTRAP_PYTHON" scripts/geofeed_cli.py --print-package-root)"
"$BOOTSTRAP_PYTHON" -m venv "$WORK/.venv"
PYTHON="$WORK/.venv/bin/python"
RUNTIME_SOURCE="$WORK/tuning-geofeeds-runtime"
cp -R "$PACKAGE_ROOT" "$RUNTIME_SOURCE"
"$PYTHON" -m pip install "$RUNTIME_SOURCE"
```

If Python 3.14 is unavailable and `uv` is already installed, it is an optional
fallback. Keep `uv` current through the same trusted installation channel that
provided it; `uv self update` applies to the standalone installer, while a
package-managed installation should be updated by that package manager. Then:

```bash
uv python install 3.14
BOOTSTRAP_PYTHON="$(uv python find 3.14)"
"$BOOTSTRAP_PYTHON" -c 'import sys; assert sys.version_info >= (3, 14) and sys.version_info.releaselevel == "final", sys.version'
PACKAGE_ROOT="$("$BOOTSTRAP_PYTHON" scripts/geofeed_cli.py --print-package-root)"
uv venv --python 3.14 "$WORK/.venv"
PYTHON="$WORK/.venv/bin/python"
RUNTIME_SOURCE="$WORK/tuning-geofeeds-runtime"
cp -R "$PACKAGE_ROOT" "$RUNTIME_SOURCE"
uv pip install --python "$PYTHON" "$RUNTIME_SOURCE"
```

Do not assume `uv` exists, and do not weaken or pin runtime dependencies to
support an obsolete Python prerelease. The launcher rejects prerelease Python
before importing the analyzer or Pydantic.

On Windows, use the virtual environment interpreter at
`$WORK\.venv\Scripts\python.exe`. Windows users should install Python through
[Python Install Manager in the Microsoft Store](https://apps.microsoft.com/detail/9nq7512cxl7t?hl=en-US)
so it auto-updates; the Microsoft Store is not mandatory. Use the host's file
copy operation to create the same `tuning-geofeeds-runtime` working copy before
installing it.

Run the launcher with the prepared interpreter:

```bash
"$PYTHON" scripts/geofeed_cli.py --help
```

If the host cannot retain the skill root as its working directory, invoke the
same launcher by its resolved absolute path. It does not resolve the bundled
package relative to the caller's current directory.

Cloud-agent and corporate networks often cannot fetch arbitrary HTTPS hosts.
When that happens, ask the user to upload the CSV. This is the intended path.
Do not bypass the host's network policy or reconstruct the feed. Analysis
records `source.sha256` for optional audits and for binding approvals; users do
not normally need to calculate another digest.

The analyzer accepts at most 400,000 data rows. Comments and blank physical
lines do not count. An oversized input fails before any Analysis IR is
generated; never truncate or split it to create partial IR.

Never install directly from `PACKAGE_ROOT`: Python build frontends may write
build or metadata files beside their input. Keep the runtime source copy,
virtual environment, and all analysis outputs in the user-selected working
directory so the installed skill remains read-only.

Downloaded feeds, analysis IR, approval artifacts, reports, and exports remain
in that user-selected local work directory until the user deletes them. Fastah
does not retain those artifacts server-side. Optional RDAP uses only a per-run
in-memory cache by default; persistent caching is not enabled. Fastah MCP
receives only `rowKey`, `countryCode`, `regionCode`, `cityName`, and
`searchMode`; it does not receive the feed, prefixes, comments, Analysis IR,
RDAP evidence, publisher details, proposals, or approvals.
