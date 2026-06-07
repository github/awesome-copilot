---
name: figma-design-extract
description: Extract exact design values from a Figma node into a build-ready spec table, instead of eyeballing a screenshot. Use when the user shares a figma.com node URL, or says "implement this Figma design", "build this component from Figma", "extract the Figma values", or "match the Figma". Reads structured data via the Figma MCP - get_design_context (structure), get_variable_defs (tokens, the source of truth), get_metadata (sizes), get_screenshot (visual reference only, never measured). Maps each Figma variable to your repo's own design tokens, reuses existing components, and logs token drift instead of hardcoding. Produces the spec table that design-fidelity-verify consumes. Stack-agnostic; Tailwind/NativeWind/Restyle/CSS-vars are examples to adapt.
license: MIT
compatibility: Portable markdown body usable in any MCP-capable agent. Native skill in Claude Code and OpenAI Codex (.agents/skills); adapt to Cursor rules or Copilot instructions per the repo README.
---

# Figma Design Extract — get the real design out of Figma

> Canonical source & companion skill `design-fidelity-verify`: [jeltehomminga/figma-design-skills](https://github.com/jeltehomminga/figma-design-skills) (MIT).

Read a Figma node into a **design-spec table** of exact values mapped to your codebase, *before* writing any component code. The table is both your build contract and the input to the companion **`design-fidelity-verify`** skill, which proves the running app matches it.

This skill is the design→code direction (read Figma, produce a spec). It is **not** a code→Figma generator.

## Why this exists (the failure mode it fixes)

**Screenshot-as-truth.** A model reads a Figma screenshot as "button, top-right" but cannot see that the radius is 8 not 12, the weight is 500 not 600, or the gap is 12 not 8. A screenshot is a *visual reference only*. Exact values come from Figma's structured data — variables and metadata — not from pixels. The bar is fidelity to the design's *decisions* — the right **token** — not literal pixel coordinates. Skip this and the design drifts the moment you start typing.

## When to use

Trigger phrases: "implement this Figma screen/component", "build this design", "extract the Figma values", "get the tokens/spacing/colors from Figma", "match the Figma", or a `figma.com/design/...node-id=...` URL shared to build from.

Scope: any frontend repo (web or mobile). Backend/API repos have no UI to build.

Prerequisite: the **Figma MCP server** (Dev Mode MCP) connected, so `get_variable_defs`, `get_metadata`, `get_design_context`, and `get_screenshot` are available.

---

## The extraction workflow

### 0. Resolve the node (don't trust stale IDs)

Get the node from the URL the designer shared, or from your issue tracker / design handoff. The node id is the `node-id=NNNN-MMMM` part of a Figma URL (the `-` becomes `:` in API calls, e.g. `1234:5678`).

- Node ids go stale between handoff and build. Try the given id with `get_design_context` first; if it returns "node not found", search by a **stable numeric prefix** rather than the frame name (names get renamed and double-spaced).
- Dark mode often lives on a **mirror page** with identical frame names — look on the sibling page, don't search globally.
- **Keep every call node-scoped.** `get_metadata` on a 40-frame section blows the token budget. Always pass the specific node id.

### 1. Structure — `get_design_context(nodeId)`

Use it for **structure only**: auto-layout → flex direction / `gap`, hierarchy, where component boundaries are. Do **not** copy its absolute pixel positions or inlined values — treat those as hints and confirm them against variables/metadata.

- **Code Connect** is on by default in `get_design_context`. Choose by your setup:
  - **You have Code Connect mapped** → keep it on. It returns exact import paths and is the single best component-reuse signal — don't disable it.
  - **You don't use Code Connect (most setups)** → the response may nag "components missing Code Connect — map them?". Pass `disableCodeConnect: true` to skip that noise and get the generated structure directly. A reasonable default when no mappings exist; don't stop to set Code Connect up mid-task.
- Treat the returned code as a *representation* of design and behavior, not final code style — adapt it to your conventions (Figma's own guidance).

### 2. Exact styles — `get_variable_defs(nodeId)` ← the source of truth

This answers "are we even getting the real styles?". It returns the exact **color / spacing / radius / typography** tokens bound in the selection. For every value:

- **Map the Figma variable to a token in your own design system — never hardcode the raw value.** Resolve `var(--primary/500)` to whatever your repo calls it.
- If a value has **no bound variable**, that's a design smell. Note it, use `get_metadata` for the raw number, and flag it for the designer.
- **Log token drift.** If a bound token's value in your repo differs from Figma's variable value, append a row to a drift log of your choice (e.g. `docs/design-drift.md`) and keep using the token *name* — never hardcode the Figma value to "fix" it. The token package is corrected separately.

### 3. Sizes + truncation fallback — `get_metadata(nodeId)` (scoped)

Two uses: exact sizes/positions not covered by a variable (fixed dimensions, one-off gaps, icon box sizes), **and** a fallback when `get_design_context` is truncated — responses are capped (~20kb/call), so on a large node, take the node map from `get_metadata` then re-fetch only the child node(s) you need. Keep it node-scoped.

### 4. Visual reference — `get_screenshot(nodeId)`

Composition, states, iconography, what-goes-where. **Never measure from it.** It exists to catch "you built the wrong thing", not "you built it 4px off".

### 5. Unbound values (gradients, complex fills)

`get_variable_defs` only returns values **bound to a variable**. Anything unbound — many gradients, one-off fills — won't appear there. For those, read `node.fills` via the Figma Plugin API (`use_figma`) for the authoritative stops/values, and flag the missing binding as a design smell.

### 6. Component reuse — audit before you scaffold

Map each Figma component to an existing primitive in your repo *before* building anything new:

- Grep your components directory for a primitive that already does this — a variant beats a fork.
- Note where reuse wasn't possible and why.
- If your org has **Code Connect** set up, `get_design_context` can return exact import paths automatically; if not, map manually and treat Code Connect as a future automation, not a blocker.

---

## Output: the design-spec table

One row per element×property. This is the deliverable — keep it in your working notes; it drives both implementation and verification.

```
element          | property      | Figma exact value      | repo token / class        | source component
-----------------+---------------+------------------------+---------------------------+------------------
Card container   | bg            | var(--surface/0)       | <your white-surface token>| <Card>
Card container   | radius        | 12                     | <your rounded-lg token>   | <Card>
Card container   | padding       | 16                     | <your space-4 token>      | <Card>
Title            | font/size/wt  | Heading/M 18 / 600     | <your title-m token>      | <Text>
Row gap          | gap           | 8                      | <your space-2 token>      | (auto-layout)
CTA              | bg            | var(--primary/500)     | <your primary-500 token>  | <Button primary>
CTA              | radius        | 8                      | <your rounded-md token>   | <Button>
```

Fill the **repo token / class** column with *your* system's names (see below). The point is that every cell on the right is a token reference, not a hardcoded literal.

---

## Map Figma variables to your stack

The mechanism is identical everywhere; only the token syntax changes. These are **examples to adapt** — use whatever your repo already uses:

- **Tailwind / NativeWind (utility classes):** `var(--primary/500)` → `bg-primary-500`; `radius 12` → `rounded-xl`; `gap 8` → `gap-2`. For light/dark, lean on your config's dark variant (`bg-white dark:bg-neutral-900`).
- **Restyle / theme objects (React Native):** map to theme keys — `backgroundColor="primary500"`, `borderRadius="l"`, `spacing="s"`.
- **CSS variables / vanilla:** `background: var(--primary-500)`, `border-radius: var(--radius-md)`.
- **Color-only props** (SVG/icon strokes that can't take a class) → read the resolved color from your theme/token module rather than pasting a hex.

If your repo has none of these, that's the real finding — surface it; don't invent ad-hoc values.

> **Adapt to your stack:** wherever this skill names Tailwind/NativeWind/Restyle/CSS-vars, substitute your own design-token system. The rule that never changes: a value bound to a Figma variable maps to a named token in your code, never to a hardcoded literal.

## Assets

Export SVGs/icons from Figma, then optimize them (e.g. SVGO) before committing — never commit raw editor exports. Ensure an explicit `viewBox`.

---

## Enforce it — a no-raw-values gate

"Never hardcode" is a rule the model can forget mid-build. Back it with a deterministic check that doesn't depend on the model's discipline: after building, grep the diff for raw values that should be tokens, and fail if any slip through.

```bash
# Flag raw hex / rgb / px / 3-digit font-weight literals in added lines.
git diff --unified=0 | grep -nE '^\+' \
  | grep -iE '#[0-9a-f]{3,8}\b|rgba?\(|[^a-z-][0-9]+px|font-weight:\s*[0-9]{3}' \
  && echo "raw values found — map them to tokens" || echo "clean"
```

Tune the pattern to your stack and allow tokenized exceptions. This pairs with the drift log: a *bound* value that mismatches goes to the drift log; an *unbound* raw literal gets tokenized or flagged. Run it in CI to make the guardrail a real gate, not a hope.

## Guardrails

- Never write a hardcoded color/spacing/radius/font value that has a bound Figma variable — map it to a token.
- Never measure from a screenshot. Structured values only.
- Keep every Figma call node-scoped to control token cost.
- An unbound value is a design smell — flag it, don't silently bake in the raw number.
- Log Figma↔token drift instead of hardcoding the Figma value; fixing the token package is a separate task.

## Hand-off

The spec table is the input to **`design-fidelity-verify`**: build the component from the table, then run that skill to prove — by measuring rendered values, not by glancing — that the running app matches every row.
