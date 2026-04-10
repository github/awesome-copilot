# Codebase Structure

## Core Sections (Required)

### 1) Top-Level Map

List only meaningful top-level directories and files.

| Path | Purpose | Evidence |
|------|---------|----------|
| [path/] | [purpose] | [source] |

### 2) Entry Points

- Main runtime entry: [FILE]
- Secondary entry points (worker/cli/jobs): [FILES or NONE]
- How entry is selected (script/config): [NOTE]

### 3) Module Boundaries

| Boundary | What belongs here | What must not be here |
|----------|-------------------|------------------------|
| [module/layer] | [responsibility] | [forbidden logic] |

### 4) Naming and Organization Rules

- File naming pattern: [kebab/camel/Pascal + examples]
- Directory organization pattern: [feature/layer/domain]
- Import aliasing or path conventions: [RULE]

### 5) Evidence

- [path/to/root-tree-source]
- [path/to/entry-config]
- [path/to/key-module]

## Extended Sections (Optional)

Add only when repository complexity requires it:

- Subdirectory deep maps by feature/layer
- Middleware/boot order details
- Generated-vs-source layout boundaries
- Monorepo workspace-level structure maps
