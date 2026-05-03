# `winapp ui --json` envelope (v0.3.1+)

The `--json` output for the `winapp ui` command group was reshaped in v0.3.1.
Generate parsers against these shapes — pre-0.3.1 parsers will silently break
because most fields were renamed, removed, or moved into envelopes.

## `ui inspect --json`

Top-level shape (elements are now nested under `windows[]`, not flat):

```json
{
  "depth": 0,
  "interactive": false,
  "hideDisabled": false,
  "hideOffscreen": false,
  "windows": [
    {
      "hwnd": "0x...",
      "title": "...",
      "className": "...",
      "elementCount": 0,
      "elements": [
        {
          "selector": "...",
          "name": "...",
          "controlType": "...",
          "children": [ ... ]
        }
      ]
    }
  ]
}
```

Pre-0.3.1 the shape was `{ "elements": [...] }`. Per-element `id`, `depth`,
`parentSelector`, and `windowHandle` fields have been **removed** — `selector`
is the public handle.

## `ui inspect --ancestors --json`

Ancestors are now nested as a parent → child chain keyed by `Depth=i`
(previously emitted as sibling roots).

## `ui inspect --interactive`

Non-interactive ancestors are collapsed and surfaced as `ancestorPath` on
surviving descendants. `+more` markers indicate truncated subtrees in both
text and JSON modes.

## `ui get-focused --json`

Always emits an envelope (never a bare value):

- No focus: `{ "hasFocus": false }`
- With focus: `{ "hasFocus": true, "element": { ... } }`

Pre-0.3.1 emitted bare `null` when nothing was focused.

## `ui search --json` / `ui wait-for --json`

Both commands return matching elements using the same element shape as
`ui inspect` (so `selector`, `name`, `controlType`, `children`, etc.).
Each match may also include an `invokableAncestor` field — itself an
element-shaped object — pointing to the nearest parent that supports
`InvokePattern` (useful when a search hits a non-invokable element
like a label inside a button).

```json
[
  {
    "selector": "btn-save-c3d4",
    "name": "Save",
    "controlType": "Button",
    "children": [ ... ],
    "invokableAncestor": {
      "selector": "btn-save-c3d4",
      "name": "Save",
      "controlType": "Button"
    }
  }
]
```

The internal `id`, `parentSelector`, and `windowHandle` fields are
**scrubbed** from results — both at the top level and inside any nested
`invokableAncestor`. Don't depend on them; use `selector` as the handle.
