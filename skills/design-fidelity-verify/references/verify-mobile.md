# Verify backend — Mobile (iOS / Android)

The mobile mechanics for steps **B2 (capture)** and **B5 (numeric pass)** of the verify loop. The loop itself lives in `../SKILL.md`.

## Tooling

**Primary recommendation: Argent** — an MCP server for driving iOS simulators / Android emulators and React Native apps.
- Site: https://argent.swmansion.com
- Repo: https://github.com/software-mansion/argent

Argent is the strongest fit because it can read **native view properties** (the rendered truth), drive the simulator, record replayable flows, and inspect the RN tree — all from one server.

**Alternatives (the method is tool-agnostic):**
- **agent-device** — https://github.com/callstackincubator/agent-device — agent-driven device control.
- **Lighter iOS-simulator MCP servers** — several community servers wrap `simctl` for boot/screenshot/tap; good enough for capture + accessibility-tree placement, though they may not expose native paint props (color/cornerRadius/font).

Pick whatever you have. What matters: **read the rendered value**, don't eyeball it. The calls below use Argent-style names — substitute your tool's equivalents.

## B1 — record the navigation as a flow

Record the path to the screen once and replay it each iteration so the measured state is identical. With Argent, capture the tap/scroll/type sequence as a flow and execute it on every re-verify. (If your tool has no flow recorder, keep the exact ordered list of interactions and replay them verbatim.)

## B2 — capture full-resolution

**Capture at `scale: 1.0`.** Device-screenshot defaults are often downscaled (~0.3) and that blur is the #1 reason a "looks fine" capture hides real drift. Bump the scale to 1.0 every time.

> **Boot the simulator/emulator through your device tool, first.** A simulator left running from a prior `run:ios` may not be controllable by the MCP — gestures can silently no-op and the accessibility tree can come back empty. Boot (or force-reboot) it through the tool up front so taps register and the tree is populated.

## B5 — numeric pass: read native view props

This is the rigor that a screenshot can't give you. Read the **rendered** native values and compare each to the spec table.

**iOS (native paint props):** Argent's view-inspection (e.g. `native-find-views`) returns, per view, fields like:
- `backgroundColor` → compare to the spec color (normalize to hex)
- `frame` / `bounds` → sizing + placement
- `cornerRadius` → radius
- `font` (family / size / weight) → typography

Requires native devtools to be injected/attached — confirm that **before** measuring (check your tool's devtools-status). On some dev-client builds injection never connects; plan the fallback below.

**React Native (any platform), via Metro/CDP:** read component props, resolved styles, and `measure()` layout through the debugger (e.g. Argent's `debugger-evaluate` / `debugger-inspect-element`). This works **without** native injection and also confirms an on-screen element maps to the expected `file:line`. Note: CDP tap coordinates can differ from accessibility-tree / screenshot coordinates — don't assume they align.

Then **walk every spec-table row** → spec value vs measured value → PASS / FAIL + delta.

## Graceful degradation (don't skip the numeric pass)

When the native paint read is blocked (injection won't attach on a dev-client):

- The **accessibility / view tree** still returns normalized frames `(x, y, w, h)` for every element — a genuine numeric source for **placement, bounds, sizing, spacing**, and element *order* (e.g. "is the header above the selector?"). Convert those to deltas against the spec.
- **CDP `inspect-element`** (no native injection) still confirms each element maps to the expected `file:line` — proving the live UI is the code you think it is.
- What remains genuinely unmeasured this way is **hex color / cornerRadius / font-weight**. Record those as an explicit **residual** ("hex pass not run — native injection unavailable"); cover them qualitatively with a sharp `scale: 1.0` capture and a source-level audit. Do **not** silently claim a full pass.

## Map back to source

Use the tool's coordinate→source inspector (e.g. `debugger-inspect-element`) to jump from an on-screen discrepancy straight to the `file:line` and component that renders it, instead of hunting through the tree.
