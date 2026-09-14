# Section rules

Which sections a README gets, in what order, and how each one is named.

Read this before choosing an outline. Each section below has an inclusion test stated as something you can check in the repository. If the test does not pass, the section does not exist.

Most READMEs land at six to nine H2 sections. A small script or single-purpose CLI can be complete at four.

## Default order

Skip any section the repository does not earn. Do not reorder without a reason.

| Order | Section                                                                                                  | Canonical heading                                            |
| ----- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1     | Opening block: chrome and links when the repository provides them, title, description, at most one alert | `# Title`                                                    |
| 2     | Why?                                                                                                     | `## Why?`                                                    |
| 3     | Features                                                                                                 | `## Features`                                                |
| 4     | Background                                                                                               | `## Background`                                              |
| 5     | Prerequisites                                                                                            | `## 📋 Prerequisites`                                        |
| 6     | Quick Start or Install                                                                                   | `## 🚀 Quick Start` / `## 🚀 Install`                        |
| 7     | Usage                                                                                                    | `## 💻 Usage` / `## 🧪 Usage`                                |
| 8     | Examples                                                                                                 | `## 📦 Examples`                                             |
| 9     | Configuration                                                                                            | `## ⚙️ Configuration` / `## ⚙️ Settings`                     |
| 10    | Domain sections                                                                                          | project-specific, floats anywhere from Usage down, see below |
| 11    | How It Works or Architecture                                                                             | `## 🔧 How It Works` / `## 🏗️ Architecture`                  |
| 12    | Project Structure                                                                                        | `## 📦 Project Structure`                                    |
| 13    | Troubleshooting                                                                                          | `## 🩹 Troubleshooting`                                      |
| 14    | Limitations                                                                                              | `## ⚠️ Limitations`                                          |
| 15    | Development                                                                                              | `## 🛠️ Development`                                          |
| 16    | Next Steps                                                                                               | `## ⛰️ Next Steps`                                           |
| 17    | License                                                                                                  | `## ⚖️ License`                                              |

`Why?` sits before `Features` because it frames the problem the features answer. `Background` sits after, because it is context you need once you know what the thing is. The house repositories have no `Why?` yet, so its position is a chosen convention rather than observed evidence.

No emoji may appear on two H2 headings in the same README. If `Examples` and `Project Structure` both exist, `Examples` keeps `📦` and `Project Structure` takes `🗂️`.

## Features

**Include when** the project exposes capabilities a user can name. That covers almost every tool, library, package, application, CLI, and script.

**Omit when** the project exposes a single capability, where the one-sentence description already is the feature list. Two or more nameable capabilities earn the section even when the description mentions them all.

## Why?

**Include when** a reader who understands what the project is would still ask why it exists. Useful when the project competes with an obvious alternative, or solves a problem whose difficulty is not visible.

**Omit when** the answer is already obvious from the description, or when it would restate the feature list in paragraph form.

## Background

**Include when** the reader needs historical, ecosystem, or problem context before the implementation makes sense. Typical for projects built on an undocumented API, a format quirk, or a constraint imposed from outside.

**Omit when** `Why?` already carries the context. These two overlap heavily. Use both only when one explains motivation and the other explains circumstances, and neither can absorb the other.

## Prerequisites

**Include when** the user must have something in place before the install command will work: an account, a credential, a license key, a service, a permission, specific hardware, a supported platform, or a runtime the install step does not provide.

**Omit when** the only requirement is the language runtime that the install command already implies. `npm install` does not need a bullet telling the reader to install Node.js. When that is the only requirement, do not restate the runtime as prose elsewhere either, since a version floor from `engines` is documentation the manifest already carries.

Keep it to a short bullet list. Mark genuinely optional items as optional.

## Quick Start and Install

**Include one of them always.** A README without a path to running the thing has failed.

Default to `Quick Start`, and put the primary command in the first code block. Reach for `Install` only when installation is substantial enough that mixing it with first use would obscure both.

**Never create both** when they would share most of their content. Pick the one that fits and let it carry the whole path.

Optimize for time to first success. Explanation goes after the command, not before it.

## Usage

**Include when** the reader needs more than the first command to operate the project normally.

**Omit when** Quick Start already showed the entire surface area.

Use `## 💻 Usage` for libraries and packages, where usage means code the reader writes. Use `## 🧪 Usage` for CLIs, applications, scripts, and userscripts, where usage means commands or actions the reader performs.

Every example must be real. Take imports, exports, flags, and signatures from the source or the manifest.

## Examples

**Include when** the repository contains examples a user can actually open: an `examples/` directory, a playground, a demo application, a hosted sandbox, or a runnable sample.

**Omit when** there are none. Test fixtures are not examples. A section that links to nothing is worse than no section.

Link directly to each example and say in a few words what it demonstrates. Format each entry as `- [Example name](./path): what it demonstrates`.

## Configuration

**Include when** the user can meaningfully change how the project behaves through options, environment variables, a config file, or settings.

**Omit when** configuration is internal, or when a single option is better explained inline where it is used.

Document the options that matter. Do not transcribe an entire schema. A table of key, default, and effect scans better than prose once there are more than about three options.

## Domain sections

The strongest READMEs in this style carry one to three sections named for what the project actually does: `## 🔐 Managing Secrets`, `## 🎨 Icons`, `## 📦 ZIP Structure`, `## 🔐 License key`.

**Include when** a meaningful part of the project does not fit any generic heading. Name the section after the thing, pick an emoji that fits its meaning, and place it where a reader would need it.

A domain section never absorbs content that passes a generic inclusion test. Context that fits `Background` goes to `Background`, and a domain section carries what no generic heading fits.

This is what keeps the style from reading as a template.

## How It Works and Architecture

**Include when** understanding the internal flow changes how someone uses or contributes to the project.

Use `How It Works` for a conceptual explanation aimed at users. Use `Architecture` for structural documentation aimed at contributors.

**Omit when** the internals are ordinary. Do not expose implementation detail because it exists.

## Project Structure

**Include when** the repository has a layout a contributor could not infer, and the tree explains something.

**Omit when** the folders are self-explanatory. `src/`, `tests/`, and `docs/` need no annotation.

Annotate every line with what it is for. An unannotated tree is decoration.

## Troubleshooting

**Include when** the repository shows evidence of real failure modes: known issues, error handling with specific messages, compatibility caveats, retry logic, or existing troubleshooting notes.

**Omit when** you would be inventing problems. Never speculate about failures.

Use a table of symptom and fix. The symptom is what the user sees, the fix is what they do next.

## Limitations

**Include when** the project has constraints someone should understand before depending on it: unsupported cases, formats that may change, scope boundaries, or known incompleteness.

**Omit when** there is nothing honest to say.

State them plainly. A limitation written as a feature is a lie with extra steps. A workaround does not demote a constraint: state the constraint here and let `Troubleshooting` carry the recovery step.

## Development

**Include when** the repository is meant to be worked on and has commands worth listing: a test suite, a build, linting, a release process.

**Omit when** the project is a single file with no tooling.

Every command must exist in the manifest scripts, the CI workflow, or tooling the repository declares, such as a Makefile target or a tool configured in the manifest. Contributor-facing detail belongs here and below, not mixed into the user-facing sections above.

Plain H3 subsections work well here: how the pieces fit together, how to add a thing, how to release.

A repository with a `CONTRIBUTING.md` gets a link from this section, not a standalone Contributing section. A standalone section is earned only by real content that no `CONTRIBUTING.md` carries. Support and acknowledgment material folds into `Next Steps` or the introduction rather than taking its own heading.

## Next Steps

**Include when** there is a real progression after setup: something to read, something to try, something to extend.

**Omit when** the entries would only relink sections the reader just passed.

Use an ordered list, most useful action first, usually with one fitting emoji per item. Ending with an invitation to open an issue is a good close.

## License

**Include when** the repository has a LICENSE file, a `license` field in its manifest, or licensing that materially affects use.

Use the actual license. Read the LICENSE file. A manifest that declares a license without shipping a LICENSE file still licenses the project, so name that license, link nothing, and leave the copyright holder out, because no file names one. `UNLICENSED` in a manifest means the opposite: the project is not licensed for reuse. Never infer a license from anything else.

When third party assets, data, APIs, or paid content carry different terms than the code, say so in a separate sentence or paragraph and make the boundary explicit.

If there is no license, do not imply the project is open source. Saying the project is unlicensed is more useful than saying nothing.
