# Lint rules as poka-yoke devices

Most lint rules are style. These are not: each one below prevents a specific mistake that
produces a specific wrong behavior. Set them to `error`, not `warn`: a warning in a list of
four hundred warnings is rung zero.

Install strategy: enforce on changed files, or generate a baseline of existing violations and
fail only on new ones. Turning these on repo-wide in a large codebase produces a wall of
failures and the rule gets reverted. The violation count only needs to go down.

## TypeScript, `eslint.config.js`

Requires `@typescript-eslint` with type-aware linting (`projectService: true`), because the
highest-value rules here need type information.

```js
// eslint.config.js
import tseslint from "typescript-eslint";

export default tseslint.config(
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: { parserOptions: { projectService: true } },
    rules: {
      // --- silent failure: the highest-value rules in this file ---
      "@typescript-eslint/no-floating-promises": "error",   // an unawaited write, silently lost
      "@typescript-eslint/no-misused-promises": "error",    // async fn passed where sync expected
      "no-empty": ["error", { allowEmptyCatch: false }],    // swallowed errors
      "require-atomic-updates": "error",                    // read-modify-write race across await

      // --- completeness ---
      "@typescript-eslint/switch-exhaustiveness-check": "error",  // new variant, silently unhandled
      "@typescript-eslint/no-unnecessary-condition": "error",     // always-true check = usually a bug

      // --- type guarantees ---
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-argument": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/no-non-null-assertion": "error",  // `!` is an unchecked claim

      // --- coercion surprises ---
      eqeqeq: ["error", "always"],

      // --- detection devices switched off ---
      "no-restricted-syntax": ["error",
        { selector: "MemberExpression[property.name='only']",
          message: "Focused tests disable the rest of the suite. Remove before merging." }],
    },
  },
);
```

`tsconfig.json` matters as much as the lint config, none of the above is load-bearing without:

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,   // array access is T | undefined, which is the truth
    "exactOptionalPropertyTypes": true
  }
}
```

## Python, `pyproject.toml`

```toml
[tool.ruff.lint]
select = [
  "E", "F",    # pyflakes: undefined names, unused imports: real bugs
  "B",         # bugbear: mutable defaults (B006), loop variable capture, assert on tuple
  "S",         # bandit: hardcoded secrets, unsafe subprocess, weak crypto
  "DTZ",       # naive datetimes
  "ASYNC",     # blocking calls inside async functions
  "RUF006",    # dangling asyncio task, can be GC'd mid-flight, work silently not done
  "PLE",       # pylint errors only, not conventions
  "T20",       # stray print/pprint
]
ignore = ["E501"]   # line length is style, not mistake-proofing

[tool.ruff.lint.per-file-ignores]
"tests/**" = ["S101"]   # assert is fine in tests; it is not fine as production validation

[tool.mypy]
strict = true
disallow_any_unimported = true   # an untyped dependency reintroduces Any silently
warn_return_any = true
```

## Go, `.golangci.yml`

```yaml
# v2 is not backward compatible: it rejects a v1 file rather than migrating it, so the
# version key is what stops this template failing on a current golangci-lint.
version: "2"

linters:
  enable:
    - errcheck        # unchecked errors: Go's error convention is opt-in without this
    - exhaustive      # non-exhaustive switch over typed constants
    - bodyclose       # unclosed HTTP response bodies
    - rowserrcheck
    - sqlclosecheck
    - contextcheck    # context not propagated: cancellation and timeouts silently disabled
    - nilerr          # returning nil after a non-nil error
    - noctx           # HTTP requests without a context
    - gosec

  settings:
    exhaustive:
      default-signifies-exhaustive: false
```

`errcheck` is the non-negotiable one. `_ = doSomething()` is how data loss enters a Go
codebase.

## Rust, `Cargo.toml`

```toml
[workspace.lints.clippy]
unwrap_used = "deny"        # highest value: turns "this can't fail" into an explicit decision
expect_used = "warn"        # acceptable at startup and in tests, with a reason
panic = "deny"
indexing_slicing = "deny"   # forces .get() and a real branch
float_cmp = "deny"
arithmetic_side_effects = "warn" # forces checked_/saturating_ where overflow matters
todo = "deny"
dbg_macro = "deny"
```
