"""SQL-001 draft: client-callable functions that run caller-supplied SQL (parity with Supabase lints 0031/0032, splinter 2026.11.0).
Static, migrations only. Stdlib. Integrate into quickscan.scan() as a new check; not merged."""
import re
FN_RX = re.compile(r"create\s+(?:or\s+replace\s+)?function\s+(?:(\"?\w+\"?)\.)?(\"?\w+\"?)\s*\((.*?)\)\s*(.*?)as\s+(\$\w*\$)(.*?)\5(.*?);", re.I | re.S)
SQLISH = {"sql", "query", "stmt", "statement", "command", "cmd", "sql_query", "query_text", "sql_text"}
def _params(sig):
    out = []
    for p in [x.strip() for x in sig.split(",") if x.strip()]:
        p = re.sub(r"\s+default\s+.*$", "", p, flags=re.I)
        toks = p.split()
        if toks and toks[0].lower() in ("in", "variadic", "inout"):
            toks = toks[1:]
        if len(toks) >= 2 and re.match(r"(text|varchar|character varying)(\[\])?$", toks[1], re.I):
            out.append(toks[0].strip('"').lower())
    return out
def _uses_param_in_execute(body, params):
    b = body.lower()
    # variables assigned from a param: v := ... || param
    tainted = set(params)
    for m in re.finditer(r"(\w+)\s*:=\s*([^;]+);", b):
        if any(re.search(rf"\b{re.escape(t)}\b", m.group(2)) and not re.search(rf"quote_(ident|literal|nullable)\(\s*{re.escape(t)}\s*\)", m.group(2)) for t in tainted):
            tainted.add(m.group(1))
    for m in re.finditer(r"\bexecute\b\s+(?!function\b|procedure\b)([^;]+);", b):
        expr = re.split(r"\busing\b", m.group(1))[0]
        expr = re.sub(r"quote_(ident|literal|nullable)\(\s*\w+\s*\)", "", expr)
        expr = re.sub(r"'[^']*'", "''", expr)
        if any(re.search(rf"\b{re.escape(t)}\b", expr) for t in tainted):
            return True
    return False
def find(sql_files):
    """sql_files: {rel: text}. Returns list of findings dicts."""
    all_sql = "\n".join(sql_files.values()).lower()
    out = []
    for rel, text in sorted(sql_files.items()):
        for m in FN_RX.finditer(text):
            schema = (m.group(1) or "public").strip('"').lower()
            name, sig, pre, body, post = m.group(2).strip('"'), m.group(3), m.group(4), m.group(6), m.group(7)
            attrs = (pre + " " + post).lower()
            if schema != "public" or "plpgsql" not in attrs:
                continue
            params = _params(sig)
            if not params or not re.search(r"\bexecute\b", body, re.I):
                continue
            direct = _uses_param_in_execute(body, params)
            if not (direct or any(p in SQLISH for p in params)):
                continue
            rv = lambda role: re.search(rf"revoke\s+(all|execute)[^;]*on\s+function\s+(public\.)?\"?{re.escape(name.lower())}\"?[^;]*from[^;]*\b{role}\b", all_sql)
            anon_off, auth_off, pub_off = bool(rv("anon")), bool(rv("authenticated")), bool(rv("public"))
            # Postgres grants EXECUTE to PUBLIC by default; revoking only anon/authenticated leaves it callable (Supabase KB + database functions guide).
            if anon_off and auth_off and pub_off:
                continue
            who = "anyone with your anon key" if not (anon_off and pub_off) else "any signed-up user"
            definer = "security definer" in attrs
            sev = "critical" if (definer and direct) else "high"
            line = text.count("\n", 0, m.start()) + 1
            out.append({"id": "SQL-001", "severity": sev, "file": rel, "line": line,
                        "title": f"`{name}()` runs SQL passed in by the caller and {who} can call it at /rest/v1/rpc/{name}" + (" (security definer: runs as the owner, bypassing RLS)" if definer else ""),
                        "evidence": "execute with a text parameter; not revoked from " + ", ".join(r for r, off in (("anon", anon_off), ("authenticated", auth_off), ("public", pub_off)) if not off),
                        "fix": f"revoke execute on function public.{name} from anon, authenticated, public;  -- or drop it; Supabase lint 0031/0032"})
    return out
