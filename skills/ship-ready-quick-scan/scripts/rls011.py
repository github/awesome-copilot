"""RLS-011 (QS-DEFPRIV): SECURITY DEFINER functions in public that a signed-out visitor can call at /rest/v1/rpc.
Parity: Supabase lint 0028 (anon_security_definer_function_executable). Static, migrations only, stdlib.
Postgres grants EXECUTE on new functions to PUBLIC by default (and Supabase default privileges add anon/authenticated),
so a definer function is callable signed-out unless EXECUTE is revoked from both public and anon."""
import re, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sql001
FN_RX = sql001.FN_RX
WRITE_RX = re.compile(r"\b(insert\s+into|update\s+\w|delete\s+from|truncate)\b", re.I)
def _covers(stmt_rx, all_sql, role):
    return any(re.search(rf"\b{role}\b", m.group(0)) for m in re.finditer(stmt_rx, all_sql))
def find(sql_files):
    all_sql = "\n".join(sql_files.values()).lower()
    already = {f["title"].split("`")[1].rstrip("()") for f in sql001.find(sql_files)}
    # schema-wide or default-privilege revokes
    defpriv = r"alter\s+default\s+privileges[^;]*revoke\s+(all|execute)[^;]*on\s+functions[^;]*from[^;]*;"
    allfn = r"revoke\s+(all|execute)[^;]*on\s+all\s+functions\s+in\s+schema\s+public[^;]*from[^;]*;"
    out = []
    for rel, text in sorted(sql_files.items()):
        for m in FN_RX.finditer(text):
            schema = (m.group(1) or "public").strip('"').lower()
            name, pre, body, post = m.group(2).strip('"'), m.group(4), m.group(6), m.group(7)
            attrs = (pre + " " + post).lower()
            if schema != "public" or "security definer" not in attrs or re.search(r"returns\s+(event_)?trigger\b", attrs):
                continue
            if name in already:
                continue
            n = re.escape(name.lower())
            rv = lambda role: re.search(rf"revoke\s+(all|execute)[^;]*on\s+function\s+(public\.)?\"?{n}\"?[^;]*from[^;]*\b{role}\b", all_sql)
            # Supabase docs: PUBLIC's EXECUTE comes from a GLOBAL default, so a schema-scoped `alter default privileges ... in schema ...` revoke from public has no effect on it; only the global form counts for public.
            defpriv_ok = {"anon": _covers(defpriv, all_sql, "anon"),
                          "public": any(re.search(r"from[^;]*\bpublic\b", m.group(0)) for m in re.finditer(defpriv, all_sql) if not re.search(r"\bin\s+schema\b", m.group(0)))}
            off = {r: bool(rv(r)) or _covers(allfn, all_sql, r) or defpriv_ok[r] for r in ("anon", "public")}
            regrant = re.search(rf"grant\s+(all|execute)[^;]*on\s+function\s+(public\.)?\"?{n}\"?[^;]*to[^;]*\b(anon|public)\b", all_sql)
            if off["anon"] and off["public"] and not regrant:
                continue
            writes = bool(WRITE_RX.search(body))
            line = text.count("\n", 0, m.start()) + 1
            missing = [r for r in ("public", "anon") if not off[r]]
            out.append({"id": "RLS-011", "severity": "high" if writes else "medium", "file": rel, "line": line,
                        "title": f"`{name}()` is security definer (runs as the owner, RLS skipped) and anyone with your anon key can call it at /rest/v1/rpc/{name}" + (" — it writes or deletes data" if writes else ""),
                        "evidence": ("granted to anon/public" if regrant else "EXECUTE not revoked from " + ", ".join(missing)),
                        "fix": f"revoke execute on function public.{name} from public, anon;  -- grant to authenticated only if signed-in users need it; or make it security invoker. Supabase lint 0028"})
    return out
if __name__ == "__main__":
    root = sys.argv[1]
    files = {}
    for dp, _, fs in os.walk(root):
        for f in fs:
            if f.endswith(".sql"):
                p = os.path.join(dp, f); files[os.path.relpath(p, root)] = open(p).read()
    for f in find(files): print(f["severity"], f["title"], "|", f["evidence"])
