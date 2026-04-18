# Real-World CodeTour Examples

Reference this file when you want to see how real repos use CodeTour features.
Each example is sourced from a public GitHub repo with a direct link to the `.tour` file.

---

## microsoft/codetour — Contributor orientation

**Tour file:** https://github.com/microsoft/codetour/blob/main/.tours/intro.tour
**Persona:** New contributor
**Steps:** ~5 · **Depth:** Standard

**What makes it good:**
- Intro step with an embedded SVG architecture diagram (raw GitHub URL inside the description)
- Rich markdown per step with emoji section headers (`### 🎥 Tour Player`)
- Inline cross-file links inside descriptions: `[Gutter decorator](./src/player/decorator.ts)`
- Uses the top-level `description` field as a subtitle for the tour itself

**Technique to copy:** Embed images and cross-links in descriptions to make them self-contained.

```json
{
  "file": "src/player/index.ts",
  "line": 436,
  "description": "### 🎥 Tour Player\n\nThe CodeTour player ...\n\n![Architecture](https://raw.githubusercontent.com/.../overview.svg)\n\nSee also: [Gutter decorator](./src/player/decorator.ts)"
}
```

---

## a11yproject/a11yproject.com — New contributor onboarding

**Tour file:** https://github.com/a11yproject/a11yproject.com/blob/main/.tours/code-tour.tour
**Persona:** External contributor
**Steps:** 26 · **Depth:** Deep

**What makes it good:**
- Almost entirely `directory` steps — orients to every `src/` subdirectory without getting lost in files
- Conversational, beginner-friendly tone throughout
- `selection` on the opening step to highlight the exact entry in `package.json`
- Closes with a genuine thank-you and call-to-action

**Technique to copy:** Use directory steps as the skeleton of an onboarding tour — they teach structure without requiring the author to explain every file.

```json
{
  "directory": "src/_data",
  "description": "This folder contains the **data files** for the site. Think of them as a lightweight database — YAML files that power the resource listings, posts index, and nav."
}
```

---

## github/codespaces-codeql — The most technically complete example

**Tour file:** https://github.com/github/codespaces-codeql/blob/main/.tours/codeql-tutorial.tour
**Persona:** Security engineer / concept learner
**Steps:** 12 · **Depth:** Standard

**What makes it good:**
- `isPrimary: true` — auto-launches when the Codespace opens
- `commands` array to run real VS Code commands mid-tour: the tour literally executes `codeQL.runQuery` when the reader arrives at that step
- `view` property to switch the sidebar panel (`"view": "codeQLDatabases"`)
- `pattern` instead of `line` for resilient matching: `"pattern": "import tutorial.*"`
- `selection` to highlight the exact `select` clause in a query file

**This is the canonical reference for `commands`, `view`, and `pattern`.**

```json
{
  "file": "tutorial.ql",
  "pattern": "import tutorial.*",
  "view": "codeQLDatabases",
  "commands": ["codeQL.setDefaultTourDatabase", "codeQL.runQuery"],
  "title": "Run your first query",
  "description": "Click the **▶ Run** button above. The results appear in the CodeQL Query Results panel."
}
```

---

## github/codespaces-learn-with-me — Minimal interactive tutorial

**Tour file:** https://github.com/github/codespaces-learn-with-me/blob/main/.tours/main.tour
**Persona:** Total beginner
**Steps:** 4 · **Depth:** Quick

**What makes it good:**
- Only 4 steps — proves that less is more for quick/vibecoder personas
- `isPrimary: true` for auto-launch
- Each step tells the reader to **do something** (edit a string, change a color) — not just read
- Ends with a tangible outcome: "your page is live"

**Technique to copy:** For quick/vibecoder tours, cut mercilessly. Four steps that drive action beat twelve that explain everything.

---

## blackgirlbytes/copilot-todo-list — 28-step interactive tutorial

**Tour file:** https://github.com/blackgirlbytes/copilot-todo-list/blob/main/.tours/main.tour
**Persona:** Concept learner / hands-on tutorial
**Steps:** 28 · **Depth:** Deep

**What makes it good:**
- Uses **content-only checkpoint steps** (no `file` key) as progress milestones: "Check out your page! 🎉" and "Try it out!" between coding tasks
- Terminal inline commands in descriptions: `>> npm install uuid; npm install styled-components`
- Each file step shows the exact code the user should accept, in a markdown code fence, so they know the expected output

**Technique to copy:** Checkpoint steps (content-only, milestone title) break up long tours and give the reader a sense of progress.

```json
{
  "title": "Check out your page! 🎉",
  "description": "Open the **Simple Browser** tab to see your to-do list. You should see all three tasks rendering from your data array.\n\nOnce you're happy with it, continue to add interactivity."
}
```

---

## lucasjellema/cloudnative-on-oci-2021 — Multi-tour architecture series

**Tour files:**
- https://github.com/lucasjellema/cloudnative-on-oci-2021/blob/main/.tours/function-tweet-retriever.tour
- https://github.com/lucasjellema/cloudnative-on-oci-2021/blob/main/.tours/oci-and-infrastructure-as-code.tour
- https://github.com/lucasjellema/cloudnative-on-oci-2021/blob/main/.tours/build-and-deployment-pipeline-function-tweet-retriever.tour

**Persona:** Platform engineer / architect
**Steps:** 12 per tour · **Depth:** Standard

**What makes it good:**
- Three separate tours for three separate concerns (function code, IaC, CI/CD pipeline) — each standalone but linked via `nextTour`
- `selection` coordinates used heavily in Terraform files where a block (not a single line) is the point
- Steps include markdown links to official OCI documentation inline
- Designed to be browsed via `vscode.dev/github.com/...` without cloning

**Technique to copy:** For complex systems, write one tour per layer and chain them with `nextTour`. Don't try to cover infrastructure + application code + CI/CD in one tour.

---

## SeleniumHQ/selenium — Monorepo build system onboarding

**Tour files:**
- `.tours/bazel.tour` — Bazel workspace and build target orientation
- `.tours/building-and-testing-the-python-bindings.tour` — Python bindings BUILD.bazel walkthrough

**Persona:** External contributor (build system focus)
**Steps:** ~10 per tour

**What makes it good:**
- Targets a non-obvious entry point — not the product code but the build system
- Proves that "contributor onboarding" tours don't have to start with `main()` — they start with whatever is confusing about this specific repo
- Used in a large, mature OSS project at scale

---

## Technique quick-reference

| Feature | When to use | Real example |
|---------|-------------|-------------|
| `isPrimary: true` | Auto-launch tour when repo opens (Codespace, vscode.dev) | codespaces-learn-with-me, codespaces-codeql |
| `commands: [...]` | Run a VS Code command when reader arrives at this step | codespaces-codeql (`codeQL.runQuery`) |
| `view: "terminal"` | Switch VS Code sidebar/panel at this step | codespaces-codeql (`codeQLDatabases`) |
| `pattern: "regex"` | Match by line content, not number — use for volatile files | codespaces-codeql |
| `selection: {start, end}` | Highlight a block (function body, config section, type def) | a11yproject, oci-2021, codespaces-codeql |
| `directory: "path/"` | Orient to a folder without reading every file | a11yproject, codespaces-codeql |
| `uri: "https://..."` | Link to PR, issue, RFC, ADR, external doc | Any PR review tour |
| `nextTour: "Title"` | Chain tours in a series | oci-2021 (3-part series) |
| Checkpoint steps (content-only) | Progress milestones in long interactive tours | copilot-todo-list |
| `>> command` in description | Terminal inline command link in VS Code | copilot-todo-list |
| Embedded image in description | Architecture diagrams, screenshots | microsoft/codetour |

---

## Discover more real tours on GitHub

**Search all `.tour` files on GitHub:**
https://github.com/search?q=path%3A**%2F*.tour+&type=code

This search returns every `.tour` file committed to a public GitHub repo. Use it to:
- Find tours for repos in the same language/framework as the one you're working on
- Study how other authors handle the same personas or step types
- Look up how a specific field (`commands`, `selection`, `pattern`) is used in the wild

Filter by language or keyword to narrow results — e.g. add `language:TypeScript` or `fastapi` to the query.

---

## Further reading

- **DEV Community — "Onboard your codebase with CodeTour"**: https://dev.to/tobiastimm/onboard-your-codebase-with-codetour-2jc8
- **Coder Blog — "Onboard to new projects faster with CodeTour"**: https://coder.com/blog/onboard-to-new-projects-faster-with-codetour
- **Microsoft Tech Community — Educator Developer Blog**: https://techcommunity.microsoft.com/blog/educatordeveloperblog/codetour-vscode-extension-allows-you-to-produce-interactive-guides-assessments-a/1274297
- **AMIS Technology Blog — vscode.dev + CodeTour**: https://technology.amis.nl/software-development/visual-studio-code-the-code-tours-extension-for-in-context-and-interactive-readme/
- **CodeTour GitHub Topics**: https://github.com/topics/codetour
