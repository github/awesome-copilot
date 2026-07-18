# connector-namespaces preview harness

A standalone way to **see** every canvas state without launching the Copilot
app. It imports the real, pure renderer functions from `../renderer.mjs` and
serves each state on a fixed loopback port, with every `/api/*` endpoint stubbed
so you can force the states that keep regressing (the connecting spinner and the
"Restart your Copilot session…" banner).

This exists because those two bugs have each shipped multiple times:

- the sign-in spinner freezing (an unscoped `animation:none` leaking out of the
  reduced-motion block), and
- the restart-banner dismiss button doing nothing (a CSS specificity bug that
  let `.restart-banner{display:flex}` beat `[hidden]`).

Both are static CSS facts, so the **deterministic gate is `../renderer.test.mjs`**
(run with `node --test`). This harness is the human-visual layer on top of it:
load a state in a browser, or capture screenshots with `agent-browser`.

## Run the preview server

```sh
node extensions/connector-namespaces/preview/server.mjs
```

It binds to `http://127.0.0.1:7331`. Open that URL in any browser. The server is
a plain HTTP process (not the JSON-RPC extension provider), so it logs every hit
to stdout — that's expected and fine here.

### State routes

| URL | State |
| --- | --- |
| `/` or `/catalog` | Configured catalog (mock gateway + connectors) |
| `/setup` | First-run gateway picker (`renderSetupHtml`) |
| `/error` | Error screen (`renderErrorHtml`) |

### State-forcing query flags (on the catalog route)

The catalog page hydrates from `/api/state` on load, so loading one of these
sets the state the very next `/api/state` returns:

| Flag | Effect |
| --- | --- |
| `/?restart=1` | `/api/state` returns `pendingRestart:true` → restart banner visible on load |
| `/?installed=1` | One connector shows as already installed/connected |

Flags combine, e.g. `/?installed=1&restart=1`.

> The active state is a single module-level flag (last catalog load wins). It's a
> single-user preview, so just load the page you want, then it's sticky until the
> next catalog load.

### Stubbed endpoints

`/api/state`, `/api/gateways`, `/api/select-gateway`, `/api/install` (returns
`needsConsent` to force the connecting spinner), `/api/finish-install`,
`/api/ack-restart` (the dismiss action), `/oauth-status` (stays pending so the
modal spinner keeps animating), `/api/uninstall`, `/api/rollback-connection`,
and `/api/open-url` (a deliberate **no-op** here — it must never actually launch
a browser tab).

## Capture screenshots (optional)

The screenshot driver uses [`agent-browser`](https://www.npmjs.com/package/agent-browser),
the same headless-Chromium verification tool that `arikbidny/ralph-copilot-cli`
uses. It is **not** required — if it isn't installed the driver prints an install
hint and exits 0.

Install it once:

```sh
npm i -g agent-browser && agent-browser install
```

Then, with the server running in another terminal:

```sh
node extensions/connector-namespaces/preview/shots.mjs
```

Screenshots are written to `preview/shots/`:

- `catalog.png`, `catalog-restart-banner.png`, `catalog-installed.png`,
  `setup.png`, `error.png` — the static states.
- `connecting-spinner.png` — after clicking **Connect**; verify the `.si-spin`
  ring is mid-rotation, not frozen.
- `banner-before-dismiss.png` / `banner-after-dismiss.png` — verify the banner is
  present in the first and **gone** in the second.

`preview/shots/` is throwaway visual evidence; it is not committed.

## Files

| File | Purpose |
| --- | --- |
| `server.mjs` | Standalone preview server (fixed port 7331) |
| `fixtures.mjs` | Deterministic mock subscriptions / gateways / catalog / state |
| `shots.mjs` | `agent-browser` screenshot driver (degrades gracefully) |

## Relationship to the test guard

`shots.mjs` proves a state *looks* right today and is handy when chasing a new
bug. It cannot prove an animation is *running* from a single frame. The
regression gate that actually blocks the recurring bugs is the CSS-structure
assertion in `../renderer.test.mjs`:

```sh
node --test extensions/connector-namespaces/renderer.test.mjs
```

Keep that green; use this harness to eyeball changes.
