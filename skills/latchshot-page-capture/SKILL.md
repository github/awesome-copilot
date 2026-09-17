---
name: latchshot-page-capture
description: 'Use this skill when a user needs a screenshot, website thumbnail, full-page capture, or PDF of a public HTTP(S) webpage saved as a local artifact through Latchshot, including report, QA, archive, and social-preview workflows. Do not use it for private or authenticated pages, raw HTML, scraping or extraction, arbitrary browser actions, CAPTCHA or anti-bot bypass, or local-file capture.'
---

# Latchshot page capture

Use the bundled dependency-free client to turn one public webpage URL into a validated local PNG, JPEG, or PDF. Start with a constrained no-key JPEG demo when appropriate. Authenticated commands send the API key only to the fixed `https://latchshot.fly.dev` origin, and every artifact is written atomically.

Latchshot is a hosted third-party service maintained by this skill's contributor. Keep its use optional and preserve an existing local-browser workflow when the task needs private pages or unsupported browser actions.

## Prerequisite

Require Node.js 20 or newer and network access. Read the key only from `LATCHSHOT_API_KEY` for authenticated capture and usage commands.

If the variable is missing, use the no-key demo for one bounded JPEG when it fits the request. For PNG, PDF, full-page, cleanup, or repeat work, direct the user to the [Agent Skills setup documentation](https://latchshot.fly.dev/integrations.md#agent-skills), then stop. Never ask the user to paste a key into chat, a command argument, source code, a committed file, or output. Never print or return the key.

## No-key demo

Use this command for a public page when a viewport JPEG is acceptable:

```bash
node scripts/latchshot.mjs demo \
  --url 'https://example.com' \
  --output './artifacts/example-demo.jpg'
```

The demo is JPEG-only, does not use an account or render quota, and allows three attempts per IP address per hour. It accepts only width, height, query confirmation, and explicit overwrite options. The public URL is still sent to Latchshot, and the request carries the coarse `agentskill` acquisition label. Reject private pages, secrets, signed URLs, and authenticated access exactly as in the capture workflow. Treat the result as a proof artifact, not as a customer activation or plan signup.

## Capture workflow

1. Confirm the target is a public HTTP or HTTPS page. Reject credentials, private/internal pages, non-web ports, signed URLs, query secrets, and any request requiring login, cookies, CAPTCHA handling, proxy rotation, arbitrary scripts, clicks, typing, or anti-bot bypass.
2. Choose a user-approved output path. Infer the format from `.png`, `.jpg`/`.jpeg`, or `.pdf`, or pass the matching `--format` explicitly.
3. Run the client from this skill directory:

   ```bash
   node scripts/latchshot.mjs capture \
     --url 'https://example.com' \
     --output './artifacts/example.png'
   ```

4. For a bounded full-page screenshot that activates lazy content:

   ```bash
   node scripts/latchshot.mjs capture \
     --url 'https://example.com' \
     --output './artifacts/example-full.png' \
     --full-page \
     --scroll-page
   ```

5. For a PDF:

   ```bash
   node scripts/latchshot.mjs capture \
     --url 'https://example.com' \
     --output './artifacts/example.pdf' \
     --paper A4
   ```

6. Parse the one-line JSON result. Confirm `ok`, `output`, `format`, `contentType`, and `bytes`; inspect the local artifact when the surrounding task requires visual or document verification. Report the path and relevant render/quota diagnostics without exposing the key.

Run `node scripts/latchshot.mjs --help` for the exact bounded options. Use `--block-ads`, `--block-trackers`, `--block-chats`, `--hide-cookie-banners`, and `--hide-popups` only as best-effort cleanup—not bypass. Use `--allow-query` only after confirming that the query contains no credential, signature, token, customer data, or other secret. The client refuses to overwrite a file unless `--force` is explicit.

## Read quota

Use the read-only command when the user asks about remaining renders or reset time:

```bash
node scripts/latchshot.mjs usage
```

This does not consume render quota or change a plan.

## Failure handling

- Read the structured error code and message from stderr; do not retry validation or authentication failures.
- For `demo_limit`, wait for the hourly reset rather than looping or switching identities.
- For `rate_limited`, wait for the reported reset or retry-after boundary rather than looping.
- For a render failure, state the failure and preserve any existing output file. Do not silently substitute a local browser, a different provider, or unsupported private-page access.
- Do not initiate an upgrade, checkout, payment, implementation request, or other commercial action. Those remain user- and owner-controlled.

## Hard boundaries

Latchshot accepts public pages only and returns one binary artifact. It does not offer raw HTML input, DOM extraction, selectors, sessions, arbitrary JavaScript, authenticated/private pages, CAPTCHA solving, residential proxies, or anti-bot evasion. Only successful renders consume quota.
