# Polyglot Test Agent Plugin

Multi-agent pipeline for generating comprehensive unit tests across any programming language. Orchestrates research, planning, and implementation phases using specialized agents to produce tests that compile, pass, and follow project conventions.

## Installation

```bash
# Using Copilot CLI
copilot plugin install polyglot-test-agent@awesome-copilot
```

## What's Included

### Agents

| Agent | Description |
|-------|-------------|
| `polyglot-test-generator` | Orchestrates comprehensive test generation using Research-Plan-Implement pipeline. Use when asked to generate tests, write unit tests, improve test coverage, or add tests. |
| `polyglot-test-researcher` | Analyzes codebases to understand structure, testing patterns, and testability. Identifies source files, existing tests, build commands, and testing framework. |
| `polyglot-test-planner` | Creates structured test implementation plans from research findings. Organizes tests into phases by priority and complexity. |
| `polyglot-test-implementer` | Implements a single phase from the test plan. Writes test files and verifies they compile and pass. |
| `polyglot-test-builder` | Runs build/compile commands for any language and reports results. |
| `polyglot-test-tester` | Runs test commands for any language and reports results. |
| `polyglot-test-fixer` | Fixes compilation errors in source or test files. |
| `polyglot-test-linter` | Runs code formatting/linting for any language. |

### Commands (Slash Commands)

| Command | Description |
|---------|-------------|
| `/polyglot-test-agent:unit-test-generation` | Best practices and guidelines for generating comprehensive, parameterized unit tests with 80% code coverage across any programming language |

### Skills

| Skill | Description |
|-------|-------------|
| `polyglot-test-agent` | Generates comprehensive, workable unit tests for any programming language using a multi-agent pipeline. Supports C#, TypeScript, JavaScript, Python, Go, Rust, Java, and more. |

## Supported Languages

- C# / .NET (MSTest, xUnit, NUnit)
- TypeScript / JavaScript (Jest, Vitest, Mocha)
- Python (pytest, unittest)
- Go (testing)
- Rust (cargo test)
- Java (JUnit, Maven, Gradle)

## How It Works

The plugin coordinates specialized agents in a **Research → Plan → Implement** pipeline:

1. **Research** — Analyzes the codebase to detect language, framework, testing patterns, and build commands
2. **Plan** — Creates a phased implementation plan organized by priority and complexity
3. **Implement** — Writes test files phase by phase, verifying compilation and test passage at each step

## Source

This plugin is part of [Awesome Copilot](https://github.com/github/awesome-copilot), a community-driven collection of GitHub Copilot extensions.

## License

MIT
