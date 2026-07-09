# Arch Plugin

Architecture and modernization toolkit for locally-cloned repositories. It produces a single, cited architecture document from the code on disk, and generates a phased modernization plan that automatically runs the research step first when no architecture document exists yet.

## Installation

```bash
copilot plugin install arch@awesome-copilot
```

## What's Included

### Skills

- **`arch:document`** — Produce one comprehensive, verifiable architecture document for a repository you already have checked out locally. Works from the local checkout only (no remote API calls), cites every claim to a file + line, flags unverified facts, resolves contradictions, and deep-dives the most complex subsystems. Ideal for onboarding docs and system-design maps.
- **`arch:modernize`** — Generate a phased modernization plan for a legacy codebase. If a current architecture document exists it builds on it; otherwise it first runs the `arch:document` workflow to produce one, then continues to the plan. Produces per-feature migration docs, tech-stack recommendations with ADRs, and an adaptive, safety-laddered phased implementation plan.

## Source

This plugin is part of [Awesome Copilot](https://github.com/github/awesome-copilot).

## License

MIT
