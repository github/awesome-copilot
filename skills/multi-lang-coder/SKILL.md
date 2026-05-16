---
name: multi-lang-coder
description: 'Polyglot code converter and language architect. Use when input contains mixed, ambiguous, pseudo, or multi-language code fragments (Python+JS syntax blends, SQL embedded in shell, natural-language specs with code snippets, cross-stack pipelines) that must be converted into clean, idiomatic, production-ready code in the appropriate target language. Also use when starting a new project with no language chosen yet — selects the best language(s) based on domain (systems, web backend, frontend, data/ML, mobile, scripting, embedded, enterprise) and explains the choice. Keywords: convert code, translate language, mixed syntax, pseudocode, polyglot, language selection, port code, rewrite in.'
---

# Multi-Language Code Converter and Language Architect

Convert mixed, pseudo, or multi-language input into idiomatic production code, and select the right language(s) when none is dictated by the project.

## When to Use This Skill

- Input mixes syntax from multiple languages (e.g., `def` and `function` in the same block, `this.` next to `self.`, semicolons mixed with indentation-based blocks)
- Input is pseudocode or natural language describing behavior plus code fragments
- User asks to "convert", "port", "translate", or "rewrite" code into another language
- A new project is starting with no language chosen and the user wants a recommendation
- A specification mixes config (YAML/TOML), SQL, and procedural logic that must be split into the right files

## Operating Phases

Work through these phases in order. Skip a phase only when its premise does not apply (e.g., skip Phase 2 if a target language is already obvious from the project or user).

### Phase 1 — Detect Existing Context

Before choosing a language, scan for signals in this priority order:

1. **Explicit user instruction** — Always wins. If the user says "in Rust", produce Rust.
2. **Project manifests** — `package.json`, `pyproject.toml` / `requirements.txt`, `Cargo.toml`, `go.mod`, `*.csproj`, `pom.xml` / `build.gradle`, `Gemfile`, `composer.json`, `tsconfig.json`. The first one found generally dictates the target.
3. **Source file extensions** — Dominant extension in the workspace (`.ts`, `.py`, `.rs`, `.go`, `.java`, `.cs`, `.rb`, `.cpp`, `.kt`, `.swift`).
4. **Open editor / active file** — Match the language of the file the user is editing.
5. **Nothing found** — Proceed to Phase 2.

### Phase 2 — Select Language (New Projects Only)

Run this only when Phase 1 yields no target. Map the goal to a domain, then pick the best fit:

| Domain | Strong default | Alternatives |
|--------|----------------|--------------|
| Systems / performance-critical | Rust | C++, Go, Zig |
| Web backend / API | TypeScript (Node) | Go, Python, Java, C#, Ruby |
| Web frontend / UI | TypeScript | JavaScript |
| Data / ML / AI | Python | R, Julia |
| Mobile (native) | Swift (iOS) / Kotlin (Android) | Dart/Flutter, React Native |
| Scripting / automation | Python | Bash (Unix), PowerShell (Windows) |
| Embedded / IoT | C / Rust | C++, MicroPython |
| Enterprise / type-heavy | Java / C# | TypeScript, Kotlin |

**Decide single vs. polyglot:**

- Frontend + backend → always two languages (TS frontend + backend of choice).
- Data pipeline + API → Python for data, Go/Node for API is a reasonable split.
- Otherwise prefer a single language — every additional language costs maintenance.

**State the choice briefly** (2–3 sentences per language) before writing code. Include one tradeoff the user should know.

### Phase 3 — Parse the Mixed Input

For each fragment in the input:

1. **Classify** — Which language(s) does the syntax most resemble? Tag fragments (Python-like, JS-like, SQL, shell, config, prose intent).
2. **Extract intent** — What is this fragment trying to do? What flows in/out? What are the side effects?
3. **Flag ambiguities** — If intent is genuinely unclear, list assumptions explicitly. If an assumption materially changes the output, ask before generating.
4. **Map** — For each fragment, identify the idiomatic equivalent in the target language.

### Phase 4 — Generate Code

- Use idiomatic syntax, formatting, and conventions for the target (PEP 8 for Python, rustfmt for Rust, gofmt for Go, Airbnb/standard for JS/TS, etc.).
- Apply the language's native error-handling pattern (exceptions, `Result`, error returns, promises). Do not port one language's pattern into another.
- Add types/type hints where the language supports or requires them.
- Produce runnable units (correct imports, package declarations, module headers) unless the input is clearly a snippet.
- If the input implies multiple files/modules, emit each as a separate labeled block.
- List required dependencies with install commands (`pip install …`, `npm install …`, `cargo add …`).

### Phase 5 — Respond in This Format

1. **Language decision** (only if Phase 2 ran) — one short paragraph.
2. **Conversion notes** — bullets covering: ambiguities, assumptions made, fragments that were restructured and why.
3. **Generated code** — one labeled code block per file/module.
4. **Dependencies** — install commands.
5. **Next steps** (optional) — only if the input was a partial spec.

## Gotchas

- **Never silently drop input logic.** If a fragment cannot be cleanly converted (e.g., Python's GIL-dependent threading patterns into JS), call it out in conversion notes and propose an equivalent — do not omit it.
- **Never leave mixed syntax in output.** If the output still contains `def` and `function` together, `this` and `self` together, or `print` and `console.log` together, the conversion has failed. Re-check before responding.
- **Do not auto-convert config/data files** (JSON, YAML, TOML, XML). Treat them as context unless the user explicitly asks for conversion.
- **Error-handling idioms are not portable.** Rewriting Python `try/except` as Go `try/catch` produces non-compiling code. Translate to the target's native pattern (`if err != nil`, `Result<T,E>`, etc.).
- **Indentation vs. braces.** When converting from Python to a brace language (or vice versa), re-derive block structure from intent, not from the original whitespace — Python whitespace inside JS will silently change semantics.
- **Don't invent dependencies.** If the input uses `requests`, the TS equivalent is `fetch`/`axios` — pick one and justify it; do not fabricate package names.
- **Honor explicit user language choice above all heuristics.** Even if the project is Python, if the user says "give me this in Rust", produce Rust and note the mismatch.
- **Prefer one language over polyglot unless justified.** Splitting a small script into "Python for data + Node for API" is overkill — state the tradeoff and recommend the simpler path.
- **Already-valid code in the right language ≠ conversion task.** If the input is already clean code in the project's language, say so and offer style/quality improvements instead of rewriting it.

## Mini Examples of Mixed Input This Skill Handles

- Python `import` and `if response.status_code == 200:` inside a JS `function () { … }` wrapper with `console.log` — convert wholesale to one language.
- Shell script containing free-form `SELECT * FROM users` and `loop through rows` prose — split into a real shell driver plus a real SQL file, or fold into one language with a DB client.
- Class definition mixing `def __init__(self)`, `this.users`, `new ArrayList()`, `throw new Exception` — pick one OO language and produce idiomatic class.
- Pure natural-language spec ("POST /users, validate email regex, bcrypt cost=12, INSERT …, return 201") — treat as feature spec, generate full handler in target language.
- YAML config with embedded `if ENV == "production"` and `Math.max(5, cpu_count * 2)` — split static config from runtime logic; emit a clean config file plus loader code.

## References

- Tree-sitter (multi-language parsing reference): <https://tree-sitter.github.io/tree-sitter>
- GitHub Linguist (language detection heuristics): <https://github.com/github-linguist/linguist>
- Benchmarks Game (cross-language performance reference): <https://benchmarksgame-team.pages.debian.net/benchmarksgame>
- TIOBE Index (language popularity): <https://www.tiobe.com/tiobe-index>
