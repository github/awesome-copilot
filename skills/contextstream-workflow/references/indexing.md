# File Indexing Rules

> How ContextStream indexes workspace files for semantic search and code graph analysis.
>
> **Source**: https://github.com/contextstream/mcp-server/blob/main/src/files.ts and `ignore.ts`

## Supported File Extensions

Only files with these extensions are indexed:

| Category | Extensions |
|----------|----------|
| Rust | `rs` |
| TypeScript/JavaScript | `ts`, `tsx`, `js`, `jsx`, `mjs`, `cjs` |
| Python | `py`, `pyi` |
| Go | `go` |
| Java/Kotlin | `java`, `kt`, `kts` |
| C/C++ | `c`, `h`, `cpp`, `hpp`, `cc`, `cxx` |
| C# | `cs` |
| Ruby | `rb` |
| PHP | `php` |
| Swift | `swift` |
| Scala | `scala` |
| Shell | `sh`, `bash`, `zsh` |
| Config/Data | `json`, `yaml`, `yml`, `toml`, `xml` |
| SQL | `sql` |
| Docs | `md`, `markdown`, `rst`, `txt` |
| Web | `html`, `htm`, `css`, `scss`, `sass`, `less` |
| Other | `graphql`, `proto`, `dockerfile` |
| Dart | `dart` (added in v0.4.64, coverage may be partial) |

## Always-Ignored Directories

These directories are hardcoded as ignored (before `.contextstream/ignore` is checked):

```
node_modules, .git, .svn, .hg, target, dist, build, out,
.next, .nuxt, __pycache__, .pytest_cache, .mypy_cache,
venv, .venv, env, .env, vendor, coverage, .coverage,
.idea, .vscode, .vs
```

## Always-Ignored Files

```
.DS_Store, Thumbs.db, .gitignore, .gitattributes,
package-lock.json, yarn.lock, pnpm-lock.yaml,
Cargo.lock, poetry.lock, Gemfile.lock, composer.lock
```

## Size Limits

| Limit | Value | Purpose |
|-------|-------|--------|
| Max file size | **5 MB** | Files larger than this are skipped entirely |
| Large file threshold | **2 MB** | Files above this are batched individually |
| Max batch bytes | **10 MB** | Total bytes per indexing batch |
| Max files per batch | **200** | Soft limit on files per batch |

## Custom Ignore Patterns

Create `.contextstream/ignore` in the project root to exclude additional paths. Uses **gitignore syntax**.

```gitignore
# .contextstream/ignore — Additional exclusions from ContextStream indexing

# Sensitive data
**/customer-data/
**/secrets/
**/*.pem
**/*.key

# Large generated files
**/generated/
**/*.min.js

# Test fixtures with sensitive data
**/fixtures/production/

# Vendor code
**/third-party/
```

The default ignore patterns (directories + files listed above) are always applied **in addition** to any user patterns.

## Knowledge Graph Node Indexing

> **This is separate from file indexing above.** File indexing controls which workspace files ContextStream can search. Node indexing controls which auto-distilled knowledge nodes appear in the Knowledge Graph view and are queryable via `graph()` actions.

When events are captured, ContextStream **auto-distills** them into knowledge graph nodes (facts, decisions, preferences, etc.). These nodes are created immediately but their **vector embedding** is asynchronous:

| Status | Meaning |
|--------|--------|
| `pending` | Node created but not yet embedded — invisible to graph queries and Knowledge Graph UI |
| `indexed` | Node embedded into vector store — visible in Knowledge Graph UI and queryable via `graph()` |
| `refreshing` | Indexing pipeline actively processing pending nodes |

**Practical impact**: After a burst of captures, you may see many nodes via `list_nodes` but only a fraction in the Knowledge Graph UI. This is normal — the indexing pipeline catches up automatically. Check `init()` response for `indexing_status` to see current state.
