# SemVer Decision Rules

Reference: https://semver.org/

---

## Version format

```
vMAJOR.MINOR.PATCH
```

- **MAJOR** — incompatible API changes
- **MINOR** — new backward-compatible functionality
- **PATCH** — backward-compatible bug fixes

Pre-1.0 note: if the current version is `0.x.y`, anything goes — MINOR bumps are
common for breaking changes. Once past `1.0.0`, the rules below apply strictly.

---

## What counts as a MAJOR bump (breaking change)

Breaking changes are any modifications that could cause a consumer of the library to
experience a compile error, runtime error, or behavior change **without changing their
own code**.

Examples:
- Removing a public function, class, method, or constant
- Renaming a public function, class, method, or constant
- Changing a function signature (adding required parameters, removing parameters,
  changing parameter types, changing return type)
- Changing observable behavior that callers depend on (e.g., error types thrown,
  event names emitted, return value shape)
- Changing a required configuration key or its accepted values
- Dropping support for a runtime/language version that was previously supported
- Removing or renaming a publicly exported module path

**When in doubt, prefer a MAJOR bump over a MINOR.** It's better to signal a breaking
change than to silently break consumers.

---

## What counts as a MINOR bump (new feature)

- Adding a new public function, class, method, or constant
- Adding optional parameters to an existing function (with backward-compatible defaults)
- Implementing a new protocol/interface that doesn't affect existing ones
- Adding new configuration keys with sensible defaults
- Deprecating (but not removing) a public API — removal comes in a future MAJOR

---

## What counts as a PATCH bump

- Fixing a bug where behavior was incorrect relative to documented intent
- Improving performance without changing the public API
- Internal refactoring with no external observable difference
- Documentation updates
- Dependency updates that don't change the library's own public surface
- CI/CD, test, tooling changes
- Security fixes that don't break the API

---

## Multiple changes — precedence

When a release contains a mix of change types, the **highest precedence** wins:

```
MAJOR > MINOR > PATCH
```

One breaking change + ten new features = MAJOR bump.

---

## First release (no prior tags)

Default to `1.0.0` regardless of what's in the diff. Inform the user.

---

## Edge cases

| Situation | Recommendation |
|---|---|
| Only internal/private symbols changed | PATCH |
| Type annotation added to previously untyped function | PATCH (non-breaking) |
| Changing default value of optional parameter | Treat as MAJOR if callers might rely on old default |
| Adding a new required config option to an optional block | MINOR if the block itself is optional, otherwise MAJOR |
| Reverting a previous commit entirely | Follow what the net diff shows, not the revert message |
