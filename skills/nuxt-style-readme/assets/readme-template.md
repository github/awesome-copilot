# README template

A skeleton of optional parts, not a form to fill in. Read it when building a README from nothing or substantially restructuring one. Skip it for targeted edits.

How to use it:

1. Delete every section the repository does not earn. Check each one against `references/section-rules.md`.
2. Keep the order of what remains.
3. Replace every `<placeholder>` with something you read in the repository. If you cannot, delete the line. A placeholder filled with a plausible guess is worse than a missing section.
4. Delete every `<!-- -->` comment. They are instructions to you, not content. The one exception is the `<!-- Badges -->` marker at the bottom, which is content and stays whenever badges are used.
5. Rename and re-emoji headings to fit the project. `⚙️ Configuration` may be `⚙️ Settings`. `🎨 Icons` may be anything the project is actually about.

---

<!-- Banner and badges only when the repository provides them. Delete otherwise.
     Formats and badge definitions live in references/style-guide.md. -->

[![<name> banner](<in-repo asset path>)](<docs site url>)

[![npm version][npm-version-src]][npm-href]
[![npm downloads][npm-downloads-src]][npm-href]
[![License][license-src]][license-href]

# <Title>

<!-- Package name for a publishable package, product name otherwise. -->

<One sentence saying what this is and who it is for.>

<!-- Only when the targets exist. Delete otherwise. -->

- [📖 &nbsp;Documentation](<docs site url>)
- [👾 &nbsp;Playground](<path or url>)

<!-- At most one alert, only for a legal, safety, or scope caveat. Delete otherwise.
     For private or license-constrained projects the alert can replace the sentence above. -->

> [!IMPORTANT]
> <Constraint that changes how someone may use this project.>

## Why?

<!-- Only when a reader would still ask why this exists. One or two short paragraphs.
     Do not use both Why? and Background unless they say genuinely different things. -->

## Features

<!-- No emoji on this heading. One emoji on every bullet. About four to fifteen
     bullets, more only when genuinely earned. -->

- <emoji> **<Capability>:** <One short present-tense sentence stating what it does for the reader.>
- <emoji> **<Capability>:** <One short present-tense sentence stating what it does for the reader.>
- <emoji> **<Capability>:** <One short present-tense sentence stating what it does for the reader.>

## Background

<!-- Only when context is needed before the implementation makes sense. -->

## 📋 Prerequisites

<!-- Only for things the install step does not provide: accounts, credentials,
     licenses, services, platforms, hardware. Not the language runtime. -->

- <Requirement, with a link where one helps.>
- <Requirement.>
- Optional: <Requirement that only some users need.>

## 🚀 Quick Start

<!-- Or "🚀 Install" when installation is substantial enough to stand alone.
     Never both when they would overlap. The primary command comes first. -->

```<lang>
<the one command that gets someone from nothing to working>
```

<What happens next, and what the reader should see.>

<!-- A numbered list works well when the tool then does several things on its own. -->

## 💻 Usage

<!-- 💻 for libraries, 🧪 for CLIs and applications.
     Every example real, taken from the source or the manifest. -->

<One or two sentences of framing.>

```<lang>
<smallest complete example>
```

<Follow-up sentence, then further examples only if they show something new.>

### <Sub-topic>

<!-- Plain H3, no emoji. Use for a distinct aspect of normal use. -->

## 📦 Examples

<!-- Only when runnable examples exist in the repository or are hosted somewhere. -->

- [<Example name>](<path or url>): <what it demonstrates>
- [<Example name>](<path or url>): <what it demonstrates>

## ⚙️ Configuration

<!-- Only the options that matter. A table once there are more than about three. -->

| Option  | Default     | Effect         |
| ------- | ----------- | -------------- |
| `<key>` | `<default>` | <what changes> |

## <emoji> <Domain section>

<!-- The section named for what this project actually is. Usually one to three of them.
     This is what stops the README reading like a template. -->

## 🔧 How It Works

<!-- "🏗️ Architecture" instead when the audience is contributors.
     Only when understanding the internals changes how someone uses or extends it. -->

<Conceptual explanation.>

<!-- A linear pipeline can use a text diagram. Delete if the flow branches. -->

```text
<Stage> ─────── <what it does>
        │
<Stage> ─────── <what it does>
```

## 📦 Project Structure

<!-- Only when the layout is non-obvious. Every line gets a comment.
     🗂️ instead when 📦 is already taken by Examples or a packaging section. -->

```text
<path>          # <purpose>
<path>          # <purpose>
```

## 🩹 Troubleshooting

<!-- Only for failure modes the repository actually shows evidence of. -->

| Symptom              | Fix                 |
| -------------------- | ------------------- |
| <what the user sees> | <what they do next> |

## ⚠️ Limitations

<!-- Only when there are real constraints. Stated plainly, not softened. -->

- <Constraint, and what it means in practice.>

## 🛠️ Development

<!-- Only when the repository is meant to be worked on.
     Every command verified against the manifest scripts or CI. -->

```<lang>
<command>       # <what it does>
<command>       # <what it does>
```

### How it fits together

<!-- Optional. A few bullets mapping the main pieces to their responsibilities. -->

### Releasing

<!-- Optional. Only when there is a real release process. -->

## ⛰️ Next Steps

<!-- Only when there is a genuine progression, not a relink of earlier sections.
     Ordered, most useful first, an emoji per item where one fits. -->

1. <emoji> <Action, linked.>
2. <emoji> <Action, linked.>
3. 🐛 Hit a bug or have an idea? [Open an issue](<issues url>).

## ⚖️ License

<!-- Read the LICENSE file. Never infer. Delete this section if there is no license
     and say nothing that implies the project is open source. -->

Licensed under the [<license name>](./LICENSE) © <copyright holder>.

<!-- When third party terms apply, add a second paragraph drawing the boundary
     between the code license and those terms. -->

<!-- Keep the marker line and definitions below only when badges are used above,
     filled from references/style-guide.md for this package. Delete otherwise. -->

<!-- Badges -->

[npm-version-src]: <badge image url>
[npm-downloads-src]: <badge image url>
[npm-href]: <package registry url>
[license-src]: <badge image url>
[license-href]: ./LICENSE
