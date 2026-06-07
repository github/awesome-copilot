---
name: design-fidelity-verify
description: Prove a running app matches its design spec by measuring rendered values, not eyeballing a screenshot. Use when the user says "verify the design", "is this pixel-perfect", "check against Figma", "does the app match the design", "design QA", or after building with figma-design-extract. Runs a bounded vision+numeric loop (about 3 iterations) for web and mobile - web reads getComputedStyle and getBoundingClientRect via a browser/Playwright MCP; mobile reads native view props (color, bounds, cornerRadius, font) via Argent or similar at scale 1.0. Walks every spec row to PASS/FAIL plus delta, records a repeatable navigation flow, and reports residuals honestly. Tool-agnostic. Consumes the figma-design-extract spec table.
license: MIT
compatibility: Portable markdown body usable in any MCP-capable agent. Native skill in Claude Code and OpenAI Codex (.agents/skills); adapt to Cursor rules or Copilot instructions per the repo README.
---

# Design Fidelity Verify — prove the running app matches the spec

> Canonical source & companion skill `figma-design-extract`: [jeltehomminga/figma-design-skills](https://github.com/jeltehomminga/figma-design-skills) (MIT).

"Looks done" is not a check. This skill runs a **measured feedback loop**: render → capture → read the *actually rendered* values off the live app → compare each against the design spec → fix → re-verify, bounded. The numeric pass is the whole point — it catches what the eye and a screenshot cannot. The bar is **spec fidelity** — every value resolves to its intended token, within tolerance — not literal "pixel-perfect" (a phrase that means little across devices); measure tokens and deltas, don't chase byte-identical pixels.

## Upstream: the spec table

This skill **consumes the design-spec table produced by [`figma-design-extract`](https://github.com/jeltehomminga/figma-design-skills/blob/main/skills/figma-design-extract/SKILL.md)** — rows of `element | property | exact value | repo token | source component`. If you don't have one yet, run that skill first. The spec is your pass/fail checklist; without it you're back to eyeballing.

## Why this exists (two failure modes)

1. **Blurry capture.** The default device/headless screenshot is often low-res and hides truncation, wrong colors, and small spacing drift. Always capture full-resolution.
2. **No feedback loop.** Building once and declaring victory is not verification. Render → measure → compare → fix → re-measure, with a hard cap so it terminates.

## When to use

Trigger phrases: "verify the design", "is this pixel-perfect", "check against Figma", "does the app match the design", "design QA this screen", or immediately after building a screen with `figma-design-extract`.

---

## Pick your platform (then load the matching reference)

The loop below is **identical for web and mobile**. Only two steps differ — how you capture full-res, and how you read rendered values. **Read the one reference file for your platform before the numeric pass (B5)**; ignore the other.

| Platform | Capture + measure mechanics | Reference to load |
|----------|-----------------------------|-------------------|
| **Web**    | `getComputedStyle` + `getBoundingClientRect` via a browser/Playwright/Chrome MCP; capture at devicePixelRatio ≥ 2 | [`references/verify-web.md`](references/verify-web.md) |
| **Mobile** | Native view props (backgroundColor, bounds, cornerRadius, font) via **Argent** or similar, captured at `scale: 1.0` | [`references/verify-mobile.md`](references/verify-mobile.md) |

> **Tool-agnostic:** Argent, agent-device, an iOS-simulator MCP, Playwright, Chrome MCP — any of them works. The reference files name specific tools as *examples*; what matters is that you read the rendered value, not that you use a particular MCP. Adapt to whatever you have connected.

---

## The loop (same for every platform)

### B0. Preflight (clear these FIRST)

In practice most verify time goes to infrastructure gates, not the design diff — and each one discovered late wastes a rebuild. Check before building/rebuilding:

- **Environment up?** Is the backend/API the screen needs actually reachable? A failed login or empty data screen is often a down environment, not a code bug — don't burn a rebuild fighting it.
- **Test-data shape right?** Does the account/fixture expose what the screen needs (the multi-item case, the specific state)? A component that only renders when `items.length > 1` verifies *nothing* on a single-item account. Confirm the data shape first.
- **Inspection tooling connected?** Whatever you'll use for the numeric pass (browser devtools/CDP, native view introspection) — confirm it actually attaches now, not at measurement time. Plan the fallback if it doesn't (see your platform reference).
- **Build current?** A stale build verifies the wrong code. Rebuild if the bundle/entry changed.
- **Authenticated?** Most real screens sit behind auth. Use your app's login flow and automate it if you can, so re-verifies are repeatable.

### B1. Run, navigate, and record the path

Build/run the app and navigate to the screen. **Record the navigation as a replayable flow** so every re-verify is identical — no interaction variance between iterations. (See your platform reference for the recording mechanism.)

### B2. Capture full-resolution

Capture the screen at full resolution (web: dpr ≥ 2; mobile: `scale: 1.0`). Low-res capture is failure mode #1 — do not skip the resolution bump.

### B3. Map on-screen elements → code

Get the element tree with names + coordinates, so when something is off you can jump straight from the on-screen position to the `file:line` that renders it instead of hunting.

### B4. Vision pass

Place the app capture beside the Figma reference (`get_screenshot` from the extract step). Enumerate discrepancies **by category** so nothing is hand-waved:

`layout/alignment · spacing · color · typography · radius · sizing · states/icons · missing/extra elements`

### B5. Numeric pass (the rigor)

Read the **actually rendered** values off the live app and compare each against the spec table. **Read your platform's reference file now** (`references/verify-web.md` or `references/verify-mobile.md`) for the exact calls — the discipline is the same:

- Pull the rendered value (computed style on web; native view prop on mobile).
- **Walk every row** of the spec table: spec value vs measured value → **PASS / FAIL + delta**.
- **Degrade gracefully, don't skip.** If one measurement channel is blocked (e.g. native color read won't attach), fall back to what *is* measurable (bounds/placement/sizing from the element tree) and record the rest as an explicit **residual** — "hex not measured: introspection unavailable" — rather than silently claiming a full pass.

### B6. Discrepancy report

```
element  | property | spec     | app      | delta   | severity
---------+----------+----------+----------+---------+---------
CTA      | bg       | #00B140  | #00A038  | off     | high
Row gap  | gap      | 8        | 12       | +4      | med
Title    | weight   | 600      | 400      | -200    | high
```

### B7. Fix + re-verify (bounded)

Fix highest-severity first → replay the recorded flow → re-capture → re-run the numeric pass. Tokenize every value you touch while fixing — never paste a raw hex/px to "make it match"; that just reintroduces drift. **Hard cap: ~3 iterations.** Then stop and report what remains. Unbounded loops cause context rot and undo-fixes.

### B8. Optional clean-context review

For a high-stakes screen, spawn a fresh review subagent to run B4–B6 without the implementer's bias.

### B9. Optional — lock in a regression baseline

The numeric pass proves a **first build** matches the spec; visual-regression tools can't do that (they need a prior approved render to diff against). Once it passes, snapshot the screen as that baseline so a VR tool (Playwright `toHaveScreenshot`, Chromatic, Percy, Applitools) catches *future* regressions the one-shot numeric pass won't. Complementary: numeric diff for first-build conformance, VR for ongoing protection.

---

## Guardrails

- **Never report "matches the design" without the numeric pass (B5).** A clean vision pass alone is not proof.
- **Never measure from a screenshot** — either side. Screenshots catch "wrong thing built", not "4px off".
- **Always capture full-res** (web dpr ≥ 2 / mobile `scale: 1.0`). The default is usually too blurry to trust.
- **Cap the loop at ~3 iterations** and report residuals honestly rather than thrashing.
- **Record the navigation as a flow** so each re-verify measures the same screen state.
