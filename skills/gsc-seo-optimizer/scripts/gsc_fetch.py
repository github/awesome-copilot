#!/usr/bin/env python3
"""Read-only Search Console client. No embedded credentials or quota project."""
import argparse
import json
import os
import re
import sys
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"]
DIMENSIONS = {"query", "page", "country", "device", "date", "searchAppearance"}


def window(end, days):
    if days < 1:
        raise ValueError("days must be positive")
    return end - timedelta(days=days - 1), end


def build_service(quota_project=None):
    try:
        import google.auth
        from googleapiclient.discovery import build
    except ImportError:
        raise ValueError("API mode requires google-api-python-client and google-auth. "
                         "Install scripts/requirements-api.txt in a virtual environment, "
                         "or use import_gsc.py without dependencies.") from None
    creds, _ = google.auth.default(scopes=SCOPES)
    quota = quota_project or os.getenv("GOOGLE_CLOUD_QUOTA_PROJECT")
    if quota:
        creds = creds.with_quota_project(quota)
    return build("searchconsole", "v1", credentials=creds, cache_discovery=False)


def filters(country=None, page=None, device=None):
    values = [("country", country), ("page", page), ("device", device)]
    selected = [{"dimension": k, "operator": "equals", "expression": v}
                for k, v in values if v]
    return [{"filters": selected}] if selected else None


def request(service, prop, start, end, dims, scope, search_type="web", **extra):
    body = {"startDate": str(start), "endDate": str(end), "dimensions": dims,
            "type": search_type, "dataState": "final", **extra}
    if scope:
        body["dimensionFilterGroups"] = scope
    return service.searchanalytics().query(siteUrl=prop, body=body).execute()


def fetch_rows(service, prop, start, end, dims, scope, search_type="web", limit=25000):
    if limit < 1:
        raise ValueError("limit must be positive")
    rows = []
    aggregation = None
    while len(rows) < limit:
        size = min(25000, limit - len(rows))
        response = request(service, prop, start, end, dims, scope, search_type,
                           rowLimit=size, startRow=len(rows))
        aggregation = response.get("responseAggregationType", aggregation)
        batch = response.get("rows", [])
        rows.extend(batch)
        if len(batch) < size:
            break
    # A full cap is ambiguous without another request; do not call it complete.
    return rows, len(rows) >= limit, aggregation


def collect(service, prop, start, end, dims, country=None, page=None,
            device=None, search_type="web", limit=25000):
    scope = filters(country, page, device)
    rows, capped, aggregation = fetch_rows(
        service, prop, start, end, dims, scope, search_type, limit)
    totals = request(service, prop, start, end, [], scope, search_type,
                     rowLimit=1).get("rows", [])
    issues = [{"type": "DETAIL_NOT_EXHAUSTIVE", "severity": "info",
               "detail": "Search Analytics detail may omit anonymized/low-volume rows; "
                         "pagination does not guarantee all underlying data."}]
    if capped:
        issues.append({"type": "ROW_CAP_REACHED", "severity": "warning",
                       "detail": "Configured cap reached; increase --limit or query a shortlisted page."})
    if not rows:
        issues.append({"type": "NO_DETAIL_ROWS", "severity": "warning",
                       "detail": "No returned detail is not proof of no queries or no indexing."})
    baseline = totals[0] if totals else None
    return {
        "schemaVersion": 1, "source": "google-search-console-api", "property": prop,
        "startDate": str(start), "endDate": str(end), "inclusiveDays": (end-start).days+1,
        "timezone": "America/Los_Angeles", "dataState": "final", "searchType": search_type,
        "country": country, "page": page, "device": device, "dimensions": dims,
        "responseAggregationType": aggregation, "rowCount": len(rows), "rows": rows,
        "scopeTotal": baseline, "totalScope": "filtered" if scope else "property",
        "diagnostics": {"rowCapReached": capped, "limit": limit, "issues": issues,
                        "note": "Do not sum detail rows to substitute for scopeTotal."},
    }


def available_end(service, prop, candidate, scope, search_type):
    rows, _, _ = fetch_rows(service, prop, candidate-timedelta(days=89), candidate,
                            ["date"], scope, search_type, 100)
    if not rows:
        raise ValueError("No finalized date rows in the last 90 days for this scope. "
                         "Check property/filters, supply explicit dates, or use exports; "
                         "this is not an indexing verdict.")
    return date.fromisoformat(max(row["keys"][0] for row in rows))


def parser():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("command", choices=["sites", "query", "inspect", "sitemaps"])
    p.add_argument("--property", "-p")
    p.add_argument("--quota-project", help="Optional user-owned quota attribution project")
    p.add_argument("--days", "-d", type=int, default=28)
    p.add_argument("--start", type=date.fromisoformat)
    p.add_argument("--end", type=date.fromisoformat)
    p.add_argument("--compare", action="store_true", help="Previous equal non-overlapping period")
    p.add_argument("--dimensions", default="page", help="Comma-separated; empty string for totals")
    p.add_argument("--country", type=str.lower, help="Target ISO alpha-3, e.g. usa or deu; no fixed default")
    p.add_argument("--page", help="Exact URL filter, also the URL to inspect")
    p.add_argument("--device", choices=["DESKTOP", "MOBILE", "TABLET"])
    p.add_argument("--search-type", default="web", choices=["web", "image", "video", "news", "discover", "googleNews"])
    p.add_argument("--limit", type=int, default=25000, help="Total client row cap, paginated in batches of 25000")
    p.add_argument("--output", help="Optional local JSON output (default stdout)")
    return p


def run(args, service):
    if args.command == "sites":
        return service.sites().list().execute()
    if not args.property:
        raise ValueError("--property is required; select the exact property with sites first")
    accessible = service.sites().list().execute().get("siteEntry", [])
    if not any(x["siteUrl"] == args.property and x.get("permissionLevel") != "siteUnverifiedUser"
               for x in accessible):
        raise ValueError("Requested property is not accessible. Run sites and choose the exact match.")
    if args.command == "sitemaps":
        return {"property": args.property, "sitemaps": service.sitemaps().list(siteUrl=args.property).execute(),
                "note": "Sitemap indexed counts are not a whole-site indexing verdict."}
    if args.command == "inspect":
        if not args.page:
            raise ValueError("inspect requires --page with an exact URL")
        return {"property": args.property, "url": args.page, "inspection": service.urlInspection().index().inspect(
            body={"inspectionUrl": args.page, "siteUrl": args.property, "languageCode": "en-US"}).execute()}
    if args.days < 1 or args.limit < 1:
        raise ValueError("--days and --limit must be positive")
    if args.country and not re.fullmatch("[a-z]{3}", args.country):
        raise ValueError("--country must be an ISO alpha-3 code, e.g. usa or deu")
    dims = [d.strip() for d in args.dimensions.split(",") if d.strip()]
    if len(set(dims)) != len(dims) or any(d not in DIMENSIONS for d in dims):
        raise ValueError("Unsupported or duplicate dimensions")
    if args.start and not args.end:
        raise ValueError("An explicit --start requires --end")
    end = args.end
    if end is None:
        candidate = datetime.now(ZoneInfo("America/Los_Angeles")).date()-timedelta(days=1)
        end = available_end(service, args.property, candidate,
                            filters(args.country, args.page, args.device), args.search_type)
    start = args.start or window(end, args.days)[0]
    if start > end:
        raise ValueError("--start cannot be after --end")
    def period(s, e):
        return collect(service, args.property, s, e, dims, args.country, args.page,
                       args.device, args.search_type, args.limit)
    current = period(start, end)
    current["endSelection"] = "explicit" if args.end else "latest-returned-finalized-date"
    if not args.end:
        current["diagnostics"]["issues"].append({
            "type": "AVAILABLE_DATE_NOT_COMPLETENESS_PROOF", "severity": "info",
            "detail": "Latest returned finalized date; days with no data may be omitted."})
    if not args.compare:
        return current
    previous_end = start-timedelta(days=1)
    previous_start = window(previous_end, (end-start).days+1)[0]
    return {"current": current, "previous": period(previous_start, previous_end)}


def main():
    p = parser()
    args = p.parse_args()
    try:
        result = run(args, build_service(args.quota_project))
        encoded = json.dumps(result, ensure_ascii=False, indent=2)+"\n"
        if args.output:
            from pathlib import Path
            Path(args.output).write_text(encoded, encoding="utf-8")
        else:
            print(encoded, end="")
    except Exception as error:
        # Keep upstream credential/request objects out of output.
        if isinstance(error, ValueError):
            p.error(str(error))
        print(f"GSC request failed ({type(error).__name__}). Check Google authorization, "
              "property access, quota attribution and network. No credential data printed.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
