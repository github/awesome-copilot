#!/usr/bin/env python3
"""Ship-Ready Quick Scan (free). Standard library only, read-only, runs offline.

Usage:
  python3 quickscan.py PATH            # scan the app folder at PATH, print the result
  python3 quickscan.py PATH --fail-on=critical|high
                                       # same, but exit 1 if a critical (or critical/high) blocker is found (for CI)

Add --no-promo (or set SHIPREADY_NO_PROMO=1) to leave out the closing note about the paid Crew.

Without --fail-on the exit code is always 0 after a scan.

Runs 12 checks (14 of the 59 rules in the full Ship-Ready scanner, Ship-Ready Crew, plus AUTH-013): the ones that
expose keys, data or money on day one. Same detection logic as the full scanner for these rules.
What it is not: a penetration test or proof of safety. A clean quick scan means "none of these
12 checks found anything", nothing more. Secrets are redacted in all output. Nothing is sent anywhere.
"""
import base64, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sql001, rls011, rls014, auth013

VERSION = "0.2.7"
FULL_RULES = 59          # rule IDs in the full scanner (crew/shared/scripts/shipready_scan.py v1.0.0)
SITE = "https://getshipready.github.io"
SAMPLE_URL = SITE + "/sample"
CREW_URL = SITE + "/crew"
SKIP_DIRS = {"node_modules", ".next", ".git", "dist", "build", ".vercel", ".turbo", "coverage", ".svelte-kit", "out",
             ".claude", ".cursor", ".agents", "playwright-report", "test-results", ".auth", ".ship-ready"}
CODE_EXT = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".vue", ".svelte"}
TEXT_EXT = CODE_EXT | {".sql", ".json", ".env", ".md", ".html", ".toml", ".yaml", ".yml", ".txt"}
SEV_ORDER = {"critical": 4, "high": 3, "medium": 2, "low": 1}

# check id -> (title, rule ids, free Lite skill that fixes it)
CHECKS = [
    ("secrets", "Committed secrets (API keys, Stripe keys, Supabase service_role JWT)", ["SEC-001"], "secret-leak-check"),
    ("envignore", ".env kept out of git (.gitignore)", ["SEC-002"], "secret-leak-check"),
    ("publicenv", "Secrets behind a public env prefix (NEXT_PUBLIC_, VITE_, EXPO_PUBLIC_)", ["SEC-003"], "public-env-audit"),
    ("rlsoff", "Supabase tables with Row Level Security off (never enabled, or disabled later)", ["RLS-001", "RLS-007"], "rls-quick-check"),
    ("rlsread", "Supabase read policies open to everyone (`using (true)`)", ["RLS-002"], "rls-policy-writer"),
    ("rlsview", "Views that skip Row Level Security (no `security_invoker`)", ["RLS-010"], "rls-policy-writer"),
    ("apiauth", "API routes that skip the caller check", ["AUTH-002", "AUTH-003", "AUTH-010"], "protect-routes-nextjs"),
    ("webhook", "Stripe webhook signature verification", ["PAY-001"], "stripe-webhook-verify"),
    ("rpcsql", "Functions anyone can call to run their own SQL", ["SQL-001"], "rls-policy-writer"),
    ("defnfn", "Database functions a signed-out visitor can call (`security definer`)", ["RLS-011"], "rls-policy-writer"),
    ("defgrant", "Default grants that make every new table reachable through the API", ["RLS-014"], "rls-policy-writer"),
    ("usermeta", "Roles or plans read from user_metadata, which signed-in users can edit themselves", ["AUTH-013"], "admin-role-setup"),
]

# check id -> one-line fix instruction for the combined AI-tool prompt
FIX_TEXT = {
    "secrets": "Remove the secret from the code and from any committed .env file, read it from an environment variable instead, and list the key so I can revoke and replace it in the provider's dashboard (deleting it is not enough: it stays in git history).",
    "envignore": "Add .env* to .gitignore (keep !.env.example), stop tracking the file with `git rm --cached`, and keep a .env.example with variable names only.",
    "publicenv": "Rename the variable without the public prefix and use it only in server code (API route, server action or edge function). List it so I can rotate it, since it has already shipped to browsers.",
    "rlsoff": "Write a new migration that runs `alter table <name> enable row level security;` and adds owner-based policies (e.g. `using (auth.uid() = user_id)`).",
    "rlsread": "Replace `using (true)` with a policy that only returns rows the signed-in user owns or is meant to see, and stop exposing private columns (email, role, plan) to other users.",
    "rlsview": "Recreate the view `with (security_invoker = true)` so the caller's Row Level Security applies.",
    "defnfn": "For each function listed, run `revoke execute on function public.<name> from public, anon;` (Postgres lets everyone call new functions by default, so revoking from anon alone is not enough), then grant it back only to `authenticated` if signed-in users need it, or make it `security invoker`. Supabase lint 0028 describes this.",
    "usermeta": "Stop authorizing from `user_metadata` / `raw_user_meta_data` (users can change it with `supabase.auth.updateUser`). Read roles from `app_metadata` (`auth.jwt() -> 'app_metadata'`, writable only by the server) or from a roles table users cannot write, and make any sign-up trigger set a safe default role instead of copying one from the metadata.",
    "defgrant": "Remove the `alter default privileges ... grant ... on tables to anon/authenticated` statement (and any `grant ... on all tables in schema public to anon`). Instead grant per table, in the migration that creates it (`grant select, insert on public.<table> to authenticated;`), together with `enable row level security` and a policy.",
    "rpcsql": "Drop the function, or revoke execute on it from anon, authenticated and public. If you must keep it, pass values as parameters (`execute ... using`) and wrap identifiers in quote_ident() instead of concatenating text the caller sends. Supabase lints 0031/0032 describe this.",
    "apiauth": "At the top of each handler, get the signed-in user from the server-side session, return 401 if there is none, and check they own the record before changing it. For a Supabase edge function with verify_jwt = false, set verify_jwt = true (or delete the line) unless it is a webhook that verifies the provider's signature first.",
    "webhook": "Verify every event with `stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)` using the raw request body, and return 400 if verification fails, before acting on it.",
}
# Extra AUTH-010 HIGH fix line when the flagged function reads LOVABLE_API_KEY
# (Lovable usage limits: project-scoped Pause AI). Counts and verdict stay unchanged.
PAUSE_AI_FIX = "Also set a project 'Pause AI' usage limit in Lovable's usage settings."


class Repo:
    def __init__(self, root):
        self.root = os.path.abspath(root)
        self.files = {}
        for d, dirs, fs in os.walk(self.root):
            dirs[:] = [x for x in dirs if x not in SKIP_DIRS]
            for f in fs:
                p = os.path.join(d, f)
                rel = os.path.relpath(p, self.root)
                ext = os.path.splitext(f)[1].lower()
                if ext in TEXT_EXT or f.startswith(".env") or f in (".gitignore", ".nvmrc", "vercel.json"):
                    try:
                        if os.path.getsize(p) > 1_500_000:
                            continue
                        with open(p, encoding="utf-8", errors="replace") as fh:
                            self.files[rel] = fh.read()
                    except OSError:
                        pass

    def code(self):
        return {k: v for k, v in self.files.items() if os.path.splitext(k)[1].lower() in CODE_EXT}

    def sql(self):
        return {k: v for k, v in self.files.items() if k.endswith(".sql")}


TEST_RX = re.compile(r"(^|/)(e2e|tests?|__tests__|cypress|playwright)/|\.(spec|test)\.[cm]?[jt]sx?$|(^|/)(playwright|vitest|jest)\.config\.")


def is_test_file(rel):
    return bool(TEST_RX.search(rel.replace(os.sep, "/")))


def line_of(text, idx):
    return text.count("\n", 0, idx) + 1


def redact(s):
    s = s.strip()
    return s[:6] + "…" + "[redacted]" if len(s) > 10 else "[redacted]"


def api_route_files(repo):
    out = {}
    for k, v in repo.code().items():
        r = k.replace(os.sep, "/")
        if re.search(r"(^|/)app/api/.+/route\.(t|j)sx?$", r) or re.search(r"(^|/)pages/api/", r) \
           or re.search(r"(^|/)supabase/functions/", r) or re.search(r"(^|/)(server|api)/.+\.(t|j)s$", r):
            out[k] = v
    return out


AUTH_RX = re.compile(r"auth\.getUser\(|getUser\(|getServerSession|auth\(\)|currentUser\(|getAuth\(|verifyIdToken|jwt\.verify|requireUser|withAuth|clerkClient|getToken\(|validateRequest|lucia|get\w*(?:User|Session)\(|verify\w*Token\(|exchangeOAuthCode|exchangeCodeForSession|from ['\"]inngest/next['\"]", re.I)

FN_SECTION_RX = re.compile(r"^\s*\[functions\.([A-Za-z0-9_\-]+)\]\s*$", re.M)
VERIFY_JWT_OFF_RX = re.compile(r"^\s*verify_jwt\s*=\s*false\b", re.M)
SIG_RX = re.compile(r"constructEvent(?:Async)?\(|new\s+Webhook\(|svix|stripe-signature|x-signature|createHmac\(|timingSafeEqual|crypto\.subtle\.verify|WEBHOOK_SECRET|CRON_SECRET", re.I)
PUBLIC_HINT = re.compile(r"auth:\s*['\"]none['\"]")
# @supabase/server wrapper (Supabase's recommended pattern since asymmetric keys): auth 'user'/'secret' checks the caller
SBSERVER_RX = re.compile(r"withSupabase\(\s*\{[^}]*auth:\s*\[?\s*['\"](?:user|secret)(?::[\w*\-]+)?['\"]", re.S)
SBSERVER_PUB_RX = re.compile(r"withSupabase\(\s*\{[^}]*auth:\s*['\"]publishable(?::[\w*\-]+)?['\"]", re.S)


def functions_off(repo):
    out = []
    for rel, text in repo.files.items():
        path = rel.replace(os.sep, "/")
        if path.split("/")[-1] != "config.toml" or "supabase" not in path:
            continue
        secs = list(FN_SECTION_RX.finditer(text))
        for i, m in enumerate(secs):
            end = secs[i + 1].start() if i + 1 < len(secs) else len(text)
            off = VERIFY_JWT_OFF_RX.search(text, m.end(), end)
            if off:
                out.append((m.group(1), rel, line_of(text, off.start())))
    return out


def fn_code(repo, name):
    pre = f"supabase/functions/{name}/"
    return "\n".join(v for k, v in repo.code().items() if pre in k.replace(os.sep, "/"))


def auth010_high_uses_lovable_key(repo, finding):
    """True when a HIGH AUTH-010 finding's function source references LOVABLE_API_KEY."""
    if finding.get("id") != "AUTH-010" or finding.get("severity") != "high":
        return False
    m = re.match(r"`([^`]+)`:", finding.get("title") or "")
    if not m:
        return False
    return "LOVABLE_API_KEY" in fn_code(repo, m.group(1))


def verify_jwt_findings(repo):
    F = []
    for name, rel, line in functions_off(repo):
        code = fn_code(repo, name)
        if not code:
            F.append(("AUTH-010", "info", rel, line, f"`{name}`: verify_jwt = false, function code not found in repo; check it by hand"))
        elif SIG_RX.search(code):
            F.append(("AUTH-010", "info", rel, line, f"`{name}`: verify_jwt = false, but it checks a signature/secret (webhook pattern); OK if that check runs before any work"))
        elif SBSERVER_RX.search(code):
            F.append(("AUTH-010", "info", rel, line, f"`{name}`: verify_jwt = false, caller checked by withSupabase (@supabase/server); OK"))
        elif SBSERVER_PUB_RX.search(code):
            F.append(("AUTH-010", "info", rel, line, f"`{name}`: withSupabase auth 'publishable' only checks the public key, so anyone can call it; fine for public data, add a rate limit"))
        elif AUTH_RX.search(code):
            F.append(("AUTH-010", "info", rel, line, f"`{name}`: verify_jwt = false, user is checked in code; make sure it rejects the anon key with 401"))
        elif PUBLIC_HINT.search(code):
            F.append(("AUTH-010", "info", rel, line, f"`{name}`: marked public (auth: 'none'); add a rate limit and input size cap"))
        else:
            F.append(("AUTH-010", "high", rel, line, f"`{name}`: verify_jwt = false and no user or signature check, anyone can call it"))
    return F


SECRET_PATTERNS = [
    (r"sk_live_[0-9A-Za-z]{10,}", "Stripe LIVE secret key", "critical"),
    (r"rk_live_[0-9A-Za-z]{10,}", "Stripe LIVE restricted key", "critical"),
    (r"sk_test_[0-9A-Za-z]{10,}", "Stripe test secret key", "high"),
    (r"whsec_[0-9A-Za-z]{10,}", "Stripe webhook signing secret", "high"),
    (r"sk-(?:proj-|ant-)?[0-9A-Za-z_\-]{20,}", "OpenAI/Anthropic API key", "critical"),
    (r"AKIA[0-9A-Z]{16}", "AWS access key ID", "critical"),
    (r"gh[pousr]_[0-9A-Za-z]{30,}", "GitHub token", "critical"),
    (r"xox[abposr]-[0-9A-Za-z\-]{10,}", "Slack token", "high"),
    (r"re_[0-9A-Za-z]{8}_[0-9A-Za-z]{24}(?![0-9A-Za-z_])|re_[0-9A-Za-z]{20,}", "Resend API key", "high"),
    (r"sb_secret_[0-9A-Za-z_\-]{20,}", "Supabase secret key (sb_secret_, bypasses RLS)", "critical"),
    (r"github_pat_[0-9A-Za-z_]{50,}", "GitHub fine-grained token", "critical"),
    (r"gsk_[0-9A-Za-z]{40,}", "Groq API key", "high"),
    (r"sk\.eyJ[0-9A-Za-z_\-]{20,}\.[0-9A-Za-z_\-]{10,}", "Mapbox secret token (sk.)", "high"),
    (r"-----BEGIN (?:RSA |EC )?PRIVATE KEY-----", "Private key", "critical"),
]
JWT_RX = re.compile(r"eyJ[0-9A-Za-z_\-]+\.(eyJ[0-9A-Za-z_\-]+)\.[0-9A-Za-z_\-]+")
SENSITIVE_COLS = re.compile(r"\b(email|phone|address|role|is_admin|is_pro|plan|stripe_[a-z_]+|credits|balance|ssn|dob|birth|password|token)\b", re.I)


def jwt_role(payload_b64):
    try:
        pad = "=" * (-len(payload_b64) % 4)
        return json.loads(base64.urlsafe_b64decode(payload_b64 + pad)).get("role")
    except Exception:
        return None


def gitignored_env(repo):
    gi = repo.files.get(".gitignore", "")
    return bool(re.search(r"^\s*\.env(\*|\..*|\s*$)", gi, re.M) or re.search(r"^\s*\*\.env", gi, re.M))


def parse_tables(sql_text):
    tables = {}
    for m in re.finditer(r"create\s+table\s+(?:if\s+not\s+exists\s+)?((?:public\.)?\"?([a-zA-Z0-9_]+)\"?)\s*\((.*?)\);", sql_text, re.I | re.S):
        tables[m.group(2).lower()] = {"cols": m.group(3), "idx": m.start()}
    return tables


def scan(repo):
    F = []
    add = lambda rid, sev, title, file=None, line=None, ev=None: F.append({"id": rid, "severity": sev, "title": title, "file": file, "line": line, "evidence": ev})
    # SEC-002
    env_files = [k for k in repo.files if os.path.basename(k).startswith(".env") and not k.endswith(".example") and "sample" not in k]
    ignored = gitignored_env(repo)
    if env_files and not ignored:
        # Lovable and similar tools commit a .env holding only browser-public values
        # (VITE_/NEXT_PUBLIC_/EXPO_PUBLIC_ URL + anon/publishable key). Those ship to every
        # visitor anyway, so flag it low unless a non-public variable is present.
        PUBLIC_PREFIX = re.compile(r"^\s*(export\s+)?(VITE_|NEXT_PUBLIC_|EXPO_PUBLIC_|REACT_APP_|PUBLIC_)\w*\s*=")
        def env_vars(t):
            return [l for l in t.splitlines() if re.match(r"^\s*(export\s+)?\w+\s*=", l)]
        all_vars = [l for k in env_files for l in env_vars(repo.files.get(k, ""))]
        if all_vars and all(PUBLIC_PREFIX.match(l) for l in all_vars):
            add("SEC-002", "low", ".env is committed but holds only browser-public variables; add .env to .gitignore before you put a real secret in it", env_files[0], 1, ".gitignore has no .env entry")
        else:
            add("SEC-002", "critical", ".env file is not git-ignored", env_files[0], 1, ".gitignore has no .env entry")
    # SEC-001
    seen = set()
    for rel, text in repo.files.items():
        if rel.endswith(".example") or rel.endswith(".md"):
            continue
        in_env = os.path.basename(rel).startswith(".env")
        for rx, label, sev in SECRET_PATTERNS:
            for m in re.finditer(rx, text):
                if (rel, label) in seen:
                    continue
                seen.add((rel, label))
                if in_env and ignored:
                    continue
                add("SEC-001", sev, f"{label} committed in {'env file' if in_env else 'source code'}", rel, line_of(text, m.start()), redact(m.group(0)))
        for m in JWT_RX.finditer(text):
            if jwt_role(m.group(1)) == "service_role":
                if (rel, "srk") in seen:
                    continue
                seen.add((rel, "srk"))
                if in_env and ignored:
                    continue
                add("SEC-001", "critical", "Supabase service_role key committed", rel, line_of(text, m.start()), redact(m.group(0)))
    # SEC-003
    pub = re.compile(r"\b(NEXT_PUBLIC_|VITE_|EXPO_PUBLIC_|REACT_APP_|PUBLIC_)([A-Z0-9_]*(SECRET|SERVICE_ROLE|PRIVATE|SK_|STRIPE|OPENAI|ANTHROPIC|PASSWORD|TOKEN|RESEND|GEMINI|GROQ|MISTRAL|DEEPSEEK|OPENROUTER|REPLICATE|ELEVENLABS|SENDGRID|MAILGUN|TWILIO|XAI_|PERPLEXITY|COHERE)[A-Z0-9_]*)")
    # Browser-safe by design: Stripe publishable keys, Supabase anon/publishable, URLs, IDs.
    pub_safe = re.compile(r"PUBLISHABLE|_PK\b|_PK_|ANON|_URL\b|_ID\b|SITE_KEY|PRICE|PRODUCT|_LINK\b|PAYMENT_LINK|BUY_BUTTON|MAPBOX|POSTHOG|SENTRY_DSN|TURNSTILE|RECAPTCHA")
    seen_vars = set()
    for rel, text in repo.files.items():
        for m in pub.finditer(text):
            if m.group(0) in seen_vars:
                continue
            if pub_safe.search(m.group(0)):
                continue
            seen_vars.add(m.group(0))
            add("SEC-003", "critical", f"Secret exposed to the browser: {m.group(0)}", rel, line_of(text, m.start()), m.group(0))
    # RLS-001 / RLS-002
    sqls = repo.sql()
    alltext = "\n".join(sqls.values())
    for rel, text in sqls.items():
        for t, info in parse_tables(text).items():
            if not re.search(rf"alter\s+table\s+(?:public\.)?\"?{t}\"?\s+enable\s+row\s+level\s+security", alltext, re.I):
                add("RLS-001", "critical", f"Table `{t}` has Row Level Security disabled", rel, line_of(text, info["idx"]), f"create table {t} …")
            for pm in re.finditer(rf"create\s+policy\s+\"([^\"]+)\"\s+on\s+(?:public\.)?{t}\s+(?:as\s+\w+\s+)?for\s+(select|insert|update|delete|all)\s*(?:to\s+[\w ,]+?(?=\s+(?:using|with)\b|\s*;))?(.*?);", alltext, re.I | re.S):
                name, op, body = pm.group(1), pm.group(2).lower(), pm.group(3)
                if op in ("select", "all") and re.search(r"using\s*\(\s*true\s*\)", body, re.I):
                    prel = next((k for k, v in sqls.items() if pm.group(0) in v), rel)
                    pln = line_of(sqls[prel], sqls[prel].find(pm.group(0)))
                    sens = SENSITIVE_COLS.findall(info["cols"])
                    sev = "critical" if any(s.lower() in ("email", "phone", "address", "password", "token") for s in sens) else ("high" if sens else "medium")
                    add("RLS-002", sev, f"`{t}`: policy \"{name}\" lets anyone read every row" + (f" (incl. {', '.join(sorted(set(s.lower() for s in sens)))})" if sens else ""), prel, pln, "using (true)")
    # RLS-007 / RLS-010 (same regexes as the full scanner)
    for rel, text in sqls.items():
        for m in re.finditer(r"alter\s+table\s+(?:if\s+exists\s+)?(?:public\.)?\"?(\w+)\"?\s+disable\s+row\s+level\s+security", text, re.I):
            add("RLS-007", "critical", f"Migration turns Row Level Security OFF on `{m.group(1)}`", rel, line_of(text, m.start()), m.group(0)[:80])
        for m in re.finditer(r"create\s+(?:or\s+replace\s+)?view\s+(?:public\.)?\"?(\w+)\"?\s*(with\s*\([^)]*\))?\s+as", text, re.I):
            v, opts = m.group(1), m.group(2) or ""
            if re.search(r"security_invoker\s*=\s*(true|on)", opts, re.I) or re.search(rf"alter\s+view\s+(?:public\.)?\"?{v}\"?\s+set\s*\(\s*security_invoker\s*=\s*(true|on)", alltext, re.I):
                continue
            add("RLS-010", "high", f"View `{v}` runs as its owner and skips RLS", rel, line_of(text, m.start()), m.group(0)[:80])
    # SQL-001 (Supabase Advisor lints 0031/0032)
    for f in sql001.find(sqls):
        add("SQL-001", f["severity"], f["title"], f["file"], f["line"], f["evidence"])
    # RLS-011 (Supabase Advisor lint 0028): definer functions anon can call; skips SQL-001 functions and triggers
    for f in rls011.find(sqls):
        add("RLS-011", f["severity"], f["title"], f["file"], f["line"], f["evidence"])
    # RLS-014: default / bulk table grants to API roles
    for f in rls014.find(sqls):
        add("RLS-014", f["severity"], f["title"], f["file"], f["line"], f["evidence"])
    # AUTH-013: policies (matches Supabase Advisor lint 0015) and sign-up triggers / helper functions that take a role from user_metadata
    for f in auth013.find(sqls):
        add("AUTH-013", f["severity"], f["title"], f["file"], f["line"], f["evidence"])
    # AUTH-002 / AUTH-003
    for rel, text in api_route_files(repo).items():
        if AUTH_RX.search(text) or "constructEvent" in text or re.search(r"webhook", rel, re.I):
            continue
        writes = re.search(r"\.(delete|update|insert|upsert)\(|DELETE|PUT|PATCH", text)
        reads = re.search(r"\.select\(|findMany|SELECT", text)
        if writes:
            add("AUTH-002", "critical", "API route changes data without checking who is calling", rel, line_of(text, writes.start()), writes.group(0))
        elif reads:
            add("AUTH-003", "high", "API route returns data without authentication", rel, line_of(text, reads.start()), reads.group(0))
    # AUTH-010: supabase/config.toml verify_jwt = false
    for rid, sev, rel, line, msg in verify_jwt_findings(repo):
        add(rid, sev, msg, rel, line, "verify_jwt = false")
    # PAY-001
    code = {k: v for k, v in repo.code().items() if not is_test_file(k)}
    uses_stripe = any(re.search(r"from\s+['\"]stripe['\"]|require\(['\"]stripe['\"]\)|stripe\.", v) for v in code.values()) or '"stripe"' in repo.files.get("package.json", "")
    if uses_stripe:
        for rel, text in code.items():
            if (re.search(r"webhook", rel, re.I) or "checkout.session.completed" in text) and "constructEvent" not in text:
                m = re.search(r"req(uest)?\.json\(\)|JSON\.parse", text)
                add("PAY-001", "critical", "Stripe webhook does not verify the signature", rel, line_of(text, m.start()) if m else None, m.group(0) if m else None)
    return F, uses_stripe



LEGACY_VAR_RX = re.compile(r"\b(?:NEXT_PUBLIC_|VITE_|EXPO_PUBLIC_|REACT_APP_|PUBLIC_)?SUPABASE_(ANON|SERVICE_ROLE)_KEY\b")
# values, not var names: Lovable names the var PUBLISHABLE_KEY but may hold an eyJ anon key
NEW_KEY_RX = re.compile(r"sb_publishable_[0-9A-Za-z_\-]{6,}|sb_secret_[0-9A-Za-z_\-]{6,}|SUPABASE_SECRET_KEYS")
GUIDE_LEGACY_KEYS = SITE + "/guides/supabase-legacy-api-keys-migration.html"


def legacy_keys(repo):
    notes, seen = [], set()
    for rel, text in repo.files.items():
        if rel.endswith(".md") or is_test_file(rel):
            continue
        for m in JWT_RX.finditer(text):
            role = jwt_role(m.group(1))
            if role in ("anon", "service_role") and (rel, "jwt") not in seen:
                seen.add((rel, "jwt"))
                notes.append(("KEY-001", rel, line_of(text, m.start()), f"legacy `{role}` key (eyJ…) hard-coded"))
        for m in LEGACY_VAR_RX.finditer(text):
            if (rel, m.group(0)) in seen:
                continue
            seen.add((rel, m.group(0)))
            notes.append(("KEY-001", rel, line_of(text, m.start()), f"reads legacy key variable `{m.group(0)}`"))
    migrated = any(NEW_KEY_RX.search(t) for t in repo.files.values())
    return notes, migrated


def render_legacy_keys(notes, migrated):
    if not notes:
        return []
    out = ["[INFO] Supabase legacy API keys still in use  (KEY-001, not scored)"]
    for _, rel, ln, msg in notes[:8]:
        out.append(f"   - INFO     {rel}:{ln}  {msg}")
    if len(notes) > 8:
        out.append(f"   - … {len(notes) - 8} more")
    out.append("   Supabase says the legacy anon/service_role keys are deprecated by the end of 2026.")
    if migrated:
        out.append("   New keys also found: finish the swap, then deactivate the legacy keys (reversible).")
    out.append(f"   Guide: {GUIDE_LEGACY_KEYS}")
    return out


# AUTH-012 (info, not scored): third-party auth enabled in supabase/config.toml while
# policies still use auth.uid(). Supabase: "auth.uid() casts sub to uuid, so it fails if
# your provider issues subjects that are not UUIDs." Clerk/Auth0/WorkOS/Firebase IDs are not UUIDs.
GUIDE_THIRD_PARTY = SITE + "/guides/supabase-third-party-auth-clerk-oidc-rls.html"
TP_RX = re.compile(r"^\s*\[auth\.third_party\.(\w+)\]\s*$(.*?)(?=^\s*\[|\Z)", re.M | re.S)


def third_party_auth(repo):
    providers = []
    for rel, text in repo.files.items():
        if rel.split("/")[-1] != "config.toml" or "supabase" not in rel:
            continue
        for m in TP_RX.finditer(text):
            # Cognito subs are UUIDs, so auth.uid() works there
            if m.group(1).lower() != "aws_cognito" and re.search(r"^\s*enabled\s*=\s*true\b", m.group(2), re.M):
                providers.append((m.group(1).lower(), rel, line_of(text, m.start())))
    if not providers:
        return [], []
    notes = []
    for rel, text in repo.sql().items():
        for pm in re.finditer(r"create\s+policy\s+\"([^\"]+)\"\s+on\s+(?:public\.)?\"?(\w+)\"?(.*?);", text, re.I | re.S):
            if re.search(r"auth\.uid\s*\(\s*\)", pm.group(3), re.I):
                notes.append(("AUTH-012", rel, line_of(text, pm.start()), f"`{pm.group(2)}`: policy \"{pm.group(1)}\" uses auth.uid()"))
    return providers, notes


def render_third_party(providers, notes):
    if not notes:
        return []
    names = ", ".join(sorted({p[0] for p in providers}))
    out = [f"[INFO] Third-party auth ({names}) with auth.uid() policies  (AUTH-012, not scored)"]
    for _, rel, ln, msg in notes[:8]:
        out.append(f"   - INFO     {rel}:{ln}  {msg}")
    if len(notes) > 8:
        out.append(f"   - … {len(notes) - 8} more")
    out.append("   auth.uid() casts the token's sub to a UUID and fails when your provider's user IDs are not UUIDs (Clerk, Auth0, WorkOS, Firebase).")
    out.append("   Compare (select auth.jwt()->>'sub') to a text column instead. Do not \"fix\" failing policies with using (true).")
    out.append("   With more than one issuer, add an `as restrictive` policy that checks auth.jwt()->>'iss'.")
    out.append(f"   Guide: {GUIDE_THIRD_PARTY}")
    return out


def main():
    args = sys.argv[1:]
    fail_on = None
    no_promo = os.environ.get("SHIPREADY_NO_PROMO", "") not in ("", "0")
    if "--no-promo" in args:
        no_promo = True
        args = [a for a in args if a != "--no-promo"]
    for a in list(args):
        if a.startswith("--fail-on="):
            fail_on = a.split("=", 1)[1]
            args.remove(a)
    if len(args) != 1 or args[0] in ("-h", "--help") or fail_on not in (None, "critical", "high"):
        sys.exit(__doc__)
    path = args[0]
    if not os.path.isdir(path):
        sys.exit(f"Not a directory: {path}")
    repo = Repo(path)
    F, uses_stripe = scan(repo)
    real = [f for f in F if f["severity"] in SEV_ORDER]
    crit = sum(f["severity"] == "critical" for f in real)
    high = sum(f["severity"] == "high" for f in real)
    passed = 0
    body = []
    def is_edge_finding(f):
        path = (f["file"] or "").replace(os.sep, "/")
        return f["id"] == "AUTH-010" or "supabase/functions/" in path or path.endswith("supabase/config.toml") or "/supabase/config.toml" in path

    for n, (cid, title, rules, skill) in enumerate(CHECKS, 1):
        hits = sorted((f for f in real if f["id"] in rules), key=lambda f: (-SEV_ORDER[f["severity"]], f["file"] or "", f["line"] or 0))
        infos = sorted((f for f in F if f["id"] in rules and f["severity"] == "info"), key=lambda f: (f["file"] or "", f["line"] or 0))
        na = (cid == "webhook" and not uses_stripe) or (cid in ("rlsoff", "rlsread", "rlsview", "rpcsql", "defnfn", "defgrant", "usermeta") and not repo.sql())
        if hits:
            status = "FAIL"
        elif na:
            status = "N/A "
        else:
            status = "PASS"
            passed += 1
        body.append(f"[{status}] {n}. {title}  ({', '.join(rules)})")
        for f in hits + infos:
            loc = f"{f['file']}:{f['line']}" if f["file"] and f["line"] else (f["file"] or "repo")
            ev = f"  `{f['evidence']}`" if f["evidence"] and f["evidence"] not in f["title"] and f["id"] != "SEC-002" else ""
            body.append(f"   - {f['severity'].upper():8} {loc}  {f['title']}{ev}")
            if auth010_high_uses_lovable_key(repo, f):
                body.append(f"     {PAUSE_AI_FIX}")
        if hits:
            skills = [skill]
            if cid == "apiauth" and any(is_edge_finding(f) for f in hits):
                skills = ["edge-function-auth"] + ([skill] if any(not is_edge_finding(f) for f in hits) else [])
            body.append("   Fix it free: Lite skill " + " + ".join(f"`{x}`" for x in skills))
        if na:
            body.append("   Skipped: " + ("no Stripe usage found." if cid == "webhook" else "no SQL migrations in the repo; run the Lite skill `rls-quick-check` in the Supabase SQL editor."))
        body.append("")
    applicable = sum(1 for l in body if l.startswith("[PASS]") or l.startswith("[FAIL]"))
    verdict = "NOTHING TO SCAN: no Supabase or app files were found in this folder (0 files read, no checks run)" if not repo.files else "DO NOT SHIP" if crit else ("FIX BEFORE LAUNCH" if high else f"NO DAY-ONE BLOCKERS FOUND ({len(CHECKS)} checks only)")
    nrules = len({r for c in CHECKS for r in c[2] if r != "AUTH-013"})  # AUTH-013 is not in the Crew scanner yet
    info = render_legacy_keys(*legacy_keys(repo))
    if info:
        body.extend(info + [""])
    tp = render_third_party(*third_party_auth(repo))
    if tp:
        body.extend(tp + [""])
    out = [f"Ship-Ready Quick Scan v{VERSION} · free · {len(CHECKS)} checks ({nrules} of the {FULL_RULES} rules in the full Ship-Ready scanner, plus AUTH-013)",
           f"App: {os.path.basename(repo.root)} · {len(repo.files)} files read · offline, no network calls", "",
           f"Result: {verdict} · {passed}/{applicable} checks passed · {crit} critical, {high} high", ""] + body
    prompt_items = []
    for cid, title, rules, skill in CHECKS:
        hits = sorted((f for f in real if f["id"] in rules), key=lambda f: (f["file"] or "", f["line"] or 0))
        if not hits:
            continue
        locs = ", ".join(sorted({f"{f['file']}:{f['line']}" if f["file"] and f["line"] else (f["file"] or "repo") for f in hits}))
        fix = FIX_TEXT[cid]
        if cid == "apiauth" and any(auth010_high_uses_lovable_key(repo, f) for f in hits):
            fix = fix + " " + PAUSE_AI_FIX
        prompt_items.append(f"{len(prompt_items) + 1}. {title.split(' (')[0]} ({', '.join(rules)})\n   Where: {locs}\n   Fix: {fix}")
    if prompt_items:
        out += ["-" * 72,
                "To fix them all, paste this into the AI tool that built the app (Lovable, Bolt, Cursor, Claude Code, Codex):", "",
                f"A launch check of {os.path.basename(repo.root)} found {len(prompt_items)} problem(s). Fix each one in the code, in this order:", ""]
        out += prompt_items
        out += ["",
                "Don't change what the app does. Never put a secret key in the code: read it from an environment variable.",
                "Do database changes as new migration files, not edits to old ones.",
                "If a step has to be done outside the code (revoking a key, a dashboard setting), list it for me at the end instead of skipping it.",
                "When you're done, run the quick scan again and show me the result.", ""]
    out += ["-" * 72]
    if no_promo:
        out += [f"That was the quick scan: {len(CHECKS)} day-one checks for leaked keys, open data and unpaid upgrades.",
                "Full rule list: https://github.com/getshipready/ship-ready-skills"]
    else:
        out += [f"That was the quick scan: {len(CHECKS)} day-one checks for leaked keys, open data and unpaid upgrades.",
                f"Ship-Ready Crew: {FULL_RULES - nrules} more checks (self-promotion to admin/Pro, client-only admin checks,",
                "public storage buckets, Stripe price tampering and entitlements, deploy, performance, launch basics),",
                "a ship score /100, a fix plan with patches, and Proof: Playwright launch tests for your money paths.",
                "One-time $39, 10 agents.",
                f"  See a full sample report (49 findings on our demo app): {SAMPLE_URL}",
                f"  Get the Crew: {CREW_URL}"]
    out += ["",
            "Static heuristics, not a penetration test. A PASS means the pattern was not found, not that the area is safe."]
    print("\n".join(out))
    if fail_on == "critical" and crit:
        sys.exit(1)
    if fail_on == "high" and (crit or high):
        sys.exit(1)


if __name__ == "__main__":
    main()
