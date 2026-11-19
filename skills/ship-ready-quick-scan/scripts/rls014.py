"""RLS-014 (QS-DEFGRANT): migrations that re-add default table grants to API roles (anon/authenticated/public).
Since Supabase's 30 Oct 2026 change (changelog 45329), new public tables get no Data API grants. The common 42501 quick fix
`alter default privileges ... grant ... on tables to anon, authenticated` makes every FUTURE table reachable on creation, RLS or not.
Also flags bulk `grant ... on all tables in schema public to anon|public`. Stdlib, static."""
import re, os, sys
DEF_RX = re.compile(r"alter\s+default\s+privileges\b[^;]*?\bgrant\s+([^;]*?)\s+on\s+tables\s+to\s+([^;]*);", re.I | re.S)
BULK_RX = re.compile(r"\bgrant\s+([^;]*?)\s+on\s+all\s+tables\s+in\s+schema\s+(\"?\w+\"?)\s+to\s+([^;]*);", re.I | re.S)
API = ("anon", "authenticated", "public")
def _roles(s):
    return [r for r in API if re.search(rf"\b{r}\b", s, re.I)]
def find(sql_files):
    out = []
    for rel, text in sorted(sql_files.items()):
        for m in DEF_RX.finditer(text):
            stmt = m.group(0)
            sch = re.search(r"\bin\s+schema\s+([\w\", ]+?)\s+grant\b", stmt, re.I)
            schemas = [x.strip(' "').lower() for x in sch.group(1).split(",")] if sch else ["(all schemas)"]
            if sch and "public" not in schemas:
                continue
            roles = _roles(m.group(2))
            if not roles:
                continue
            if re.search(r"\bfor\s+(role|user)\s+(supabase_\w+|pg_\w+)\b", stmt, re.I):
                continue
            sev = "high" if ("anon" in roles or "public" in roles) else "medium"
            out.append({"id": "RLS-014", "severity": sev, "file": rel, "line": text.count("\n", 0, m.start()) + 1,
                        "title": f"Migration re-adds default table grants to {', '.join(roles)}: every table created later is reachable through the Data API on creation, with or without RLS",
                        "evidence": " ".join(stmt.split())[:110],
                        "fix": "Drop this statement. Grant per table in the migration that creates it (grant ... on public.t to authenticated), together with enable row level security and a policy."})
        for m in BULK_RX.finditer(text):
            if m.group(2).strip('"').lower() != "public":
                continue
            roles = [r for r in _roles(m.group(3)) if r in ("anon", "public")]
            if not roles:
                continue
            out.append({"id": "RLS-014", "severity": "high", "file": rel, "line": text.count("\n", 0, m.start()) + 1,
                        "title": f"Bulk grant on all tables in public to {', '.join(roles)}: any of them without RLS is readable by anyone with your anon key",
                        "evidence": " ".join(m.group(0).split())[:110],
                        "fix": "Grant per table, only the operations each role needs, and only on tables with RLS enabled and policies written."})
    return out
if __name__ == "__main__":
    root = sys.argv[1]; files = {}
    for dp, _, fs in os.walk(root):
        for f in fs:
            if f.endswith(".sql"):
                p = os.path.join(dp, f); files[os.path.relpath(p, root)] = open(p).read()
    for f in find(files): print(f["severity"], f["title"], "|", f["evidence"])
