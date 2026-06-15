# researcher

## purpose

Step-by-step workflow for fleshing out any stub micro-expert. Use this when the user says "research expert X" or when you encounter a stub that needs content.

## how to identify a stub

A file is a stub if its `## instructions` section contains only a web-search placeholder and its `## rules` section is missing or empty.

## workflow

### step 1 — read the stub

Read the target expert file. Locate its `## research` section and extract the Deep Research prompt.

### step 2 — execute research

Run the Deep Research prompt as a series of web searches:

1. Break the prompt into discrete topics (each SDK concept, API surface, or pattern mentioned).
2. Search for each topic individually. Prefer:
   - Official documentation (`learn.microsoft.com`, `api.slack.com`, SDK GitHub repos)
   - SDK source code and type definitions
   - Recent blog posts or guides (add current year to query if results are stale)
3. For each search, capture: API signatures, parameter types, return types, default values, and gotchas.

### step 3 — synthesize into canonical sections

Replace the stub content with real content using these sections:

- **`## rules`** — Numbered list of do/don't rules derived from the research. Each rule should be actionable (e.g., "Always call `ack()` before async work" not "ack is important").
- **`## patterns`** — Code snippets (TypeScript) showing canonical usage. Use fenced code blocks. Keep each snippet minimal and focused on one concept.
- **`## pitfalls`** — Common mistakes, breaking changes, or version-specific gotchas.
- **`## references`** — URLs to official docs, SDK source, or authoritative blog posts used during research.

### step 4 — update instructions section

Replace the `## instructions` placeholder content with a concise summary of what the expert covers and when to use it. This is the "quick reference" an agent reads first.

### step 5 — preserve the research prompt

Keep the `## research` section intact with the original Deep Research prompt. This allows future re-research if the SDK changes.

### step 6 — rollup to domain index

Open the domain's `index.md` and verify:

1. The expert file appears in the correct task cluster's `Read:` list.
2. The `When:` description for that cluster still accurately reflects the expert's content (update if the scope changed during research).
3. The expert file appears in the `## file inventory` list.

## quality checks

- Every `## rules` entry must cite a source (doc link or SDK behavior).
- Every `## patterns` code snippet must be valid TypeScript that compiles in isolation (imports included).
- No fabricated API signatures — if you cannot confirm a signature, note it as unverified.
- Keep the total file under 300 lines. Split into multiple experts if it grows larger.
