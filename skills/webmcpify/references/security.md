# Security checklist

Apply at two points: **before the manifest gate** (classify + flag) and **at the
final audit** (verify). Any unchecked box on a `mutating: "server"` tool blocks
it. Client-only mutations (`mutating: "client"`) still must pass the
**Trust boundary** and **Honesty & hints** boxes.

## Threat model in one paragraph

Any Chrome extension with host permissions — and any agent the user runs — can
enumerate and execute your tools **with the user's live session**. The spec has no
agent-identity mechanism. Page-visible strings (descriptions, labels, enum values,
tool outputs) all enter the model's context, so they are prompt-injection surface in
both directions. Design every tool as if it were a public, authenticated API endpoint
— because effectively it is one.

## Checklist

**Trust boundary**
- [ ] Every `execute()` calls only code paths the UI already uses — same endpoints,
      same validation, same authz, same rate limits. No new endpoints, no bypasses.
- [ ] No secrets, tokens, or privileged config inside tool code or descriptions.
- [ ] Role-based apps: tools registered per role/session and re-scoped on auth
      changes; nothing registered the current session couldn't do via the UI.

**Human-in-the-loop**
- [ ] No `toolautosubmit` on any state-changing form.
- [ ] No destructive/irreversible/payment tools at all in a first integration.
      If the human explicitly insists later: an in-page manual confirmation the
      **user** performs, PLUS a server-side two-step (short-lived confirm token).
      No client-side API exists that can force an agent to confirm — never rely on
      one.
- [ ] Initiation tools (`start_*_flow`) genuinely only navigate/open — they must
      not pre-execute any part of the mutation, and never carry `readOnlyHint`.

**Production side effects (verification)**
- [ ] Any verification that unavoidably causes a real production effect (e.g. an
      Origin-allow-listed mailer) has explicit gate approval recorded in the
      tool's `approval.productionSideEffect` — without it, the live path is
      `skipped`, never executed.
- [ ] Every such test payload is marked `[webmcpify verification]`, and every
      caused effect is listed in `report.md`.
- [ ] The Origin-replay pattern (`heal.md`) lives only in the env-gated harness
      (`WEBMCP_LIVE_MUTATIONS=1`) — never in shipped code, never default-on in CI.

**Honesty & hints**
- [ ] Description says exactly what `execute()` does — no more, no less (agents make
      consent decisions from it).
- [ ] `readOnlyHint: true` ONLY on genuinely pure data reads (agents skip
      confirmation based on it; mislabeling is the worst single mistake).
- [ ] `untrustedContentHint: true` on every tool returning user-generated or
      external content.
- [ ] Outputs capped (~1.5k chars) and free of instruction-like content where
      possible.

**Privacy**
- [ ] Schemas request no more personal data than the equivalent visible form —
      agents auto-fill anything you declare (over-parameterization = silent
      profiling vector).

**Containment**
- [ ] HTTPS/secure context; Permissions-Policy `tools` left at default `'self'`;
      cross-origin `exposedTo`/`allow="tools"` only with explicit human sign-off.
- [ ] Pages that must never expose tools (un-audited checkout, admin consoles you
      didn't inventory) can send `Permissions-Policy: tools=()` — suggest it in the
      report where relevant.
- [ ] No third-party WebMCP runtime added to the project; enumeration/execution
      surfaces (`getTools`/`executeTool`, legacy `modelContextTesting`) appear
      nowhere in shipped application code.
- [ ] Component-side `webmcp:*` event bridges attach only when
      `isWebMCPAvailable()` and validate their event payloads — a page script can
      dispatch the same CustomEvents; the bridge must not become an unvalidated
      side door into app actions.
