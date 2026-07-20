# BrainMax Canvas

BrainMax Canvas is the interactive dashboard for codebase-grounded concept-mastery quizzes. It presents detected knowledge domains, accepts freeform answers, shows rubric scores, and compiles completed domains into a competency report.

The Canvas is an optional visual layer. Question generation and scoring stay with the [BrainMaxxing Agent Skills](https://gh.io/brainmaxxing/skills), and the skills continue to work in clients without Canvas support.

![BrainMax domain selection](assets/preview.png)

## Install

Install the Brainmax Canvas extension through GitHub Copilot or place this directory at `.github/extensions/brainmax-canvas/` in a project. For a project-scoped installation, install the extension's dependencies:

```bash
cd .github/extensions/brainmax-canvas
npm install
```

Install the companion Brainmaxxing Agent Skills separately:

```bash
npx skills add juliamuiruri4/brainmaxxing
```

**Reload your extensions and skills.**

## How to use

1. In a new agent session, invoke `/brainmax` in a repository.
1. Wait while BrainMax detects the knowledge domains represented in the codebase, and opens the Canvas.
1. Select a domain in the Canvas.
1. Answer each code-grounded question in the Canvas. Answers are relayed to the active session for scoring.
1. Pick another domain or compile a cross-domain report.

## Architecture

- `extension.mjs` declares the Canvas and validates state transitions.
- `lib/state.mjs` owns per-instance quiz state and score-tier helpers.
- `lib/http-server.mjs` serves the UI and streams state over server-sent events.
- `public/` contains the dependency-free browser interface.

## License

MIT
