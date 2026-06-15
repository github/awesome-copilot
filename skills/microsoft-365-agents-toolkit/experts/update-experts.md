# update-experts

## purpose

Scan the `.experts/` directory tree, detect expert files that were added or removed since the index files were last updated, and reconcile every `index.md` to match the actual file system.

## rules

1. **Scan the full directory tree first.** Walk every folder under `.experts/` and collect all `.md` files. Separate them into three categories: index files (`index.md`), utility files (root-level system files like `builder.md`, `analyzer.md`, `fallback.md`, `update-experts.md`), and expert files (everything else that isn't prefixed with `_`).
2. **Build the expected inventory from the file system.** For each domain folder (`tools/`, `languages/`, `languages/{lang}/`, `.project/`), list every expert `.md` file present on disk (excluding `index.md`). This is the source of truth.
3. **Build the registered inventory from each index file.** Parse each domain's `index.md` to extract: (a) the `## file inventory` list and (b) expert filenames referenced in `Read:` or `→ Read` directives within `## task clusters`. This is what the routing system currently knows about.
4. **Diff the two inventories per domain.** Identify: (a) **New experts** — files on disk not in the index, (b) **Removed experts** — files in the index not on disk, (c) **Orphaned references** — `Read:` directives pointing to files that don't exist.
5. **For each new expert, read the file to extract routing metadata.** Open the new expert file and extract: the `# title` line, the `## purpose` line, trigger phrases from `## instructions`, and any `When:` signal words. This metadata is needed to write the index entry.
6. **Update domain `index.md` files for new experts.** For each new expert: (a) Add a task cluster entry under `## task clusters` with a `When:` line derived from the expert's trigger phrases and a `→ Read` directive pointing to the file. (b) Add the filename to `## file inventory` in alphabetical order.
7. **Update domain `index.md` files for removed experts.** For each removed expert: (a) Delete its task cluster entry from `## task clusters`. (b) Remove the filename from `## file inventory`. (c) Remove any `Depends on:` references to it from other clusters.
8. **Update the root `index.md` for signal word changes.** After updating domain indexes, check if new experts introduced signal words not already present in the root `index.md` routing rules for that domain. Add them. Similarly, remove signal words that only belonged to a now-deleted expert.
9. **Update the root `index.md` utilities section.** If a new root-level utility file was added (not inside a domain folder), add it to `## utilities` with a `→ Read` directive, signals line, and one-line description. If a utility was removed, delete its entry.
10. **Handle language sub-domains.** Languages have a two-level structure: `languages/index.md` routes to `languages/{lang}/index.md`, which routes to individual expert files. New language folders need entries in `languages/index.md`. New expert files within a language folder need entries in that language's `index.md`.
11. **Detect new domain folders.** If a folder exists under `.experts/` that contains an `index.md` but has no routing entry in the root `index.md`, flag it as a new domain and add a routing entry with signals derived from its `index.md` purpose and task clusters.
12. **Detect orphaned domain folders.** If the root `index.md` references a domain folder that doesn't exist on disk, remove the routing entry and warn the developer.
13. **Never modify expert files themselves.** This utility only touches `index.md` files. Expert content, rules, patterns, and instructions are never altered.
14. **Report all changes.** After updating, output a structured summary showing: files scanned, new experts wired, removed experts unwired, signal words added/removed, and any warnings (orphaned references, missing metadata).

## workflow

### phase 1 — scan

1. List all folders under `.experts/` recursively.
2. For each folder, list all `.md` files.
3. Categorize every file: index, utility, or expert.
4. Build the file-system inventory: `{ domain → [expert files] }`.

### phase 2 — parse indexes

1. Read every `index.md` file found in phase 1.
2. Extract registered experts from `## file inventory` and `Read:` / `→ Read` directives.
3. Build the index inventory: `{ domain → [registered files] }`.

### phase 3 — diff

1. For each domain, compute:
   - `added = filesystem - index`
   - `removed = index - filesystem`
   - `orphaned_refs = Read directives pointing to missing files`
2. For root-level files, compare against `## utilities` in the root `index.md`.

### phase 4 — gather metadata for new experts

1. For each file in `added`, read the expert file.
2. Extract: title, purpose, trigger phrases from `## instructions`, signal words.
3. If the expert lacks `## instructions` or trigger phrases, derive signal words from the title and purpose.

### phase 5 — update indexes

1. Apply additions and removals to each domain `index.md`:
   - Add/remove task cluster entries.
   - Add/remove file inventory entries.
   - Clean up `Depends on:` / `Cross-domain deps:` references to removed files.
2. Apply signal word changes to root `index.md` routing rules.
3. Apply utility additions/removals to root `index.md` `## utilities` section.

### phase 6 — report

Output a structured summary:

```
## Update Report

### Scanned
- Domains: {count}
- Expert files: {count}
- Index files: {count}

### Changes
#### New experts wired
- {domain}/index.md ← {filename} (signals: {words})

#### Removed experts unwired
- {domain}/index.md → {filename} removed

#### Signal words updated
- Root index.md: added {words} to {domain} signals
- Root index.md: removed {words} from {domain} signals

#### Utilities updated
- Root index.md: added {filename} to utilities
- Root index.md: removed {filename} from utilities

### Warnings
- {any orphaned references, missing metadata, etc.}

### No changes needed
- {domains where filesystem matches index}
```

## patterns

### Parsing file inventory from an index

```
# File inventory formats to recognize:

# Pipe-delimited (tools/index.md style):
# git.md | json-yaml.md | prompt-engineer.md
→ Split on ` | `, strip backticks

# Backtick-delimited (languages/typescript/index.md style):
# `idioms.md` | `patterns.md` | `pitfalls.md` | `type-system.md`
→ Split on ` | `, strip backticks

# Comment placeholder (.project/index.md style):
# <!-- empty — populated by analyzer.md + builder.md -->
→ Empty list
```

### Parsing Read directives from task clusters

```
# Single-file directive (tools style):
# → Read `.experts/tools/git.md`
→ Extract path, derive filename: git.md

# Multi-file directive (language sub-domain style):
# Read:
# - `idioms.md`
# - `patterns.md`
→ Extract each filename from bullet list

# Domain-level directive (root index.md style):
# → Read `.experts/languages/index.md`
→ This points to an index, not an expert — skip when inventorying experts
```

### Deriving signal words from an expert file

```
# Priority order for extracting signals:

1. ## instructions → "Trigger phrases:" line
   → Parse the comma-separated quoted phrases

2. ## interview → question text
   → Extract domain-specific keywords

3. ## purpose → one-line description
   → Extract nouns and noun phrases

4. # title → filename stem
   → Use as a last-resort signal word
```

## pitfalls

- **Confusing index files with expert files.** Every domain has an `index.md` that is a router, not an expert. Never add `index.md` to a file inventory or create a task cluster pointing to an index within its own domain.
- **Missing the two-level language structure.** `languages/index.md` routes to `languages/{lang}/index.md`, which routes to expert files. A new file in `languages/python/` must update `languages/python/index.md`, not `languages/index.md` directly. A new language folder must update `languages/index.md`.
- **Overwriting hand-crafted cluster descriptions.** When adding a new expert to an existing index, don't rewrite the existing task clusters. Only add the new entry and update the file inventory.
- **Duplicating signal words in root index.** Before adding signal words to a domain's entry in the root `index.md`, check that those words don't already appear in another domain's signals. Duplicate signals cause ambiguous routing.
- **Forgetting locked files.** `*.locked.md` files are valid experts that should appear in indexes. Don't skip them during scanning — they route identically to unlocked files.
- **Treating `_prefixed.md` files as experts.** Files starting with `_` are system/template files, not routable experts. Exclude them from inventory and index updates.

## instructions

Use this expert when the developer wants to synchronize the routing indexes with the actual expert files on disk. This is the maintenance counterpart to `builder.md` — the builder creates experts, this utility ensures the routing system reflects what exists.

**Trigger phrases:** "update experts," "sync indexes," "update index," "refresh routing," "fix index files," "new experts not routed," "clean up indexes," "reconcile experts."

Pair with: `builder.md` (run update-experts after bulk expert creation to wire everything at once). Pair with: `analyzer.md` (run update-experts after the analyzer recommends and creates project experts).

## research

Deep Research prompt:

"Write a meta-expert for maintaining a modular AI expert routing system's index files. Cover: recursive directory scanning to discover expert files, parsing index.md files to extract registered file inventories and Read directives, diffing filesystem state against index state, extracting routing metadata (signal words, trigger phrases) from expert files, updating multi-level index hierarchies (root router, domain routers, sub-domain routers), handling additions and removals symmetrically, managing signal word propagation from domain indexes to root index, reporting changes in a structured format, and common maintenance pitfalls (index/expert confusion, two-level language routing, locked files, underscore-prefixed system files, duplicate signal words across domains)."
