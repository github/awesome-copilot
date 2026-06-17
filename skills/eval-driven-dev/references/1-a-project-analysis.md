# Step 1a: Project Analysis

Before looking at code structure, entry points, or writing any instrumentation, understand what this software does in the real world. This analysis is the foundation for every subsequent step — it determines which entry points to prioritize, what eval criteria to define, what trace inputs to use, and what dataset entries to build.

---

## What to investigate

Read the project's README, documentation, and top-level source files. You're looking for answers to five questions:

### 1. What does this software do?

Write a one-paragraph plain-language summary. What problem does it solve? What does a successful run look like?

### 2. Who uses it and why?

Who are the target users? What's the primary use case? What problem does this solve that alternatives don't? This helps you understand what "quality" means for this app — a chatbot that chats with customers has different quality requirements than a research agent that synthesises multi-source reports.

### 3. Capability inventory

List the distinct capabilities, modes, or features the app offers. Be specific. for example:

- For a scraping library: single-page scraping, multi-page scraping, search-based scraping, speech output, script generation
- For a voice agent: greeting, FAQ handling, account lookup, transfer to human, call summarization
- For a research agent: topic research, multi-source synthesis, citation generation, report formatting

Each capability may need its own entry point, its own trace, and its own dataset entries. This list directly feeds Step 1c (use cases) and Step 4 (dataset diversity).

### 4. What are realistic inputs?

Characterize the real-world inputs the app processes — not toy examples:

- For a web scraper: "messy HTML pages with navigation, ads, dynamic content, tables, nested structures — typically 5KB-500KB of HTML"
- For a research agent: "open-ended research questions requiring multi-source synthesis, with 3-10 sub-questions"
- For a voice agent: "multi-turn conversations with background noise, interruptions, and ambiguous requests"

Be specific about **scale** (how large), **complexity** (how messy/diverse), and **variety** (what kinds). This directly feeds trace input selection (Step 2) — if you don't characterize realistic inputs here, you'll end up using toy inputs that bypass the app's real logic.

**This section is an operational constraint, not just documentation.** Steps 2c (trace input) and 4c (dataset entries) will cross-reference these characteristics to verify that trace inputs and dataset entries match real-world scale and complexity. Be concrete and quantitative — write "5KB–500KB HTML pages," not "various HTML pages."

### 5. What are the hard problems / failure modes?

What makes this app's job difficult? Where does it fail in practice? These become the most valuable eval scenarios:

- For a scraper: "malformed HTML, dynamic JS-rendered content, complex nested schemas, very large pages that exceed context windows"
- For a research agent: "conflicting sources, questions requiring multi-step reasoning, hallucinating citations"
- For a voice agent: "ambiguous caller intent, account lookup failures, simultaneous tool calls"

Each failure mode should map to at least one eval criterion (Step 1c) and at least one dataset entry (Step 4).

---

## Output: `pixie_qa/00-project-analysis.md`

Write your findings to this file. **Complete all five sections before moving to sub-step 1b.** This document is referenced by every subsequent step.

### Template

```markdown
# Project Analysis

## What this software does

<One paragraph: what it does, in plain language. Not class names or file paths — what problem does it solve for its users?>

## Target users and value proposition

<Who uses it, why, what problem it solves that alternatives don't>

## Capability inventory

1. <Capability name>: <one-line description>
2. <Capability name>: <one-line description>
3. ...

## Realistic input characteristics

<What real-world inputs look like — size, complexity, messiness, variety. Be specific about scale and structure.>

## Hard problems and failure modes

1. <Failure mode>: <why it's hard, what goes wrong>
2. <Failure mode>: <why it's hard, what goes wrong>
3. ...
```

### Quality check

Before moving on, verify:

- The "What this software does" section describes the app's purpose in terms a non-technical user would understand — not just "it runs a graph" or "it calls OpenAI"
- The capability inventory lists at least 3 capabilities (if the project has them) — if you only found 1, you may have only looked at one part of the codebase
- The realistic input characteristics describe real-world scale and complexity, not the simplest possible input
- The failure modes are specific to this app's domain, not generic ("bad input" is not a failure mode; "malformed HTML with unclosed tags that breaks the parser" is)

### What to ignore in the project

The project may contain directories and files that are part of its own development/test infrastructure — `tests/`, `fixtures/`, `examples/`, `mock_server/`, `docs/`, demo scripts, etc. These exist for the project's developers, not for your eval pipeline.

**Critical**: Do NOT use the project's test fixtures, mock servers, example data, or unit test infrastructure as inputs for your eval traces or dataset entries. They are designed for development speed and isolation — small, clean, deterministic data that bypasses every real-world difficulty. Using them produces trivially easy evaluations that cannot catch real quality issues.

When you encounter these directories during analysis, note their existence but treat them as implementation details of the project — not as data sources for your QA pipeline. Your QA pipeline must test the app against real-world conditions, not against the project's own test shortcuts.
