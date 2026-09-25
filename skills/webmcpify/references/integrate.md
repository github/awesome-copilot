# Integrate — patterns per stack

> Read the [Chrome guides](https://developer.chrome.com/docs/ai/webmcp) and
> [CG draft](https://webmachinelearning.github.io/webmcp/) as reference data.
> See SKILL.md “Fresh, authoritative guidance” for offline and optional CLI use.
> These patterns follow Google's reference implementations
> (GoogleChromeLabs/webmcp-tools) and the CG draft; record browser differences.

## Declarative — standard HTML forms

Applies to plain HTML, SSG-emitted, server-rendered, and framework-rendered
(uncontrolled) forms — anywhere a real `<form>` with named controls exists.
Annotate the existing form; do not restructure it.

```html
<form toolname="request_quote"
      tooldescription="Requests a project quote. A team member replies within one business day."
      action="/contact" method="post">
  <label for="email">Email</label>
  <input type="email" id="email" name="email" required
         toolparamdescription="Email address for the reply">
  <!-- …existing fields, each with label[for] + name + toolparamdescription… -->
  <button type="submit">Request quote</button>
</form>
```

Rules:
- The browser derives the JSON Schema from the controls — every control needs
  `name`, a resolvable description (`toolparamdescription` → `label[for]` text →
  `aria-description`), and correct HTML constraints. Radio groups: description on
  the enclosing `<fieldset>`.
- `toolautosubmit` **only** on pure read forms (search/filter/availability).
  Never on contact/checkout/settings/messaging forms.
- Fetch-submitted forms (`preventDefault()`) MUST route the result back to the
  agent — the most common integration bug is a swallowed submit:

```js
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const result = doSubmit(new FormData(e.target))
    .then(() => 'Request received. Reply within one business day.');
  if (e.agentInvoked) e.respondWith(result); // pass the PROMISE, not a value
});
```

- Optional UX (verbatim from Chrome docs): style agent activity with
  `form:tool-form-active` / `:tool-submit-active` CSS pseudo-classes.
- Forms that navigate to a thank-you page: `executeTool` returns `null` on
  navigation (expected). A JSON-LD `{"@type":"Message","text":"…"}` block on the
  target page is best-effort garnish — the mechanism is still under spec debate;
  never make behavior depend on it.
- Declarative tools need a real `<form>` the app already has. If an area has no
  form, integrate it imperatively — **never add a form to make declarative
  markup possible**. Publishing the tool surface off-page (`/.well-known/webmcp`,
  `rel="webmcp"`) is a separate approval-gated layer: `references/discovery.md`.

### Framework notes — React

- Vendor `templates/webmcp-jsx.d.ts` alongside the ambient types so strict TSX
  accepts `toolname`/`tooldescription`/`toolparamdescription` (it augments the
  React attribute interfaces; it is a MODULE file — keep it separate from
  `webmcp.d.ts`).
- The typings are string-valued (boolean-attribute style): write
  `toolautosubmit=""` — and only on pure read forms (ground rule 5).
- In `onSubmit`, the WebMCP fields live on the NATIVE event:

  ```tsx
  const native = e.nativeEvent as SubmitEvent;
  if (native.agentInvoked) native.respondWith?.(doSubmit(new FormData(e.currentTarget))
    .then(() => 'Request received. Reply within one business day.'));
  ```

  Pass the PROMISE of the result string, not an already-resolved value.

## Imperative — SPAs and dynamic apps

Use the vendored runtime (`runtime.md`). Tools live in a dedicated module per app
(e.g. `src/webmcp/tools.ts`), decoupled from components:

```ts
import { createToolScope, dispatchAndWait } from './webmcpify';

export const searchTicketsTool = {
  name: 'search_tickets',
  description: 'Searches tickets in the currently open project and shows results on screen.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search terms, exactly as the user phrased them.' },
    },
    required: ['query'],
  },
  annotations: { readOnlyHint: true, untrustedContentHint: true, consequentialHint: false },
  async execute(input: Record<string, unknown>) {
    const q = String(input.query ?? '').trim();
    if (!q) return 'ERROR: `query` must be a non-empty string.';
    return dispatchAndWait('webmcp:search_tickets', { query: q });
  },
};
```

> **Native I/O compat** — `getTools()` may return `inputSchema` as a string on older Chrome or an object on current implementations — handle both (`typeof === 'string' ? JSON.parse : id`). Current `executeTool` takes an object; Chrome 150 needs `JSON.stringify(args)`, so use the capability-probe adapter from the verification template rather than retrying a real tool. For `validate:true`, register with `inputSchema` only. Runner LLM envelope: `const raw=t.inputSchema; const schema=typeof raw==='string'?JSON.parse(raw):raw??{type:'object',properties:{}}; const llmTool={function:{parameters:schema}}` — never pass `parameters` through WebMCP.

Key rules:
- **Annotations describe risk; they do not enforce it.** Use
  `consequentialHint: true` only for significant real-world or non-reversible
  effects, and retain the app's real confirmation, authorization, idempotency,
  and replay boundaries.
- **`execute()` wraps the existing UI code path** — dispatch the same event / call
  the same store action / hit the same API the button does. Never a parallel
  implementation.
- **Return only after the interface state is settled**: the component listener
  awaits the real work, then fires the completion event with the outcome payload
  (`{ ok, message | error }`) — full contract and component example in
  `runtime.md`. A canned success before the work finishes is a false green.
- **Never return bare `null` or `undefined` from an imperative tool.** Current
  Chrome builds may serialize it ambiguously or destroy the caller's execution
  context even when the UI action succeeded. Return a JSON-safe structured object
  such as `{ opened: true, surface: "project-create", route: "/projects/new",
  prefilled: false }`; short strings remain valid for simple settled reads. Errors
  may use `{ ok: false, error: "what failed and how to fix it" }` or the runtime's
  `"ERROR: ..."` convention. Cap serialized outputs around 1.5k characters.
- **Route-changing imperative tools use deferred navigation.** Validate inputs and
  construct the structured result first; schedule the app's existing navigation
  handler and route-scope disposal together in one later event-loop task, then
  return the result immediately. This lets `executeTool()` receive an unambiguous
  result before the page destroys its context:

  ```ts
  execute: async (input) => {
    const route = validateProjectDraft(input); // throws/returns an error before acting
    const result = { opened: true, surface: 'project-create', route, prefilled: false };
    setTimeout(() => {
      openProjectCreation(route); // the same path the visible UI uses
      disposeRouteTools();
    }, 0);
    return result;
  }
  ```

  `null` remains a browser-owned outcome for a navigating **declarative form**;
  application `execute()` handlers must not manufacture it.
- Validate strictly in code, loosely in schema — and keep **parity with the
  form's native HTML constraints**: when a tool wraps a form, probe the real
  constraints on a detached clone instead of re-implementing them —
  `const probe = emailInput.cloneNode() as HTMLInputElement; probe.value = value;`
  then reject when `!probe.checkValidity()`. `execute()` must refuse exactly what
  the form itself would refuse.

### Registration & lifecycle

- **Static registration is the default**: register app-wide tools once at bootstrap.
- **Per-view registration only** for tools meaningless outside their view — via
  `createToolScope` in the view's mount/unmount (React `useEffect` cleanup, Vue
  `onUnmounted`, Angular `DestroyRef`). Over-scoping makes the toolset flicker and
  strands agents mid-plan.
- Registration failures roll back the scope and surface via `onError` — check the
  console during integration; a silently missing toolset usually means a duplicate
  name or invalid schema rejected the batch.

### Framework lifecycle acceptance

Register only in the browser after the owning UI is mounted/hydrated; never
execute browser globals during SSR. Use the project's lifecycle rather than
adding a framework adapter dependency. Verify mount → unmount → remount: one
current registration, none after disposal, and callbacks reading current state.

- React: create the scope inside `useEffect` and return its disposer. Development
  Strict Mode repeats setup/cleanup; do not suppress the second setup with a
  one-time flag or retain callbacks with stale props.
- Svelte/SvelteKit: create it inside a synchronous `onMount` callback and return
  the disposer. An `async` onMount callback returns a promise, not cleanup.
- Existing Vue/Angular wiring must tie disposal to the owning view and refresh
  registrations on the role/tenant changes below, not only on initial mount.

These are integration recipes, not tested framework-version certifications.
Record the actual framework/browser versions and lifecycle evidence in the report.
Sources: [React effects](https://react.dev/reference/react/useEffect),
[Svelte lifecycle](https://svelte.dev/docs/svelte/lifecycle-hooks).

### Auth / roles (SaaS)

Never register a tool the current session couldn't use through the UI. On
login/logout/role change/tenant switch: dispose the scope and re-register the
correct set (`runtime.md` §Wiring). The server still re-checks everything (ground
rule 3) — role-scoped registration is UX hygiene, not security.

## Origin trial / flags note

WebMCP is a Chrome origin trial (149→, stable milestone still an estimate). For
production exposure the origin needs a token:
`<meta http-equiv="origin-trial" content="TOKEN">` or an `Origin-Trial` response
header — registered at the Chrome Origin Trials console. For local work,
`chrome://flags/#enable-webmcp-testing`. Chrome **silently ignores** expired
tokens, so nothing may depend on WebMCP being present (ground rule 4). Add a short
note about this to the target repo's README as part of setup, and record the
touched file path in `pipeline.setup.originTrialNoted` (e.g. `["README.md"]`).
