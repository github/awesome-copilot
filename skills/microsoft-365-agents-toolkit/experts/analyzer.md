# analyzer

## purpose

Scan a project codebase, identify its technology stack, and recommend micro-experts to create based on coverage gaps against the existing `.experts/` inventory.

## rules

1. **Scan manifests first.** Start with package manifests and lock files — they reveal the full dependency tree in seconds. Priority order: `package.json` / `package-lock.json` / `yarn.lock` / `pnpm-lock.yaml`, `Cargo.toml` / `Cargo.lock`, `go.mod` / `go.sum`, `pyproject.toml` / `requirements.txt` / `Pipfile`, `pom.xml` / `build.gradle`, `*.csproj` / `*.sln`, `Gemfile`, `Package.swift`, `build.gradle.kts`.
2. **Examine directory structure for framework signals.** Look for conventional directories: `src/app/` or `app/` (Next.js/Remix), `src/routes/` (SvelteKit), `pages/` (Next.js Pages Router), `components/`, `middleware/`, `migrations/`, `prisma/`, `terraform/`, `.github/workflows/`, `.circleci/`, `docker/`, `k8s/`, `helm/`.
3. **Read config files for tooling signals.** Check for: `tsconfig.json`, `.eslintrc.*`, `.prettierrc`, `jest.config.*`, `vitest.config.*`, `playwright.config.*`, `cypress.config.*`, `.dockerignore`, `Dockerfile`, `docker-compose.yml`, `nginx.conf`, `webpack.config.*`, `vite.config.*`, `tailwind.config.*`, `.env.example`.
4. **Catalog the full tech stack.** Produce a structured inventory: language(s), framework(s), build tool(s), test framework(s), CI/CD platform(s), infrastructure/deployment tool(s), notable libraries (ORM, HTTP client, state management, etc.).
5. **Cross-reference against existing `.experts/` inventory.** Read every domain `index.md` and list all expert files. Map each technology in the stack to the expert(s) that cover it. Mark technologies with no expert coverage as gaps.
6. **Score gaps by usage frequency and impact.** A framework used across every file (React, Express) scores higher than a dev-only tool used in one config file (Husky). Prioritize gaps that affect daily development decisions.
7. **Route library/framework experts to `languages/{lang}/libraries/`, not `.project/`.** When a gap is a language-specific framework or library (Next.js, Django, Spring Boot, Axum, etc.), place the expert under the relevant language's `libraries/` subfolder — e.g., `languages/typescript/libraries/nextjs.md`. This keeps framework knowledge co-located with the language it's written in and lets the language router load it alongside idioms and patterns. Reserve `.project/` for truly cross-cutting project-specific concerns that don't belong to a single language (CI/CD pipelines, infrastructure, project-specific workflows, multi-language prompt template conventions).
8. **Distinguish recommendation types.** Group into three categories: (a) **Populate stubs** — existing expert files that are placeholders; (b) **New project experts** — topics specific to this codebase's stack (frameworks, ORMs, CI/CD, etc.); (c) **General expert gaps** — topics that would benefit the general system (flag these but don't auto-create; they require broader applicability review).
9. **Output structured recommendations.** Each recommendation must include: filename, target domain (`languages/{lang}/libraries/` for language-specific frameworks, `.project/` for cross-cutting concerns), evidence (which files/deps triggered it), priority (high/medium/low), and a one-line expert purpose.
10. **Prioritize populating existing stubs over creating new experts.** Stubs represent already-identified knowledge gaps that the system is designed to hold. Filling them first maximizes coverage per effort.
11. **Update the target domain's `index.md` as experts are created.** After each expert is built, add it to the appropriate router's task clusters and file inventory. For library experts, update `languages/{lang}/libraries/index.md`. For cross-cutting experts, update `.project/index.md`. Keep routers current so the system can find new experts.
12. **Pair output with builder.md for handoff.** The analyzer identifies *what* to build; builder.md handles *how* to build it. Format recommendations so they can be directly fed into builder.md's Phase 1 scoping with the target domain pre-filled (`languages/{lang}/libraries/` or `.project/`).
13. **Scan for prompt template patterns.** Projects that use LLMs almost always have a prompt templating layer — and the implementation varies wildly. Scan for: LLM SDK imports (OpenAI, Anthropic, Azure OpenAI, LangChain, LlamaIndex, Semantic Kernel, Vercel AI SDK, etc.), prompt file conventions (a `prompts/` or `templates/` directory, `.prompt`, `.hbs`, `.jinja2`, `.mustache` files containing LLM instructions), string construction patterns (template literals, f-strings, or concatenation building system/user messages), and prompt management utilities (helper functions that assemble, format, or inject variables into prompts). When any of these signals are found, recommend a prompt template expert that documents: where templates live, which templating mechanism is used, how variables are injected, how system/user/assistant messages are constructed, and which LLM SDK the project calls. If the project uses a single language for LLM calls, place the expert under `languages/{lang}/libraries/prompt-templates.md`. If prompt construction spans multiple languages, place it under `.project/prompt-templates.md`. This expert pairs with `tools/prompt-engineer.md` — the general expert provides the design principles, the project expert provides the local conventions.
14. **Score prompt template gaps as high priority when LLM usage is core.** If the project's primary purpose involves LLM calls (an AI agent, a chatbot, a RAG pipeline, a prompt-driven workflow), the prompt template expert is high priority — it affects nearly every feature. If LLM calls are peripheral (e.g., a single summarization endpoint in a larger app), score it as medium.

## patterns

### Manifest scanning sequence

```
1. List root directory → identify project type
2. Read primary manifest:
   - Node.js → package.json (dependencies, devDependencies, scripts)
   - Rust    → Cargo.toml (dependencies, features)
   - Go      → go.mod (require, module path)
   - Python  → pyproject.toml or requirements.txt
   - Java    → pom.xml or build.gradle
   - C#      → *.csproj (PackageReference)
   - Ruby    → Gemfile
3. Read secondary signals:
   - CI/CD   → .github/workflows/*.yml, .gitlab-ci.yml, Jenkinsfile
   - Infra   → Dockerfile, docker-compose.yml, terraform/, k8s/
   - Config  → tsconfig.json, .eslintrc.*, vite.config.*, etc.
4. Scan src/ structure for framework conventions
5. Check for monorepo signals: workspaces, lerna.json, nx.json, turbo.json
```

### Prompt template scanning sequence

```
1. Check for LLM SDK dependencies in manifests:
   - Node.js → openai, @anthropic-ai/sdk, @azure/openai, langchain,
               llamaindex, @ai-sdk/*, semantic-kernel
   - Python  → openai, anthropic, langchain, llama-index,
               semantic-kernel, guidance, promptflow
   - C#      → Azure.AI.OpenAI, Anthropic, Microsoft.SemanticKernel,
               Microsoft.Extensions.AI
   - Go      → github.com/sashabaranov/go-openai, github.com/anthropics/...
   - Rust    → async-openai, anthropic-rs

2. Scan for prompt file conventions:
   - Directories: prompts/, templates/, agents/, instructions/
   - File types:  *.prompt, *.txt, *.md, *.hbs, *.jinja2, *.mustache,
                  *.liquid containing LLM instructions
   - Naming:      *system*, *prompt*, *agent*, *instruction* in filenames

3. Scan source code for prompt construction patterns:
   - Template literals / f-strings building message content
   - System/user/assistant role message arrays
   - Section tag patterns: <SECTION_NAME> style markers
   - Variable interpolation: {{var}}, {var}, ${var}, {{ var }}
   - Prompt builder/formatter utility functions or classes

4. Identify the prompt architecture:
   - Storage:     files on disk, inline in code, database, CMS
   - Templating:  native string interpolation, Handlebars, Jinja2,
                  Mustache, Liquid, custom
   - Structure:   section tags, markdown headers, XML tags, plain text
   - Multi-turn:  message array construction, conversation history mgmt
   - Variables:   how context is injected (retrieval, user input, state)

5. Catalog findings for the project prompt template expert:
   - SDK + client setup pattern
   - Where templates live (path conventions)
   - Templating mechanism + variable syntax
   - Message construction pattern (system/user/assistant)
   - Section/structure conventions used in prompts
```

### Coverage gap output template

```markdown
## Expert Coverage Analysis

### Tech Stack
| Category     | Technology       | Version  |
|-------------|-----------------|----------|
| Language     | TypeScript       | 5.x      |
| Framework    | Next.js          | 14.x     |
| ORM          | Prisma           | 5.x      |
| Testing      | Vitest           | 1.x      |
| CI/CD        | GitHub Actions   | —        |

### Coverage Map
| Technology       | Expert Coverage              | Status |
|-----------------|------------------------------|--------|
| TypeScript       | languages/typescript/*.md     | ✅ Full |
| Git workflows    | tools/git.md                  | ✅ Full |
| Prompt design    | tools/prompt-engineer.md      | ✅ General |
| Next.js          | —                            | ❌ Gap  |
| Prisma           | —                            | ❌ Gap  |
| Prompt templates | —                            | ❌ Gap (project-specific) |
| Vitest           | —                            | ❌ Gap  |
| GitHub Actions   | —                            | ❌ Gap  |

### Recommendations
| # | File                  | Domain                          | Priority | Purpose                                    |
|---|----------------------|---------------------------------|----------|--------------------------------------------|
| 1 | nextjs.md            | languages/typescript/libraries/ | High     | Next.js App Router patterns and conventions |
| 2 | prisma.md            | languages/typescript/libraries/ | High     | Prisma schema design, queries, migrations  |
| 3 | prompt-templates.md  | .project/                       | High     | Project prompt template conventions, SDK patterns, variable injection (pairs with tools/prompt-engineer.md) |
| 4 | vitest.md            | languages/typescript/libraries/ | Medium   | Vitest configuration and testing patterns  |
| 5 | github-actions.md    | .project/                       | Medium   | GitHub Actions workflow patterns (cross-cutting, not language-specific) |
```

### Builder.md handoff

After generating recommendations, offer to start building:

```
To create any of these experts, I'll hand off to builder.md with the
scoping already pre-filled:

  "Create expert: {filename} in {target domain} — {purpose}.
   Evidence: {manifest signals}. Priority: {level}."

Which experts should I create? (Select numbers, or "all high priority")
```

## pitfalls

- **Don't recommend experts for one-off dependencies.** A single `lodash` import or a `chalk` dependency doesn't warrant an expert. Focus on technologies that shape architectural decisions and daily workflows.
- **`devDependencies` don't always mean active use.** Many projects accumulate unused dev dependencies. Cross-reference with config files and import statements before recommending experts based on devDependencies alone.
- **Stubs are not coverage.** An expert file that exists but contains only a research prompt (stub) provides zero guidance. Count stubs as gaps when assessing coverage.
- **Prioritize ruthlessly in monorepos.** A monorepo with 50 packages and 20 technologies needs 4-6 high-impact experts, not 20. Focus on shared technologies that affect the most packages.
- **Don't confuse project-specific config with general expertise.** A project's custom webpack config doesn't need an expert — webpack itself might. Experts cover reusable knowledge, not project-specific setup.
- **Don't skip prompt template scanning because "it's just strings."** Prompt construction is often spread across utility functions, config files, and inline code with no obvious directory convention. Projects that use LLMs always have prompt patterns — they're just not always in a `prompts/` folder. Search SDK imports and message construction calls, not just file names.
- **Don't duplicate `tools/prompt-engineer.md` in the project expert.** The project prompt template expert captures *how this project* builds prompts (file locations, template syntax, SDK setup, variable injection). The general `prompt-engineer.md` expert covers *how to design prompts well*. The project expert should reference and pair with the general expert, not restate its principles.

## instructions

Use this expert when the developer wants to assess their project's technology stack and identify which micro-experts would be most valuable to create.

**Trigger phrases:** "explore the codebase," "recommend experts," "analyze project," "audit experts," "expert coverage," "gap analysis," "what experts should I create," "scan my project."

Pair with: `builder.md` for creating the recommended experts. The analyzer produces the roadmap; the builder executes it. Pair with: `tools/prompt-engineer.md` — when a project prompt template expert is created in `.project/`, it should declare `Pair with: tools/prompt-engineer.md` so the general prompt design principles are loaded alongside the project-specific conventions.

## research

Deep Research prompt:

"Write a meta-expert for scanning software project codebases and recommending micro-experts to create. Cover: manifest file scanning strategies (package.json, Cargo.toml, go.mod, pyproject.toml, pom.xml, *.csproj, Gemfile), directory structure analysis for framework detection, config file signals for tooling identification, tech stack cataloging methodology, coverage gap analysis against an existing expert inventory, recommendation prioritization (usage frequency, architectural impact, daily development relevance), structured output formats for recommendations, handoff protocol to an expert-building workflow, and common analysis pitfalls (one-off deps, unused devDependencies, monorepo sprawl, stubs vs coverage)."
