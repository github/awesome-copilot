# Testing Patterns

## Core Sections (Required)

### 1) Test Stack and Commands

- Primary test framework: [NAME + VERSION]
- Assertion/mocking tools: [TOOLS]
- Commands:

```bash
[run all tests]
[run unit tests]
[run integration/e2e tests]
[run coverage]
```

### 2) Test Layout

- Test file placement pattern: [co-located/tests folder/etc]
- Naming convention: [pattern]
- Setup files and where they run: [paths]

### 3) Test Scope Matrix

| Scope | Covered? | Typical target | Notes |
|-------|----------|----------------|-------|
| Unit | [yes/no] | [modules/services] | [notes] |
| Integration | [yes/no] | [API/data boundaries] | [notes] |
| E2E | [yes/no] | [user flows] | [notes] |

### 4) Mocking and Isolation Strategy

- Main mocking approach: [module/class/network]
- Isolation guarantees: [what is reset and when]
- Common failure mode in tests: [short note]

### 5) Coverage and Quality Signals

- Coverage tool + threshold: [value or TODO]
- Current reported coverage: [value or TODO]
- Known gaps/flaky areas: [list]

### 6) Evidence

- [path/to/test-config]
- [path/to/representative-test-file]
- [path/to/ci-or-coverage-config]

## Extended Sections (Optional)

Add only when needed:

- Framework-specific suite patterns
- Detailed mock recipes per dependency type
- Historical flaky test catalog
- Test performance bottlenecks and optimization ideas
