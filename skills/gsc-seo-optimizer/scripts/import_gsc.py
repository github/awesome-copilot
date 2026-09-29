#!/usr/bin/env python3
"""Normalize separate GSC CSV/ZIP tables locally; never invent a page-query join."""
import argparse
import csv
import io
import json
import math
import re
import sys
import zipfile
from datetime import date
from pathlib import Path
from urllib.parse import urlsplit

MAX_BYTES = 25 * 1024 * 1024
ALIASES = {
    "top queries": "query", "query": "query", "queries": "query", "热门查询": "query", "查询": "query",
    "top pages": "page", "page": "page", "pages": "page", "热门网页": "page", "网页": "page",
    "country": "country", "countries": "country", "国家/地区": "country",
    "device": "device", "devices": "device", "设备": "device",
    "date": "date", "日期": "date", "search appearance": "searchAppearance", "搜索结果呈现": "searchAppearance",
    "clicks": "clicks", "点击次数": "clicks", "impressions": "impressions", "展示次数": "impressions",
    "ctr": "ctr", "点击率": "ctr", "position": "position", "average position": "position", "排名": "position",
    "平均排名": "position",
}
METRICS = {"clicks", "impressions", "ctr", "position"}


def number(raw, metric, number_format="en"):
    value = raw.strip().replace("\u00a0", "").replace(" ", "")
    if value in {"", "-", "—", "N/A", "n/a"}:
        return None
    percent = value.endswith("%")
    if percent:
        value = value[:-1]
    if number_format == "de":
        if not re.fullmatch(r"(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d+)?", value):
            raise ValueError(f"Invalid {metric} number; check --number-format")
        value = value.replace(".", "").replace(",", ".")
    else:
        if not re.fullmatch(r"(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?", value):
            raise ValueError(f"Invalid {metric} number; check --number-format")
        value = value.replace(",", "")
    parsed = float(value)
    if not math.isfinite(parsed) or parsed < 0:
        raise ValueError(f"Invalid {metric} value")
    if metric == "ctr":
        if percent:
            parsed /= 100
        if parsed > 1:
            raise ValueError("CTR must be a fraction or include %, e.g. 0.02 or 2%")
    elif percent:
        raise ValueError(f"Unexpected percent in {metric}")
    if metric in {"clicks", "impressions"}:
        if not parsed.is_integer():
            raise ValueError(f"{metric} must be an integer; check --number-format")
        return int(parsed)
    return parsed


def parse_table(name, raw, number_format="en"):
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise ValueError(f"{name}: use a UTF-8 CSV export") from None
    try:
        dialect = csv.Sniffer().sniff(text[:8192], delimiters=",;\t")
    except csv.Error:
        dialect = csv.excel
    reader = csv.reader(io.StringIO(text), dialect)
    header = next(reader, None)
    if not header:
        raise ValueError(f"{name}: empty CSV")
    header = [h.strip() for h in header]
    keys = [ALIASES.get(h.casefold()) for h in header]
    data = [row for row in reader if any(v.strip() for v in row)]
    if any(len(row) != len(header) for row in data):
        raise ValueError(f"{name}: inconsistent CSV column count")
    recognized = [k for k in keys if k]
    if len(set(recognized)) != len(recognized):
        raise ValueError(f"{name}: duplicate metric/dimension columns; export each comparison window separately")
    if not METRICS.intersection(recognized):
        # Metadata stays separate. Unknown metrics/translated files are not guessed.
        return {"file": name, "kind": "metadata-or-unrecognized", "header": header,
                "records": data, "requiresReview": True}
    if "clicks" not in recognized or "impressions" not in recognized:
        raise ValueError(f"{name}: need clicks and impressions; comparison/localized headers require explicit mapping")
    if any(k is None for k in keys):
        raise ValueError(f"{name}: unsupported columns; use an English export or map headers explicitly")
    dims = [k for k in keys if k not in METRICS]
    if not dims:
        raise ValueError(f"{name}: no recognized dimension; do not assume these rows are property totals")
    rows = []
    for index, values in enumerate(data, 2):
        row = {"keys": []}
        for key, value in zip(keys, values):
            if key in METRICS:
                try:
                    row[key] = number(value, key, number_format)
                except ValueError as error:
                    raise ValueError(f"{name}, row {index}: {error}") from None
            else:
                value = value.strip()
                if not value:
                    raise ValueError(f"{name}, row {index}: empty dimension")
                if key == "date":
                    try:
                        date.fromisoformat(value)
                    except ValueError:
                        raise ValueError(f"{name}: dates must be ISO YYYY-MM-DD") from None
                row["keys"].append(value)
        clicks, impressions = row.get("clicks"), row.get("impressions")
        if clicks is not None and impressions is not None:
            if clicks > impressions:
                raise ValueError(f"{name}, row {index}: clicks exceed impressions")
            if row.get("ctr") is None:
                row["ctr"] = clicks/impressions if impressions else 0.0
        rows.append(row)
    issues = ["Export may be row-limited or omit anonymized queries; do not infer completeness."]
    if len(rows) >= 1000:
        issues.append("At least 1000 rows: verify the export's row limit before using detail totals.")
    return {"file": name, "kind": "analytics", "dimensions": dims, "rowCount": len(rows),
            "rows": rows, "issues": issues}


def load_tables(path, number_format):
    path = Path(path)
    if path.stat().st_size > MAX_BYTES:
        raise ValueError("Input exceeds 25 MiB; split the export")
    if path.suffix.lower() == ".zip":
        with zipfile.ZipFile(path) as archive:
            members = [m for m in archive.infolist() if not m.is_dir() and m.filename.lower().endswith(".csv")]
            if len(members) > 100 or sum(m.file_size for m in members) > MAX_BYTES:
                raise ValueError("ZIP exceeds 100 CSV files or 25 MiB uncompressed")
            if not members:
                raise ValueError("ZIP has no CSV files; use GSC's CSV export")
            # Read in memory only. Never extract filenames onto the filesystem.
            return [parse_table(m.filename, archive.read(m), number_format) for m in members]
    if path.suffix.lower() != ".csv":
        raise ValueError("Use a .csv or CSV .zip export; Excel files are not supported by this importer")
    return [parse_table(path.name, path.read_bytes(), number_format)]


def normalize(path, prop, start, end, country=None, device=None, page=None,
              search_type="web", number_format="en"):
    if prop is None:
        valid_property = True
    elif prop.startswith("sc-domain:"):
        domain = prop[len("sc-domain:"):]
        valid_property = bool(domain) and not any(c.isspace() or c in "/:@?#" for c in domain)
    else:
        parsed = urlsplit(prop)
        valid_property = (parsed.scheme in {"http", "https"} and bool(parsed.hostname)
                          and not parsed.username and not parsed.password
                          and not parsed.query and not parsed.fragment
                          and not any(c.isspace() for c in prop))
    if not valid_property:
        raise ValueError("Declare the exact sc-domain:domain or HTTP(S) URL-prefix property; "
                         "do not invent a property from a page hostname")
    if start > end:
        raise ValueError("start cannot be after end")
    tables = load_tables(path, number_format)
    if not any(t["kind"] == "analytics" for t in tables):
        raise ValueError("No recognized analytics tables; use English headers or an explicit column mapping")
    for table in tables:
        if table.get("dimensions") == ["date"]:
            for row in table["rows"]:
                if not start <= date.fromisoformat(row["keys"][0]) <= end:
                    raise ValueError("Chart dates fall outside declared window; verify export scope")
    issues = ["Scope is user-declared. Review preserved Filters metadata before drawing conclusions.",
              "Tables are separate views. Never join Pages and Queries or sum tables into property totals.",
              "No independent scopeTotal has been inferred. Use verified chart/API totals separately."]
    if prop is None:
        issues.append("Exact property is unknown. Do not infer domain-vs-prefix property from page URLs; "
                      "clarify before cross-period or sitewide conclusions.")
    if not any("query" in t.get("dimensions", []) and "page" in t.get("dimensions", []) for t in tables):
        issues.append("No combined page-query table. A page-filtered Queries export supports only that declared page.")
    if any(t["kind"] != "analytics" for t in tables):
        issues.append("Metadata/unrecognized tables require review; they were not discarded or treated as metrics.")
    return {"schemaVersion": 1, "source": "gsc-export", "property": prop,
            "startDate": str(start), "endDate": str(end), "inclusiveDays": (end-start).days+1,
            "timezone": "America/Los_Angeles", "searchType": search_type,
            "country": country, "device": device, "page": page,
            "scopeVerification": "user-declared" if prop else "incomplete",
            "propertyVerification": "user-declared" if prop else "unknown",
            "scopeTotal": None, "tables": tables, "issues": issues}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("input", help="UTF-8 CSV or ZIP containing CSVs")
    p.add_argument("--property", help="Exact GSC property if known; otherwise retained as unknown")
    p.add_argument("--start", type=date.fromisoformat, required=True)
    p.add_argument("--end", type=date.fromisoformat, required=True)
    p.add_argument("--country", type=str.lower, help="Declare export filter; does NOT filter the rows")
    p.add_argument("--device", help="Declare export device filter")
    p.add_argument("--page", help="Declare exact page filter for a targeted Queries export")
    p.add_argument("--search-type", default="web", choices=["web", "image", "video", "news", "discover", "googleNews"])
    p.add_argument("--number-format", choices=["en", "de"], default="en", help="en: 1,234.5; de: 1.234,5")
    p.add_argument("--output")
    args = p.parse_args()
    try:
        if args.country and not re.fullmatch("[a-z]{3}", args.country):
            raise ValueError("--country must be ISO alpha-3")
        result = normalize(args.input, args.property, args.start, args.end, args.country,
                           args.device, args.page, args.search_type, args.number_format)
        encoded = json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False)+"\n"
        if args.output:
            Path(args.output).write_text(encoded, encoding="utf-8")
        else:
            print(encoded, end="")
    except (ValueError, OSError, zipfile.BadZipFile, RuntimeError) as error:
        p.error(str(error))


if __name__ == "__main__":
    main()
