# Discovery — publishing the tool surface off-page

WebMCP tools only exist once the page runs. Crawlers, directories, and browser
extensions want to know *before* navigating, so an ecosystem of pre-visit
discovery conventions has grown around the spec. This layer is **optional,
non-normative, and public** — treat it as a separate deliverable, never as part
of a default integration.

## What is standardized and what is not

| Surface | Status | Source |
|---|---|---|
| `document.modelContext` (imperative) | **Spec** (W3C WebML CG draft, Chrome origin trial) | [webmcp explainer](https://webmachinelearning.github.io/webmcp/) |
| `navigator.modelContext` | **Deprecated** compatibility surface from the Chrome 149 trial — probe it as a fallback, never target it | same |
| `toolname`, `tooldescription`, `toolautosubmit` on the `<form>`; `toolparamdescription` on the form **control** (or enclosing `<fieldset>`) | **Spec** (declarative API explainer, Chrome docs) | [declarative-api-explainer](https://github.com/webmachinelearning/webmcp/blob/main/declarative-api-explainer.md) |
| `toolactivated` / `toolcancel` events, `:tool-form-active` / `:tool-submit-active` | **Spec** | Chrome declarative API docs |
| `/.well-known/webmcp` manifest | **Not specified.** Chrome discussed pre-visit discovery; nothing shipped. De-facto convention pushed by third-party checkers/registries | community |
| `<link rel="webmcp">`, `Link: </.well-known/webmcp>; rel="webmcp"` | **Not specified** (RFC 8288 is, the `webmcp` relation is not registered) | community |
| `llms.txt`, `AGENTS.md`, robots.txt AI-bot rules | Conventions, widely read | community |

Never invent attributes to satisfy a checker (see *Third-party audits* below).

## Rule 0 — record the approval before writing anything

The gate is only real if it survives a context reset. Once the human approves,
write `pipeline.discovery` in `.webmcpify/manifest.json` **first**:

```json
"discovery": { "at": "2026-08-06", "publishedTools": ["get_faq"],
               "paths": [], "complete": false }
```

`publishedTools` is the exact approved subset — publishing a tool that isn't listed
there is a disclosure the human never agreed to. `paths` starts empty and gains
each artifact **as it is written** (that's what AUDIT maps the new hunks against);
`complete` flips to `true` only when every artifact exists and its drift test
passes. A record with `complete: false` — or one written before the key existed,
which reads the same — is unfinished publication: finish it before leaving
INTEGRATE, since a context reset cannot otherwise tell the two apart.

`discovery: null` (or absent) = not approved: don't write, don't update, and flag a
manifest **this pipeline created or modified** as an unmapped hunk. A manifest that
already existed at `baselineSha` and that you did not touch is not your hunk: leave
the file alone, and note it in the report either way — what it advertises is part of
the app's agent surface whether or not this run produced it.

## Rule 1 — the manifest is a mirror, never a source

The runtime registration is authoritative. The manifest repeats a subset of it
for crawlers. If they can drift, they will:

- Generate the manifest from the approved `.webmcpify/manifest.json` entries,
  not by hand.
- Add a test that fails when the published names/schemas no longer match what
  the app registers (page attributes + runtime tool table). Every integration
  that ships a manifest ships this test.
- Regenerate it in the same commit as any tool contract change.

## Rule 2 — publishing metadata is a disclosure decision

A `.well-known` file is world-readable forever and gets crawled, cached, and
indexed. Before writing one, get explicit human approval and then list **only**:

- tools reachable **without authentication** on a **public** route;
- names, descriptions, and input schemas that are already visible to any visitor
  who opens DevTools on that page.

Never list: tools behind login, role-scoped or admin tools, internal hostnames,
API paths that aren't already public, staging URLs, or any description that
reveals unreleased functionality. When a tool set is auth-gated, publish the
manifest with the public subset and say so in the `$comment`/`description` —
don't publish an empty file and don't publish the gated ones "for completeness".

## Rule 3 — shape

Start from `templates/well-known-webmcp.json`. The fields checkers actually read
are `name`, `description`, `version`, `tools[].name`, `tools[].description`;
`inputSchema` per tool is what makes it useful to an agent.

- Serve at `/.well-known/webmcp` with `Content-Type: application/json`, HTTP 200,
  no redirect (checkers treat a 301/302 as a miss).
- Keep the repo file as `webmcp.json` (correct MIME everywhere, obvious in a
  diff) and map the extensionless path in the server config, e.g. nginx:

  ```nginx
  location = /.well-known/webmcp {
      alias /srv/app/.well-known/webmcp.json;
      default_type application/json;
      add_header Access-Control-Allow-Origin "*" always;
      # Under nginx's default (legacy) semantics an add_header here CANCELS every
      # inherited one — repeat the site's security headers or this response ships
      # without them. Under `add_header_inherit merge` (nginx 1.29.3+) they are
      # inherited instead, and repeating them emits DUPLICATES. Check first.
      add_header Strict-Transport-Security "max-age=31536000" always;
      # …plus CSP / X-Content-Type-Options / any other server-level header.
  }
  ```

  So: check `nginx -v` and grep the config for `add_header_inherit` before writing
  the block, read the existing server block, and copy its `add_header` directives
  only under legacy semantics. Either way, afterwards `curl -sI` the manifest and
  one normal page and diff the header sets — that catches both the missing and the
  duplicated case. Public discovery documents are fetched cross-origin —
  `Access-Control-Allow-Origin: *` is appropriate here **because the file is public
  by construction**; never copy that header onto app routes.
- Advertise it once per page: `<link rel="webmcp" href="/.well-known/webmcp" type="application/json">`
  and, where response headers are cheap to set, `Link: </.well-known/webmcp>; rel="webmcp"`.
  The same inheritance question applies to every location where you add `Link`:
  under nginx's default semantics an `add_header` there **suppresses** the
  server-level ones (repeat HSTS/CSP), under `add_header_inherit merge` it does not
  (repeating them duplicates). Check the mode once, apply it everywhere, and diff
  the headers afterwards.
- Mention the manifest in `llms.txt` if the site has one.

## Third-party audits — score the spec, not the scoreboard

Extensions and web checkers grade pages against a mixed list of spec features,
conventions, and things they made up. Seen in the wild (a 15-point audit
extension, 2026-08):

- `window.ai` / built-in-AI presence — a **browser** capability. No site can
  provide it. Never "fix" this.
- `toolaction` attribute — **does not exist** in any WebMCP draft or Chrome doc.
  Emitting it adds dead markup and teaches the codebase a fiction.
- `/.well-known/webmcp` — real convention, unspecified. Worth serving (this
  guide), not worth restructuring an app for.
- Declarative attributes on pages that have no `<form>` — the honest fix is a
  real form the app actually needs, or nothing. **Never add a form, or fake
  markup, to raise a score.**

Classify every finding before reacting — **spec / convention / invented**:

- **Spec.** Check it against the explainer or Chrome docs yourself. If it is a real
  violation of a specified behaviour in *our* integration, the harness has a gap:
  add the assertion to the spec file, watch it fail, then heal it like any other
  failure (contract changes still go back to the gate).
- **Convention.** Report it with the trade-off; publishing is the human's call.
- **Invented.** Say so in the report, with the source you checked, and stop.

Never let the *score* drive the work: a red check is a question, and the answer is
sometimes "that check is wrong".
