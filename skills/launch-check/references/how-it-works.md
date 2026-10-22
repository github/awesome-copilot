# launch-check: how it works

## Why this exists (sources)

- CVE-2025-48757: 303 Supabase endpoints in 170 of 1,645 Lovable showcase apps (about 10.3 %) could be read or
  written with the public anon key; CVSS 9.3 (Matt Palmer, https://mattpalmer.io/posts/statement-on-CVE-2025-48757/ ;
  record https://cveawg.mitre.org/api/cve/CVE-2025-48757). Lovable disputes the CVE.
- Moltbook (Feb 2026): Supabase URL + key in client JavaScript, no Row Level Security, about 4.75 M records
  readable, found by reading the JS bundle (Wiz, https://www.wiz.io/blog/exposed-moltbook-database-reveals-millions-of-api-keys).
- About 1 in 5 of ~130,000 sites published from 13 vibe-coding platforms exposes at least one secret
  (Red Hunt Labs, 2025-09-23, https://redhuntlabs.com/blog/echoes-of-ai-exposure-thousands-of-secrets-leaking-through-vibe-coded-sites-wave-15-project-resonance/).
- Of 1,072 Supabase-backed vibe-coded apps, 16 % had a critical issue and 39 had tables fully readable with the
  anon key (Symbiotic Security, 2026-06-02, https://www.symbioticsec.ai/blog/we-scanned-1-072-vibe-coded-apps-98-had-security-flaws).

## Pipeline

1. **Fetch** the URL with urllib (no automatic redirects). Redirects are followed by hand, at most 5, only to the
   same host (a leading `www.` is ignored) and only http(s). Bodies are capped (3 MB per file, 20 scripts, 15 MB in
   all). Identity: `launch-check/1.0` user agent.
2. **Security (passive)**
   - Scans the HTML, inline scripts and every same-origin `<script src>` / `modulepreload`, plus same-origin
     chunks imported from those bundles (Vite/webpack split chunks), with shape-exact regexes: Stripe
     `sk_live_`/`rk_live_`/`whsec_`/`sk_test_`, OpenAI `sk-proj-`/legacy, Anthropic `sk-ant-`, AWS `AKIA`/`ASIA`,
     GitHub `ghp_`/`github_pat_`, Slack `xox?-`, SendGrid, PEM private keys, Supabase `sb_secret_`, Google `AIza`.
   - JWTs (`eyJ….eyJ….…`) are decoded (payload only, no signature check): `role=service_role` is HIGH,
     `role=anon` is INFO (normal; safety comes from Row Level Security).
   - Values are stored only as the first 4 characters + length; dedupe uses a SHA-256 of the value in memory.
   - Headers: HSTS (https only), CSP, X-Frame-Options or CSP `frame-ancestors`, `X-Content-Type-Options: nosniff`.
     HTTP→HTTPS: one GET to the `http://` address, reading only the `Location` header. Local addresses skip it.
   - Cookies from the homepage `Set-Cookie`: Secure (https), HttpOnly (session-like names, analytics cookies such
     as `ajs_`/`_ga` exempt), SameSite. Mixed content: `http://` assets on an https page.
   - `--repo DIR`: `git ls-files` + `git check-ignore`; tracked `.env*` (not `.env.example`) is HIGH, untracked
     and not ignored is MEDIUM; tracked text files are scanned with the same patterns (anon/Google keys skipped).
     Skips `node_modules`, `dist`, `build`, `.next`, `.venv` …; max 6,000 files, 1 MB each.
3. **Open database test (`--owner-check`, opt-in)**: collects a Supabase URL (`https://<20-char ref>.supabase.co` or a
   `supabaseUrl`/`createClient(` literal) and the anon/publishable key from the same files. Never uses a
   service_role key. Allowed targets: the Supabase/Firebase vendor host over https, or the audited site itself.
   `GET /rest/v1/` (PostgREST OpenAPI, table list) then `GET /rest/v1/<table>?select=*&limit=1` for up to 20
   tables; a non-empty JSON array = "readable by anyone (N columns)". Rows are parsed in memory to count columns
   and dropped. Firebase: `GET <databaseURL>/.json?shallow=true`. No other method is ever sent.
4. **Phone design**: runs the vendored `scripts/polish_audit.py <url> --viewports 375 --json --no-shots` (from
   site-polish-audit 1.0; the only change is 4 in-page regex calls written with `match`), groups its findings by
   kind and rewrites them in plain English. Without Playwright the area is skipped with a note.
5. **Found by Google & AI search**: runs the vendored `scripts/geo_audit.py <url> --json --max-pages 5 --delay 0.5`
   (geo-seo-audit 1.0, unchanged; robots.txt respected). Findings already covered by the basics check are hidden;
   "broken" links/sitemap URLs whose only errors are 401/403/429/503 are dropped (rate limiting, not broken).
6. **Speed & basics**: one Playwright page load at 390×844 (requests, bytes, load time, console/page errors,
   links rendered by JavaScript, optional phone screenshot for the report), then title (empty or template
   defaults such as "Vite + React + TS"), meta description, og:image, favicon (`<link rel=icon>` or `/favicon.ico`),
   weight > 3 MB, JS > 1 MB, load > 4 s, JS errors, and up to 15 same-site homepage links (0.3 s apart; only
   400/404/410/5xx-except-503 count as broken).

## Scoring

- Area score = 100 − 30 per HIGH − 10 per MEDIUM − 3 per LOW (min 0). Security with any HIGH is capped at 30.
  Phone = polish_audit score; search = geo_audit score.
- Overall = weighted mean of the areas that ran (security 0.4, others 0.2 each). An exposed secret, committed `.env`
  or open table caps the overall score at 39.
- Grades: green ≥ 80, amber 50-79, red < 50. Verdict: NOT READY (security HIGH or score < 50), ALMOST READY
  (other HIGH or score < 80), READY TO LAUNCH. "Fix this first" = the first 5 HIGH/MEDIUM findings.
- Exit 0 = score ≥ `--fail-under` (80) and no HIGH; 1 = findings; 2 = usage error or unreachable site.

## Benchmark (2026-10-21, Windows 11, Python 3.14, Playwright 1.59, Chrome)

Commands run from `skills/launch-check/`. Real sites: passive only (no `--owner-check`, which is for your own site).

| Target | Command | Time | Score | Verdict | HIGH / MEDIUM |
|---|---|---|---|---|---|
| Seeded demo, before | `python examples/demo/serve_demo.py` then `python scripts/launch_check.py http://127.0.0.1:8765/ --owner-check` | 6.5-8.2 s | 30 | NOT READY | 8 / 10 |
| Seeded demo, after | `serve_demo.py --fixed --port 8766`, same command on :8766 | 5.9-10.4 s | 93 | READY TO LAUNCH | 0 / 2 (tables: 0 of 3 readable) |
| bolt.new | `python scripts/launch_check.py https://bolt.new` | 49.2 s | 85 | ALMOST READY | 1 / 8 |
| lovable.dev | `python scripts/launch_check.py https://lovable.dev` | 48.7 s | 85 | READY TO LAUNCH | 0 / 5+ (1 of 4 runs; 3 runs got HTTP 403 from bot protection; run made before the cookie-severity fix below) |
| v0.app | `python scripts/launch_check.py https://v0.app` | 48.3 s | 86 | READY TO LAUNCH | 0 / 10 |

Demo "before": every seeded defect was reported: Stripe live-key shape and service_role JWT in
`/assets/index-4f9c2a.js` (shown as `sk_l…(50 chars)`, `eyJh…(196 chars)`), `profiles` (5 columns) and `orders`
(4 columns) readable with the anon key while `admin_notes` (protected) was not, missing CSP / frame protection /
nosniff, session cookie without HttpOnly/SameSite, template title, no description, favicon or preview image,
720 px overflow at `#pricing`, broken `/pricing` link (found only in the JavaScript-rendered DOM), 2 JavaScript
errors, text rendered only by JavaScript. Without `--owner-check` the tables are not touched and the report says
"Supabase database found in your page: run with --owner-check".

Verified on live sites:
- lovable.dev: `curl -A "launch-check/1.0 …" -D -` shows a CSP without `frame-ancestors` and no X-Frame-Options on
  the 200 page, so the clickjacking finding is real. The same host sometimes answers 403 (bot challenge):
  launch-check exits 2 with a hint to use a preview URL.
- v0.app: 4.7 MB homepage and 78 tap targets under 44 px at 375 px; no security finding above LOW.
- bolt.new: 3 of 3 runs flagged low-contrast text at 375 px and 1.4 MB of first-party JavaScript; page weight
  varied between runs (1.7-3.5 MB) because the page loads dynamic content.

False positives found on live sites and fixed (each has a regression test):
- replit.com: 2 homepage links reported broken were HTTP 429 (rate limit); `curl` returned 200. Now 401/403/429/503
  never count as broken, in both the basics check and the vendored crawler's results.
- bolt.new: `ajs_session_id` (Segment analytics cookie, JS-readable by design) was asked for HttpOnly. Analytics
  cookie prefixes are now exempt.
- lovable.dev: a missing `Secure` flag on the non-session `LOCALE` cookie was MEDIUM; it is LOW now.

Known misses: replit.com serves all 118 scripts from another host, so none were scanned for keys (the report says
so); geo_audit reported one sitemap URL as an error on replit.com that later answered 200 (likely rate limiting).

## Tests

`python -m pytest -q tests/launch-check`: 31 tests (secret shapes and look-alikes, JWT roles, redaction, hostile
URLs, cross-site redirects, same-origin-only downloads, headers, cookies, mixed content, git repo scan with a
non-ASCII path, owner-check against a mock PostgREST/Firebase server that records every HTTP method, end-to-end
runs on the demo app). All local, no internet.
