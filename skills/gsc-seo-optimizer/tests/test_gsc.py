import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from datetime import date
import zipfile

ROOT = Path(__file__).resolve().parents[1]



def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


fetch = module("gsc_fetch", ROOT / "scripts/gsc_fetch.py")
imp = module("import_gsc", ROOT / "scripts/import_gsc.py")



class Response:
    def __init__(self, value): self.value = value
    def execute(self): return self.value


class FakeService:
    def __init__(self, handler, props=None):
        self.handler = handler
        self.calls = []
        self.props = props or [{"siteUrl": "sc-domain:example.test", "permissionLevel": "siteOwner"}]
    def sites(self): return self
    def list(self): return Response({"siteEntry": self.props})
    def searchanalytics(self): return self
    def query(self, siteUrl, body):
        self.calls.append((siteUrl, body))
        return Response(self.handler(body))


class ApiTests(unittest.TestCase):
    def test_inclusive_leap_and_week_windows(self):
        self.assertEqual(fetch.window(date(2024, 3, 1), 3), (date(2024, 2, 28), date(2024, 3, 1)))
        self.assertEqual(fetch.window(date(2026, 9, 24), 28)[0], date(2026, 8, 28))
        self.assertEqual(fetch.window(date(2026, 9, 24), 7)[0], date(2026, 9, 18))
        with self.assertRaises(ValueError): fetch.window(date(2026, 9, 24), 0)

    def test_compare_scope_and_totals_are_independent(self):
        def response(body):
            if not body["dimensions"]:
                return {"rows": [{"clicks": 11, "impressions": 100, "ctr": .11, "position": 8}]}
            return {"rows": [{"keys": ["https://example.test/tool"], "clicks": 2,
                              "impressions": 30, "ctr": 2/30, "position": 12}],
                    "responseAggregationType": "byPage"}
        service = FakeService(response)
        args = fetch.parser().parse_args(["query", "--property", "sc-domain:example.test", "--end", "2026-09-24",
                                          "--country", "deu", "--compare"])
        result = fetch.run(args, service)
        self.assertEqual(result["current"]["startDate"], "2026-08-28")
        self.assertEqual(result["previous"]["endDate"], "2026-08-27")
        self.assertEqual(result["previous"]["startDate"], "2026-07-31")
        self.assertEqual(result["current"]["scopeTotal"]["clicks"], 11)
        self.assertEqual(result["current"]["rows"][0]["clicks"], 2)
        self.assertTrue(all(call[1]["dataState"] == "final" for call in service.calls))
        self.assertTrue(all(call[1]["dimensionFilterGroups"][0]["filters"][0]["expression"] == "deu"
                            for call in service.calls))

    def test_wrong_property_cannot_query(self):
        service = FakeService(lambda _: {})
        args = fetch.parser().parse_args(["query", "--property", "sc-domain:other.test"])
        with self.assertRaisesRegex(ValueError, "not accessible"): fetch.run(args, service)
        self.assertEqual(service.calls, [])

    def test_pagination_and_client_cap(self):
        service = FakeService(lambda b: {"rows": [{"keys": [str(i)]} for i in
                             range(b["startRow"], min(25003, b["startRow"]+b["rowLimit"]))]})
        rows, capped, _ = fetch.fetch_rows(service, "x", date(2026, 1, 1), date(2026, 1, 2),
                                           ["query"], None, limit=50000)
        self.assertEqual(len(rows), 25003)
        self.assertFalse(capped)
        self.assertEqual(service.calls[1][1]["startRow"], 25000)
        _, capped, _ = fetch.fetch_rows(service, "x", date(2026, 1, 1), date(2026, 1, 2),
                                        ["query"], None, limit=10)
        self.assertTrue(capped)

    def test_missing_queries_does_not_zero_totals(self):
        service = FakeService(lambda b: {"rows": [] if b["dimensions"] else [{"clicks": 2, "impressions": 10}]})
        out = fetch.collect(service, "x", date(2026, 1, 1), date(2026, 1, 2), ["query"], page="https://x.test/a")
        self.assertEqual(out["rows"], [])
        self.assertEqual(out["scopeTotal"]["impressions"], 10)
        self.assertEqual(out["totalScope"], "filtered")
        self.assertTrue(any(i["type"] == "NO_DETAIL_ROWS" for i in out["diagnostics"]["issues"]))
        self.assertEqual(service.calls[0][1]["dimensionFilterGroups"], service.calls[1][1]["dimensionFilterGroups"])

    def test_available_date_probe_sparse_and_empty(self):
        service = FakeService(lambda _: {"rows": [{"keys": ["2026-09-18"]}, {"keys": ["2026-09-24"]}]})
        self.assertEqual(fetch.available_end(service, "x", date(2026, 9, 27), None, "web"), date(2026, 9, 24))
        empty = FakeService(lambda _: {})
        with self.assertRaisesRegex(ValueError, "not an indexing verdict"):
            fetch.available_end(empty, "x", date(2026, 9, 27), None, "web")


class ImportTests(unittest.TestCase):
    def test_missing_values_percent_bom_and_unicode(self):
        table = imp.parse_table("q.csv", '\ufeffTop queries,Clicks,Impressions,CTR,Position\ncafé,2,100,2%,—\nunknown,,10,,8\n'.encode())
        self.assertEqual(table["rows"][0]["ctr"], .02)
        self.assertIsNone(table["rows"][0]["position"])
        self.assertIsNone(table["rows"][1]["clicks"])
        self.assertIsNone(table["rows"][1]["ctr"])

    def test_decimal_comma_explicit_and_large_integer(self):
        table = imp.parse_table("q.csv", b'Top queries;Clicks;Impressions;CTR;Position\nx;12;1.234;0,97%;12,5\n', "de")
        self.assertEqual(table["rows"][0]["impressions"], 1234)
        self.assertEqual(table["rows"][0]["position"], 12.5)
        with self.assertRaisesRegex(ValueError, "number-format"):
            imp.number("12,5", "position", "en")

    def test_comparison_and_nonfinite_rejected(self):
        with self.assertRaises(ValueError):
            imp.parse_table("q.csv", b'Query,Clicks,Clicks,Impressions\nx,1,2,3\n')
        with self.assertRaises(ValueError): imp.number("NaN", "position")
        with self.assertRaises(ValueError): imp.number("Infinity", "position")
        with self.assertRaises(ValueError): imp.number("20", "ctr")

    def test_separate_tables_never_joined_and_metadata_preserved(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder)/"export.zip"
            with zipfile.ZipFile(path, "w") as archive:
                for p in (ROOT/"tests/fixtures").glob("*.csv"):
                    archive.write(p, p.name)
            out = imp.normalize(path, "sc-domain:example.test", date(2026,8,28), date(2026,9,24), "deu")
            self.assertEqual(len(out["tables"]), 3)
            self.assertIsNone(out["scopeTotal"])
            self.assertEqual(out["inclusiveDays"], 28)
            self.assertEqual(out["scopeVerification"], "user-declared")
            self.assertFalse(any(t.get("dimensions") == ["query", "page"] for t in out["tables"]))
            self.assertTrue(any(t["kind"] == "metadata-or-unrecognized" for t in out["tables"]))

    def test_zip_names_are_not_extracted(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder)/"export.zip"
            with zipfile.ZipFile(path, "w") as archive:
                archive.writestr("../escaped.csv", "Query,Clicks,Impressions\nx,1,10\n")
            self.assertEqual(len(imp.load_tables(path, "en")), 1)
            self.assertFalse((Path(folder).parent/"escaped.csv").exists())

    def test_chart_scope_conflict(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder)/"chart.csv"
            path.write_text("Date,Clicks,Impressions\n2026-08-01,1,10\n")
            with self.assertRaisesRegex(ValueError, "outside declared window"):
                imp.normalize(path, "sc-domain:example.test", date(2026,9,1), date(2026,9,28))

    def test_unknown_property_requires_clarification_not_placeholder(self):
        with self.assertRaisesRegex(ValueError, "exact sc-domain"):
            imp.normalize(ROOT/"tests/fixtures/Pages.csv", "UNVERIFIED:example.test",
                          date(2026,8,28), date(2026,9,24))
        out = imp.normalize(ROOT/"tests/fixtures/Pages.csv", None,
                            date(2026,8,28), date(2026,9,24))
        self.assertIsNone(out["property"])
        self.assertEqual(out["propertyVerification"], "unknown")
        self.assertEqual(out["scopeVerification"], "incomplete")

    def test_cli_works_without_site_packages(self):
        # -S excludes site packages, proving export mode doesn't require Google SDKs.
        run = subprocess.run([sys.executable, "-S", str(ROOT/"scripts/import_gsc.py"),
                              str(ROOT/"tests/fixtures/Pages.csv"), "--property", "sc-domain:example.test",
                              "--start", "2026-08-28", "--end", "2026-09-24", "--country", "deu"],
                             capture_output=True, text=True)
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assertEqual(json.loads(run.stdout)["tables"][0]["rowCount"], 2)



if __name__ == "__main__": unittest.main()
