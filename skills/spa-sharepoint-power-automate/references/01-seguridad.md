<!-- spa-sharepoint-power-automate · references/01-seguridad.md · secciones §1 -->
<!-- Contenido movido tal cual desde el SKILL.md monolítico (2026-09-24). Índice: ../SKILL.md -->

# 1 · Security model (read first)

This pipeline exposes a **public, unauthenticated HTTP endpoint**. Treat the security model as a first-class concern, not an afterthought.

## VITE_* env vars are PUBLIC — they ship in the bundle

Anything prefixed `VITE_` is **inlined into the JavaScript bundle at build time** and is fully visible to anyone who opens DevTools or reads the source on GitHub Pages.

- `VITE_POWER_AUTOMATE_URL` — the trigger URL is **public by design** (it has to be — the browser calls it). The SAS-style signature in the URL is not a secret you can hide. Anyone can POST to it.
- `VITE_APP_KEY` (`x-app-key` header) — **NOT a secret.** It also ships in the bundle. It is light obfuscation / a speed bump against drive-by bots, nothing more. Do not treat it as authentication.

**Never** put a real secret (SP app password, Graph client secret, Outlook token) in a `VITE_` var. Those belong only inside the Power Automate flow's connections, which run server-side.

## Abuse surface and mitigations

The endpoint is open to the internet. Realistic mitigations, in order of effort:

1. **Validate `x-app-key` in the flow** — first action after the trigger: a Condition comparing `triggerHeaders()?['x-app-key']` to the expected value; on mismatch, Response 401 and Terminate. Stops casual bots even though the key is discoverable.
2. **Payload-shape validation** — reject requests missing required fields or with absurd sizes before doing SP work.
3. **Size cap** — see *Payload & attachment limits* below; reject oversized bodies early with a Response 413.
4. **Rate awareness** — Power Automate per-flow run limits exist but are generous; for real rate limiting put the flow behind Azure API Management or a Cloudflare Worker proxy. Usually overkill for an internal-tool checklist; document the decision either way.
5. **CAPTCHA** — only if abuse is observed. Adds friction to a no-login form; default to *not* having it.

The honest posture: this is an **internal tool with a public URL**, secured by obscurity + low value to attackers. Write that assumption down in the repo so nobody mistakes it for a hardened public API.

## Don't leak internals in the public bundle / UI

- The success screen of a public SPA must NOT show internal email addresses, account names, or operator handles. Anonymous visitors don't need to know who gets notified — exposing it leaks personnel structure.

  ❌ **Don't**: `Se notificó por correo a usuario@empresa.com ...`
  ✅ **Do**: `Se notificó al sector correspondiente y la inspección quedó cargada en SharePoint.`

  The actual recipient stays in the flow's `Send_email_V2` `To` field — internal-only config, never in the bundle.
