---
name: 'launch-check'
description: 'Pre-launch report card for apps and sites built with AI (Lovable, Bolt, Replit, Cursor, v0, Claude). One command checks a live URL passively and scores 4 areas 0-100 with traffic lights - security (secret keys visible in the page JavaScript, Supabase service_role keys, open Supabase or Firebase tables with --owner-check, missing security headers, HTTPS, cookies), phone design at 375 px, being found by Google and AI search, and speed and basics - then writes a plain-English "fix this first" list to paste to your AI and a one-page HTML report. Use when someone asks "is my app safe to launch", "did I leak my API key", "check my vibe-coded app", "is my Supabase open", "pre-launch checklist", or "is my site ready".'
---

# Launch Check

`scripts/launch_check.py` is a deterministic checker (Python standard library; Playwright optional). It loads the
site the way a visitor's browser does, scans what it downloaded, runs two vendored audits, and prints one
report card. Do not judge the site by reading it yourself: run the tool, then explain and fix what it found.

## Run it

1. Find Python 3.9+: `python3 --version`, else `python --version`, else `py -3 --version` (Windows). Call it `<PY>`.
2. `<DIR>` = the folder that holds this SKILL.md.
3. `<PY> "<DIR>/scripts/launch_check.py" https://the-app.com --report launch-report.html`
   - `--owner-check`: ONLY when the user confirms they own the site. If the page contains a Supabase URL + public
     anon key (or a Firebase databaseURL), it asks the API which tables exist and reads at most 1 row per table
     (GET only, max 20 tables, never writes, row contents are never printed or saved; only "table X: readable by
     anyone (N columns)"). Without the flag it only says that a database was found.
   - `--repo .`: also scan the local project for committed `.env` files and secrets in tracked files.
   - `--prompt`: print only the fix list as a prompt for the AI that built the app. `--json`: everything.
   - `--skip phone,search,speed`: faster partial run. `--fail-under 80`: exit 1 below this score.
4. Phone design and page-load metrics need Playwright (`<PY> -m pip install playwright && <PY> -m playwright
   install chromium`). Without it, phone design is skipped with a note; the rest still runs.

Typical time: 6-8 s on a small site, 30-60 s on a large marketing site (the search check reads 5 pages politely).

## Read the output

```
SCORE 30/100  NOT READY: 5 things to fix before you launch
FAIL  Security                0  Anyone can see your Stripe secret key in your website's code (+7 more)
WARN  Phone design           77  The page is wider than a phone screen (+4 more)
FIX THIS FIRST
 1. HIGH   Anyone can see your Stripe secret key in your website's code
              in /assets/index-4f9c2a.js   value sk_l…(50 chars)
```

- PASS / WARN / FAIL = green (80+) / amber (50-79) / red (under 50) per area. SKIP = the area could not run (reason in a `note:` line).
- Overall score = weighted mean (security 40 %, the other three 20 % each). Any exposed secret or open table caps it at 39.
- Verdict: NOT READY = a HIGH security finding (or score under 50); ALMOST READY = other HIGH findings or score under 80; READY TO LAUNCH otherwise.
- `value sk_l…(50 chars)`: secrets are always cut to their first 4 characters. The full value is never printed or sent anywhere.
- A Supabase anon / publishable key or a Google (Firebase) key in the page is normal and only INFO/LOW: safety depends on Row Level Security and key restrictions, which `--owner-check` tests for Supabase and Firebase.
- Exit code 0 = ready (score >= `--fail-under`, nothing HIGH), 1 = findings, 2 = bad URL or the site could not be loaded (HTTP 403 usually means it blocks automated visitors: run it on a preview URL).

## What to do next

1. Exposed secret key (Stripe, OpenAI, Anthropic, AWS, Supabase service_role ...): it is already public. Move the
   call server-side (API route, edge function), put the key in a server environment variable, and ROTATE the key
   in the provider dashboard. Deleting it from the code is not enough.
2. Open table (`db-table-open`) or open Firebase: turn on Row Level Security / database rules with per-user
   policies, then re-run with `--owner-check` until the table is gone from the list.
3. Paste the "Paste to your AI" block from the HTML report (or `--prompt`) into the AI that built the app, apply,
   redeploy, re-run. Repeat until the verdict is READY TO LAUNCH.
4. Headers (CSP, HSTS, X-Frame-Options, nosniff): set them in the host config (`vercel.json`, `netlify.toml`,
   `_headers`, Cloudflare rules) or the server middleware.
5. "Google and ChatGPT see an almost empty page": the app renders all text with JavaScript; prerender or
   server-render the public pages (landing, pricing) so crawlers read them.

## How it stays safe

- Passive by default: it downloads only what a browser does (the page, its same-site scripts, links on the home
  page, `/favicon.ico`, plus `robots.txt`, `sitemap.xml`, `llms.txt` for the search check). It never probes hidden
  paths such as `/.env` or `/admin`.
- Hostile-input rules: http(s) only, redirects and scripts only on the same site, size and count caps, terminal
  output stripped of control characters, HTML report fully escaped. `--owner-check` only talks to
  `https://<ref>.supabase.co`, Firebase hosts, or the audited site itself, and never uses a service_role key.
- `scripts/polish_audit.py` (phone design) and `scripts/geo_audit.py` (Google & AI search) are vendored copies of
  the site-polish-audit and geo-seo-audit tools; launch_check.py runs them with `--json`.

## Limits (honest)

- Not a penetration test: no login flows, no API fuzzing, no server-side auth or paywall checks, no write tests.
  A good score means none of these common launch mistakes were found, not that the app is secure.
- Scripts served from another host (CDN subdomain) are not scanned; the report says how many were skipped.
- Secret patterns cover the common providers; custom tokens and keys inside source maps are not detected.
- Sites behind bot protection may answer 403 to the checker; rate limits (429) are not counted as broken links.
- Phone design and speed need a Chromium browser through Playwright.

## Source

MIT, maintained at https://github.com/Ces107/agent-forge/tree/main/skills/launch-check (also packaged there as a Claude Code plugin).
