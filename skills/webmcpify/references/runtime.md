# Runtime — vendoring and wiring the templates

Copy from this skill's `templates/` directory into the target project
(suggested: `src/webmcp/`):

- **TypeScript projects**: `templates/webmcpify.ts` + `templates/webmcp.d.ts`;
  **React TSX projects additionally** `templates/webmcp-jsx.d.ts` (JSX typings for
  the declarative attributes — a MODULE file; keep it separate from
  `webmcp.d.ts`, which must stay a global script file).
- **JavaScript projects**: `templates/webmcpify.js` — **ES module only** (`export`):
  load via a bundler or `<script type="module">`. For CommonJS/classic-script
  projects, transpile or vendor the TS variant instead.

**Vendor, don't depend** — the runtime is small, MIT, and a target repo must not
gain a dependency for an origin-trial API. **Keep the full MIT notice header** in
every copied file: the license's retention condition requires the copyright line
and permission notice to travel with the code, and the header IS that notice —
never trim it down to a bare link.
Record the copied file paths in the manifest
(`pipeline.setup.runtimeVendored: ["src/webmcp/webmcpify.ts", ...]`).

What it provides:

| Export | Purpose |
|---|---|
| `getModelContext()` | The ONLY place `document.modelContext` / deprecated `navigator.modelContext` is referenced — spec churn stays a one-file fix |
| `isWebMCPAvailable()` | Feature detection — the app must work identically without WebMCP |
| `createToolScope(key, tools, options?)` | Registers a tool set under one AbortController; returns a **callable dispose handle** carrying `ready: Promise<boolean>` (true = all registrations committed; false = no WebMCP / duplicate key / failure / disposed first — never rejects). Validates contracts BEFORE registering; **rolls back the whole scope** on any failure, including sync-throwing legacy `registerTool` (reported via `options.onError`, default `console.error` — NOT called when disposed before settling). An already-active key returns a no-op handle — safe under React StrictMode |
| `dispatchAndWait(event, detail?, timeoutMs?)` | Bridges `execute()` to the app's own event/state flow. The dispatched detail carries `requestId` plus `signal` — an AbortSignal aborted on timeout; pass it to `fetch()` and skip state commits once aborted. Resolves only after the component confirms with an explicit **boolean** `ok`; a completion with missing/non-boolean `ok` **fails closed** to an `"ERROR: ..."` string, as do timeouts and `ok: false` (self-correction convention — never rejects). For tools whose confirmation involves a network round-trip (mailers, slow APIs), pass an explicit `timeoutMs` (e.g. `20_000`) instead of relying on the 10 s default |
| `singleFlight(fn, busyMessage?)` | Serializes a tool's `execute`: while one call is in flight, further calls resolve immediately to a busy `"ERROR: ..."` string instead of racing shared UI state |

Validation note: budget checks auto-enable when the bundler substitutes
`process.env.NODE_ENV` (Vite/webpack automatic; esbuild via `--define`) and it
isn't `'production'`; unbundled projects default to off — pass `{ validate: true }`
during development.

## The completion contract (the part integrators get wrong)

`dispatchAndWait` resolves when the component fires `tool-completion-<requestId>`
with `detail: { ok: boolean, message?: string, error?: string }`. `ok` must be an
explicit boolean — anything else fails closed to an ERROR result. Fire it **after
the async work has truly finished** — awaited fetch, committed state, rendered
result — never right after *starting* the action. Agents plan from what is on
screen; a completion fired early produces false greens.

Hardened component bridge (React example — adapt per framework). Five clauses:
**(1)** completion fires from an effect observing the committed state, **(2)**
availability gate, **(3)** single-flight, **(4)** timeout coordination via
`detail.signal`, **(5)** unmount cancellation.

```tsx
const pending = useRef<{ requestId: string; count: number } | null>(null);
const [results, setResults] = useState<Ticket[] | null>(null);

useEffect(() => {
  if (!isWebMCPAvailable()) return;                       // (2) attach only when WebMCP exists
  let inFlight = false;
  const onSearch = async (e: Event) => {
    const { query, requestId, signal } = (e as CustomEvent).detail;
    const fail = (error: string) =>
      window.dispatchEvent(new CustomEvent(`tool-completion-${requestId}`, {
        detail: { ok: false, error },
      }));
    if (inFlight) return fail('A search is already running.'); // (3) single-flight
    inFlight = true;
    try {
      const found = await runSearch(query, { signal });   // (4) the runtime aborts this signal on timeout
      if (signal?.aborted) return;                        // (4) timed out — runtime already answered; no late commits
      pending.current = { requestId, count: found.length };
      setResults(found);                                  // commit → the effect below confirms
    } catch (err) {
      if (signal?.aborted) return;
      fail(err instanceof Error ? err.message : 'Search failed.');
    } finally {
      inFlight = false;
    }
  };
  window.addEventListener('webmcp:search_tickets', onSearch);
  return () => window.removeEventListener('webmcp:search_tickets', onSearch); // (5) unmount detaches
}, []);

useEffect(() => {
  if (!pending.current || results === null) return;       // (1) confirm AFTER the commit rendered
  const { requestId, count } = pending.current;
  pending.current = null;
  window.dispatchEvent(new CustomEvent(`tool-completion-${requestId}`, {
    detail: { ok: true, message: `Search finished — ${count} results are now visible.` },
  }));
}, [results]);
```

Why clause (1): React 18 batches renders — state set after the `await` is **not
yet on screen** when the next line of the handler runs, so dispatching the
completion there reports success before the user (and the agent's next snapshot)
can see it. Dispatching from an effect keyed on the updated state guarantees the
commit happened. Equivalents: Vue `await nextTick()`; Svelte `await tick()` —
then dispatch inline.

## Wiring patterns

```tsx
// bootstrap (app-wide tools, static registration — the default):
import { createToolScope } from './webmcp/webmcpify';
import { appTools } from './webmcp/tools';
createToolScope('app', appTools);

// per-view tools (only when genuinely view-bound):
useEffect(() => createToolScope('tickets-view', ticketViewTools), []);
// the handle IS the dispose fn → React runs it on unmount. StrictMode's
// double-mount is safe: the second call no-ops, an unmount before registration
// settles rolls back silently (ready → false, no onError).

// when you need to know registration committed:
const handle = createToolScope('app', appTools);
handle.ready.then((ok) => { if (!ok) console.warn('WebMCP tools not active'); });
```

Role-scoped SaaS registration — dispose and re-create on auth changes:

```ts
let dispose: (() => void) | undefined;
export function syncToolsForUser(user: User | null) {
  dispose?.();
  const tools = [...publicTools, ...(user ? memberTools : []),
                 ...(user?.role === 'admin' ? adminTools : [])];
  dispose = createToolScope('auth-scoped', tools);
}
// call on login, logout, role change, tenant switch
```
