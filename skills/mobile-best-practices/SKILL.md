---
name: mobile-best-practices
description: Searchable database of 2,461 mobile development best practices for Android, iOS, Flutter, and React Native. Use when building, reviewing, or optimizing mobile apps — covers architecture, security, performance, UI patterns, and anti-patterns.
---

# Mobile Best Practices

A searchable database of 2,461 curated mobile development guidelines for Android, iOS, Flutter, and React Native. Uses BM25 ranking with fuzzy search across 16 CSV databases.

## When to Use This Skill

- Building or reviewing Android apps (Jetpack Compose or XML)
- Building or reviewing iOS apps (SwiftUI or UIKit)
- Flutter or React Native development
- Security audits mapped to OWASP Mobile Top 10
- Performance optimization and ANR/crash prevention
- Architecture pattern selection (MVVM, MVI, Clean, Bloc, etc.)
- Choosing libraries and Gradle dependencies
- Code review against known anti-patterns

## Installation

```bash
npx mobile-best-practices install
```

Or manually copy to `~/.claude/skills/mobile-best-practices/`.

## Search

```bash
python3 search.py "<query>" --domain <domain> -n <max_results>
```

### Domains

| Domain | Description |
|--------|-------------|
| `architecture` | MVVM, MVI, Clean Architecture, Bloc, Redux |
| `design-patterns` | Repository, Factory, Observer, Singleton |
| `ui` | Compose, SwiftUI, UIKit, Flutter widgets |
| `anti-patterns` | Common mistakes and how to fix them |
| `security` | OWASP Mobile Top 10, encryption, storage |
| `performance` | Recomposition, memory, rendering, battery |
| `testing` | Unit, UI, integration, snapshot tests |
| `libraries` | Recommended third-party libraries |
| `snippets` | Copy-paste code examples |
| `gradle` | Dependency declarations with versions |

### Examples

```bash
# Find Jetpack Compose performance tips
python3 search.py "jetpack compose recomposition" --domain performance

# Find security issues with API keys
python3 search.py "API key storage" --domain security

# Find Flutter state management patterns
python3 search.py "flutter state management" --domain architecture

# Find React Native anti-patterns
python3 search.py "react native memory leak" --domain anti-patterns

# Search across all domains
python3 search.py "biometric authentication" --all-domains
```

## Database Coverage

| Category | Count |
|----------|-------|
| Platform-specific guidelines | 792 |
| Security practices (OWASP-mapped) | 437 |
| Performance rules | 228 |
| Anti-patterns | 243 |
| UI component patterns | 191 |
| Design patterns | 112 |
| Architecture patterns | 49 |
| Libraries & dependencies | 103 |
| Testing patterns | 73 |
| Copy-paste snippets | 81 |
| Gradle dependencies | 78 |

## Source

https://github.com/tungnk123/mobile-best-practices — MIT License
