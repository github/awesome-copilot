"""AUTH-013 (QS-USERMETA): RLS policies or security functions that authorize from Supabase Auth user_metadata.
user_metadata (raw_user_meta_data) is editable by the signed-in user via supabase.auth.updateUser({ data }), so a policy
that checks user_metadata.role lets anyone make themselves admin. Mirrors Supabase Advisor lint 0015
(rls_references_user_metadata, ERROR), which only looks at policies; this also catches helper functions that read
raw_user_meta_data. Stdlib, static, on migrations."""
import re, os, sys
POLICY_RX = re.compile(r"\bcreate\s+policy\b[^;]*;", re.I | re.S)
FUNC_RX = re.compile(r"\bcreate\s+(?:or\s+replace\s+)?function\b.*?(?:\$\w*\$).*?(?:\$\w*\$)[^;]*;", re.I | re.S)
META_RX = re.compile(r"(auth\.jwt\(\)\s*->+\s*'user_metadata'|request\.jwt\.claims[^;]*user_metadata|raw_user_meta_data|user_metadata\s*->>?\s*'(role|is_admin|admin|plan|tier|org_id|tenant_id|team_id))", re.I)
def _line(text, pos):
    return text.count("\n", 0, pos) + 1
def find(sql_files):
    out = []
    for rel, text in sorted(sql_files.items()):
        for m in POLICY_RX.finditer(text):
            stmt = m.group(0); hit = META_RX.search(stmt)
            if not hit:
                continue
            name = re.search(r"create\s+policy\s+(\"[^\"]+\"|\w+)", stmt, re.I)
            out.append({"id": "AUTH-013", "severity": "critical", "file": rel, "line": _line(text, m.start() + hit.start()),
                        "title": f"Policy {name.group(1) if name else ''} authorizes from user_metadata, which any signed-in user can edit (updateUser) to grant themselves access",
                        "evidence": " ".join(stmt.split())[:110],
                        "fix": "Read roles from app_metadata (auth.jwt() -> 'app_metadata', set only by the server) or from a roles table users can't write, never user_metadata."})
        for m in FUNC_RX.finditer(text):
            fn = m.group(0)
            if "raw_user_meta_data" not in fn.lower() and "user_metadata" not in fn.lower():
                continue
            hit = re.search(r"(raw_user_meta_data|user_metadata)\s*->>?\s*'(role|is_admin|admin|plan|tier|org_id|tenant_id|team_id)'", fn, re.I)
            if not hit:
                continue  # e.g. a signup trigger copying full_name into profiles is fine
            fname = re.search(r"function\s+([\w\.\"]+)", fn, re.I)
            out.append({"id": "AUTH-013", "severity": "high", "file": rel, "line": _line(text, m.start() + hit.start()),
                        "title": f"Function {fname.group(1) if fname else ''} reads '{hit.group(2)}' from user metadata; if policies or code trust it, users can set it themselves",
                        "evidence": " ".join(hit.group(0).split())[:110],
                        "fix": "Store role/plan/tenant in app_metadata or a server-written table. If this is a signup trigger, don't copy role/plan from metadata; set a safe default."})
    return out
if __name__ == "__main__":
    root = sys.argv[1]; files = {}
    for dp, _, fs in os.walk(root):
        for f in fs:
            if f.endswith(".sql"):
                p = os.path.join(dp, f); files[os.path.relpath(p, root)] = open(p).read()
    for f in find(files): print(f["severity"], f["line"], f["title"], "|", f["evidence"])
