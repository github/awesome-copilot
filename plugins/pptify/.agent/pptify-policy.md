<!-- pptify-managed: do not edit manually -->
# pptify Developer-Protection Policy

Installed by pptify-cli. Do not edit manually; run `pptify install` to refresh.

## Secret and Credential Safety

- Never embed API keys, tokens, connection strings, or passphrases in deck
  specs, prompt assets, audit files, attempt manifests, or version-controlled
  files.
- Never collect API keys or tokens through chat or the VS Code prompt input
  dialog. Require the user to type secrets directly into a terminal or a
  managed secret environment (e.g. `az login`, `$env:OPENAI_API_KEY = ...`).
- If an image-generation helper fails due to missing credentials, persist a
  failure manifest with `provider`, `status: missing_credentials`, and `error`,
  and do not describe placeholder artwork as model-generated.

## Coordinate Contract

- All generated slides must use explicit `layout_tree` with final bboxes, font
  sizes, text colors, line endpoints/styles, shape names, and z-order.
- Prohibited obsolete shorthand keys: `pattern`, `layout_pattern`,
  `composition.pattern`, `layout`, `sections`, `bullets`, `objects`, `theme`.
- Every text-bearing object must carry explicit `style.font_size` and
  `style.color`.
- Every line object must carry `content.x1`, `content.y1`, `content.x2`,
  `content.y2` and explicit `style.line`/`style.line_width`.
- Every shape object must carry `content.shape`, `style.fill`, and
  `style.line`.

## Quality Gates

- Production-ready decks must have zero content collisions (verified by
  `pptify-plugin/audit/audit.py`).
- Production-ready decks must have zero text overflows.
- No `classification: "content"` object may use `style.font_size` below 9 pt.

## Asset and Design Boundaries

- Do not copy external fonts, icons, images, or binary assets without explicit
  license metadata and source attribution in `pptify-design/sources.json` or
  `pptify-design/third-party-notices.md`.
- For every new generated deck, load a profile from `pptify-design/sources.json`
    unless a user-provided brand guide or reference PPTX is the primary style
    source. Do not invent a new design template.
- Production-ready decks must record selected profile IDs, source URLs, and
    style lock details in `summary.design_context`.
- Plain white, Calibri-only, bullet-heavy, default-theme PPTX output is a design
    failure even when collision and overflow audits pass.
- Keep source attribution and license metadata attached to any copied or
  adapted design context.

## Rendering Boundary

- The importable `pptify/` core renderer package and `python -m pptify` CLI
  are not present in this workspace snapshot. Use plugin scripts for
  extraction, conversion, design context, image helpers, and audit.
- Do not use obsolete renderer flags (`--provider copilot`, `--prompt`,
  `--prompt-file`, `--model`, `--spec-out`) unless a restored core CLI
  explicitly supports them.
