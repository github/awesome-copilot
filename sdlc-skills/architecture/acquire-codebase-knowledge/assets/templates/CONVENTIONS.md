# Coding Conventions

## Core Sections (Required)

### 1) Naming Rules

| Item | Rule | Example | Evidence |
|------|------|---------|----------|
| Files | [RULE] | [EXAMPLE] | [FILE] |
| Functions/methods | [RULE] | [EXAMPLE] | [FILE] |
| Types/interfaces | [RULE] | [EXAMPLE] | [FILE] |
| Constants/env vars | [RULE] | [EXAMPLE] | [FILE] |

### 2) Formatting and Linting

- Formatter: [TOOL + CONFIG FILE]
- Linter: [TOOL + CONFIG FILE]
- Most relevant enforced rules: [RULE_1], [RULE_2], [RULE_3]
- Run commands: [COMMANDS]

### 3) Import and Module Conventions

- Import grouping/order: [RULE]
- Alias vs relative import policy: [RULE]
- Public exports/barrel policy: [RULE]

### 4) Error and Logging Conventions

- Error strategy by layer: [SHORT SUMMARY]
- Logging style and required context fields: [SUMMARY]
- Sensitive-data redaction rules: [SUMMARY]

### 5) Testing Conventions

- Test file naming/location rule: [RULE]
- Mocking strategy norm: [RULE]
- Coverage expectation: [RULE or TODO]

### 6) Evidence

- [path/to/lint-config]
- [path/to/format-config]
- [path/to/representative-source-file]

## Extended Sections (Optional)

Add only for large or inconsistent codebases:

- Layer-specific error handling matrix
- Language-specific strictness options
- Repo-specific commit/branching conventions
- Known convention violations to clean up
