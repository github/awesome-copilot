# Project Documenter Plugin

Generate professional project documentation with draw.io architecture diagrams and Word (.docx) output with embedded PNG images. Works on any software project — automatically discovers the technology stack, architecture, and code structure.

## Installation

```bash
# Using Copilot CLI
copilot plugin install project-documenter@awesome-copilot
```

## What It Does

Point the **Project Documenter** agent at any repository and it produces:

1. **Markdown document** — 10-section project summary with embedded diagram references
2. **Draw.io diagrams** — C4 Context, Pipeline, and Component relationship diagrams (`.drawio` + `.drawio.png`)
3. **Word document** — professionally formatted `.docx` with title page, table of contents, and embedded PNG architecture images

## What's Included

### Agent

| Agent | Description |
|-------|-------------|
| `project-documenter` | Generates professional project documentation with draw.io architecture diagrams and Word document output with embedded images. Auto-discovers any project's technology stack and architecture. |

### Skills

| Skill | Description |
|-------|-------------|
| `drawio` | Generate draw.io diagrams as `.drawio` files and export to PNG via bundled Node.js script (uses draw.io CLI or headless browser) |
| `md-to-docx` | Convert Markdown to Word (`.docx`) with embedded PNG images — pure JavaScript, no Pandoc required |

## How It Works

### Step 1: Discover

The agent scans your repository to understand:
- Technology stack (`.csproj`, `package.json`, `pom.xml`, `go.mod`, etc.)
- Architecture pattern (API, worker service, CLI, library)
- Design patterns (factory, strategy, repository, pipeline)
- Interfaces, implementations, models, configuration
- Dependencies, Docker setup, CI/CD

### Step 2: Generate Diagrams

Creates 3-5 professional draw.io diagrams following the C4 Model:

| Diagram | C4 Level | Shows |
|---------|----------|-------|
| High-Level Architecture | Context | System in its environment — upstream, downstream, external deps |
| Processing Pipeline | Container | Internal data flow — entry point → stages → output |
| Component Relationships | Component | Interfaces, implementations, factories, DI graph |
| Deployment (optional) | Infrastructure | Docker, Kubernetes, scaling, cloud services |
| Data Model (optional) | Component | Entity/DTO hierarchy (if significant) |

Each diagram is exported to PNG using the bundled `drawio-to-png.mjs` script.

### Step 3: Write Markdown

Produces `docs/project-summary.md` with 10 sections:

1. Executive Summary
2. Architecture Overview (with embedded diagram)
3. Processing Pipeline (with embedded diagram)
4. Core Components (with embedded diagram)
5. API Contracts / Message Schemas
6. Infrastructure & Deployment
7. Extension Patterns
8. Rules & Anti-Patterns
9. Dependencies
10. Code Structure

### Step 4: Word Document

Converts the Markdown to a formatted `.docx` using the bundled `md-to-docx.mjs` script:

- Title page with project name, date, version, audience
- Auto-generated table of contents
- **PNG diagram images embedded inline** in the Word document
- Calibri font, colored headings, styled tables with alternating rows
- Code blocks in Consolas with shaded background

### Step 5: Verify

Spot-checks class names, file paths, and diagram accuracy against the actual codebase. Reports all generated files.

## Generated Output

```
docs/
├── project-summary.md                     # Source document (Markdown)
├── project-summary.docx                   # Word document with embedded images
└── diagrams/
    ├── high-level-architecture.drawio     # C4 Context diagram (editable)
    ├── high-level-architecture.drawio.png # Rendered PNG
    ├── processing-pipeline.drawio         # C4 Container diagram
    ├── processing-pipeline.drawio.png
    ├── component-relationships.drawio     # C4 Component diagram
    └── component-relationships.drawio.png
```

## Prerequisites

| Requirement | Purpose | Required? |
|-------------|---------|-----------|
| Node.js 18+ | Run bundled export scripts | Yes |
| Edge or Chrome | Headless browser for diagram rendering | One of: this OR draw.io desktop |
| draw.io desktop | CLI diagram export (faster alternative) | Optional (browser fallback available) |

## Technology Agnostic

Works with any stack. The agent auto-detects:
- **.NET** (`.csproj`, `.sln`), **Java** (`pom.xml`, `build.gradle`), **Node.js** (`package.json`), **Python** (`pyproject.toml`), **Go** (`go.mod`), **Rust** (`Cargo.toml`)
- Docker, Kubernetes, GitHub Actions, GitLab CI
- Any messaging system (SQS, RabbitMQ, Kafka, Azure Service Bus)
- Any database ORM (EF, Hibernate, Prisma, SQLAlchemy)

## Source

This plugin is part of [Awesome Copilot](https://github.com/github/awesome-copilot), a community-driven collection of GitHub Copilot extensions.

## License

MIT
