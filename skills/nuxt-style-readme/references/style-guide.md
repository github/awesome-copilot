# Style guide

How the README reads and renders. Read this before writing prose.

Conventions are split by how much they bend. Strong defaults hold unless the repository gives you a reason. Conditional patterns depend on a condition you can check. Repository-specific decisions are yours to make from evidence. The last group never applies. In order: voice, prose, headings, code blocks, links, and license wording, then opening chrome, emoji, tables, diagrams, and alerts, then the repository-specific list, then the avoid list.

## Strong defaults

### Voice

Write for a competent developer who has never seen this project. Explain what they cannot infer and skip what they can.

Second person for instructions. Present tense for behavior: "The build refuses to write the file if a check fails", not "will refuse". State facts directly and let them carry their own weight. If something is genuinely good, the specific detail proves it better than the adjective.

### Prose

- One idea per paragraph. Two to four sentences is the working range. A single strong sentence is often enough.
- Prefer a concrete noun to an abstraction. "Keychain entry" beats "credential storage mechanism".
- Cut phrases that add no information: "simply", "just", "of course", "as you can see", "it is worth noting that".
- Cut sentences that restate the heading.
- The dash and semicolon rules are fixed in `SKILL.md` and are not repeated here.
- Write in the language of the repository's existing documentation. For English, use American spelling unless the existing README is consistently spelled otherwise.

### Headings

Title case for H2 section names: `Quick Start`, `How It Works`, `Next Steps`, `Project Structure`.

H2 sections take one leading emoji and a space. `Features`, `Why?`, and `Background` are the exceptions, as fixed in `SKILL.md`.

H3 and below stay plain. `### Theming`, `### Naming`, `### How it fits together`, `### Releasing`. No emoji, and sentence case is fine at this level.

Pick a heading pattern once and hold it for the whole document.

### Code blocks

Always tag the language. Use `text` for output, trees, and diagrams that are not code.

Show the command a reader would actually type. When a block lists several commands, align trailing comments into a column:

````markdown
```bash
bun install         # install dependencies and set up git hooks
bun run lint        # type-checked ESLint
bun test            # run the test suite
bun run build       # bundle src/ into dist/
```
````

Introduce every code block with one short lead-in sentence, ending in a period, or in a colon when the block completes the sentence. Longer explanation goes after the block, so a reader scanning for the install line hits it immediately.

### Links

Relative links for anything inside the repository, in `./path` form. GitHub resolves these against the current branch, and they survive a clone. Paths resolve from the directory holding the README, not the repository root. A README in `packages/core/` links its own source as `./src/index.ts` and the repository license as `../../LICENSE`.

```markdown
[`scripts/build.ts`](./scripts/build.ts)
```

External links point at the most specific page that answers the reader's question, not the product homepage. Link the first meaningful mention of an external tool, format, or standard, then use the bare name afterward. A linked feature label counts as that first mention, so the bullet's own sentence and later prose use the bare name. Do not link the same target repeatedly. A Next Steps entry may point at a target that was already linked earlier, because every entry in that list is a link by design.

Never link a file that does not exist.

### License wording

One line when the license is simple and the repository owns everything in it:

```markdown
Licensed under the [MIT license](./LICENSE) © Jonathan Russ.
```

Two parts when third party terms apply. State the code license first, then draw the boundary explicitly:

```markdown
The tooling and wrapper code in this repository is [MIT licensed](./LICENSE).

That license covers the code only. It grants no rights to <asset>, which is
<terms> and governed by the [<name> license](url).
```

Name the copyright holder from the LICENSE file, never from a guess.

## Conditional patterns

### Opening chrome

A banner, badges, and Documentation or Playground bullets open the README only when the repository provides them. The inclusion tests are fixed in `SKILL.md`. The format, adapted from the Nuxt module family:

```markdown
[![<name> banner](./.github/assets/banner.png)](<docs site url>)

[![npm version][npm-version-src]][npm-href]
[![npm downloads][npm-downloads-src]][npm-href]
[![License][license-src]][license-href]

# <Title>

<One sentence.>

- [📖 &nbsp;Documentation](<docs site url>)
- [👾 &nbsp;Playground](./playground)
```

Badge images use the reference style, one badge per source line, with the definitions collected at the bottom of the file under a `<!-- Badges -->` comment:

```markdown
<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/<package>/latest.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-downloads-src]: https://img.shields.io/npm/dm/<package>.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-href]: https://npmjs.com/package/<package>
[license-src]: https://img.shields.io/npm/l/<package>.svg?style=flat&colorA=18181B&colorB=28CF8D
[license-href]: ./LICENSE
```

The banner links to the documentation site when one exists, otherwise it stands plain. The badge set is npm version, npm downloads, and license, with the license badge only when a LICENSE file exists. The same three-badge set maps to other registries through the matching shields endpoints, `pypi/v`, `pypi/dm`, and `pypi/l` for a Python package and `crates/v`, `crates/d`, and `crates/l` for a Rust crate, with the same style parameters. An ecosystem badge, such as the Nuxt badge on a Nuxt module, is a repository-specific decision. `colorB` may take the project's accent color. Each bullet's link text is the emoji, a space, a `&nbsp;` entity, then the label, exactly as shown.

### Emoji for H2 headings

Pick for meaning, not decoration. Most rows come from the house repositories, the rest extend the same logic to sections those repositories have not needed yet, and reusing them keeps repositories recognizable as one family:

| Emoji | Section                                                  |
| ----- | -------------------------------------------------------- |
| 📋    | Prerequisites                                            |
| 🚀    | Quick Start, Install                                     |
| 💻    | Usage, for libraries and packages                        |
| 🧪    | Usage, for CLIs, applications, and scripts               |
| 📦    | Examples, Project Structure, packaging, archive contents |
| ⚙️    | Configuration, Settings                                  |
| 🔧    | How It Works                                             |
| 🏗️    | Architecture                                             |
| 🗂️    | Project Structure, when 📦 is already taken              |
| 🔐    | Secrets, credentials, license keys, security             |
| 🔑    | Keys and tokens, when 🔐 is already taken                |
| 🎨    | Icons, themes, visual assets                             |
| 🩹    | Troubleshooting                                          |
| ⚠️    | Limitations                                              |
| 🛠️    | Development                                              |
| ⛰️    | Next Steps                                               |
| ⚖️    | License                                                  |

For a section not on this list, choose an emoji a reader recognizes instantly and can connect to the heading without thinking. Avoid anything abstract, ornamental, or clever.

One emoji per H2. Uniqueness is counted within a list, not across the document: no emoji appears twice among the H2 headings, and none appears twice among the feature bullets. A bullet may carry the same emoji as an H2.

### Tables

Use a table when a reader will scan rather than read, and when every row has the same shape. Three or more parallel items is the usual threshold.

Good uses: option and default and effect, symptom and fix, alias and command, package and prefix, stage and responsibility, folder and purpose.

Keep cells short. A cell running past roughly one line means the content wanted prose or its own subsection. Center a column only when its values are short markers.

### Flow diagrams

When a project is a pipeline and the stage names carry the explanation, a plain diagram beats a paragraph:

````markdown
```text
Interceptor ─────── captures the composition response
        │
Extractor ───────── enumerates referenced assets
        │
Downloader ──────── fetches them in parallel
        │
Composer ────────── assembles combined.glb
```
````

Every stage gets a short description on its own line. Use this only when the flow is genuinely linear. It does not survive branching.

Annotated file trees follow the same rule. Every line earns a comment or the tree is decoration.

### GitHub alerts

The five supported types, with GitHub's own definitions:

| Type        | GitHub's definition                                                      |
| ----------- | ------------------------------------------------------------------------ |
| `NOTE`      | "Useful information that users should know, even when skimming content." |
| `TIP`       | "Helpful advice for doing things better or more easily."                 |
| `IMPORTANT` | "Key information users need to know to achieve their goal."              |
| `WARNING`   | "Urgent info that needs immediate user attention to avoid problems."     |
| `CAUTION`   | "Advises about risks or negative outcomes of certain actions."           |

Syntax is a blockquote whose first line is the bracketed type in capitals:

```markdown
> [!IMPORTANT]
> Key information users need to know to achieve their goal.
```

GitHub's stated limits, quoted: "Use alerts only when they are crucial for user success and limit them to one or two per article to prevent overloading the reader. Additionally, you should avoid placing alerts consecutively." Also: "Alerts cannot be nested within other elements."

Default to one or two per README. More are justified only when every alert independently passes the crucial-for-success test and no two sit adjacent. The longest README in this family carries four.

Choose the type by consequence, not by emphasis. A legal or licensing constraint is `IMPORTANT`. An action that can destroy data or expose a secret is `CAUTION`. Something that breaks the install for everyone is `WARNING`. A convenience is `TIP`. Context is `NOTE`.

If the point needs several paragraphs or a list, it needs a section, not an alert.

These rules were recorded from GitHub's documentation when this skill was written. Confirm them against the live page before relying on them, and say so if you could not.

## Repository-specific decisions

Decide these from the repository, not from a rule:

- Whether the title is the package name or a product name. Publishable packages use the exact package name so a reader can match it against what they install.
- Which section carries the domain. Every repository has one or two areas that do not fit a generic heading, and naming them well is what makes the README feel written rather than generated.
- Where the depth goes. Some projects need a long configuration table and a two-line usage section. Others are the reverse.
- Whether a diagram, a table, or a paragraph explains a thing best.
- How much a contributor needs. A library with a release process needs more than a userscript.
- Which emoji fits a section this list does not cover.

## Avoid

A final sweep before you finish. The chrome inclusion tests live in `SKILL.md`, and the formats are under Opening chrome above.

- A table of contents. GitHub generates an outline from the headings.
- HTML anchor tags around headings. GitHub already generates anchors.
- "Powerful", "modern", "blazing fast", "seamless", "robust", "smart", "advanced", "flexible", "optimized", "easy to use", "out of the box", and "leverage" as a verb, unless the surrounding sentence makes the concrete meaning explicit.
- Sections whose only content is a link to another section.
- Explaining what a reader of this project already knows. A Rust crate's README does not explain what Cargo is.
- Filler transitions: "In this section we will", "Let's dive in", "Now that we have covered".
- Long unbroken prose where a table or list would be scanned instead of read.
- Making it longer to make it look finished.
