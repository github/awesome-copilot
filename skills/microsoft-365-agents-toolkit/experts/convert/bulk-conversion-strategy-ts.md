# bulk-conversion-strategy-ts

## purpose

Strategy and workflow for large-scale code conversion — converting 100+ source files (Java POJOs, Ruby classes, JS modules) to TypeScript efficiently with prioritized phases, incremental validation, and tooling.

## rules

1. **Never attempt a big-bang conversion.** Convert in phases, ensuring each phase compiles and passes tests before proceeding. A half-converted project that compiles is infinitely better than a fully-converted project that doesn't.
2. **Phase order: Models → Utilities → Core logic → Handlers → Entry point.** Convert bottom-up through the dependency graph. Models have no internal dependencies, so they convert first. Entry points depend on everything, so they convert last.
3. **Prioritize by dependency count.** Run a dependency analysis: files imported by many others convert first (high fan-in). Files that import many others convert last (high fan-out). This minimizes the number of temporary `any` shims.
4. **Use TypeScript's `allowJs: true`** during transition. This lets `.ts` files coexist with unconverted `.js` files. Set `checkJs: false` to avoid type-checking JS files. Remove `allowJs` only when 100% of files are converted.
5. **Create a `@types/source-project` declarations file** for unconverted modules. As you convert models first, other unconverted files may still import them. A `.d.ts` shim keeps the compiler happy during the transition.
6. **Batch similar files.** Group files by pattern (all Lombok `@Data` POJOs, all event handlers, all middleware) and convert each group in one pass. This builds muscle memory and ensures consistency.
7. **Validate each batch immediately.** After converting a batch: (1) `tsc --noEmit` to check types, (2) run relevant tests, (3) commit. Do not accumulate unconverted batches.
8. **Track progress with a conversion manifest.** Maintain a simple JSON or markdown file listing every source file, its status (pending/in-progress/done/skipped), target TS file, and notes. This prevents duplicate work and makes progress visible.
9. **Handle the 80/20 rule.** ~80% of files in a Java project are simple POJOs/models that convert mechanically. ~20% contain complex logic (middleware, async chains, polymorphic factories) that need careful manual conversion. Identify the 20% early and plan extra time.
10. **Establish naming conventions before starting.** Decide once: snake_case API fields stay snake_case or become camelCase? One file per class (Java-style) or group by feature (TS-style)? Barrel exports or direct imports? Document in the conversion manifest.
11. **Write adapter/shim layers for incremental testing.** If the source project has integration tests, create thin adapter layers so converted TS modules can be called from unconverted test harnesses (or vice versa) during transition.
12. **Delete source files after conversion, don't keep both.** Having `User.java` and `User.ts` side by side causes confusion. Once `User.ts` compiles and tests pass, delete `User.java`. The git history preserves the original.

## interview

### Q1 — Naming Conventions
```
question: "How should internal field names be cased in the converted TypeScript code?"
header: "Field casing"
options:
  - label: "camelCase (Recommended)"
    description: "Convert all internal fields to camelCase (standard TS convention). Wire-format fields (API JSON) keep their original casing via serialization mapping."
  - label: "Keep original casing"
    description: "Preserve snake_case/PascalCase from the source language as-is. Fewer changes but non-idiomatic TS."
  - label: "You Decide Everything"
    description: "Accept recommended defaults for all decisions and skip remaining questions."
multiSelect: false
```

### Q2 — File Organization
```
question: "How should converted files be organized?"
header: "File layout"
options:
  - label: "Group by feature (Recommended)"
    description: "Organize files by feature/module (TS-style). Related types, handlers, and utilities live together."
  - label: "One file per class"
    description: "Keep the source language's structure (e.g., Java's one-class-per-file). Familiar but can lead to many small files."
multiSelect: false
```

### Q3 — Export Style
```
question: "How should modules be exported?"
header: "Exports"
options:
  - label: "Barrel exports (Recommended)"
    description: "Each directory gets an index.ts re-exporting its public API. Cleaner imports for consumers."
  - label: "Direct imports only"
    description: "Import directly from each file path. No barrel files. Simpler but more verbose import paths."
multiSelect: false
```

### Q4 — Conversion Scope
```
question: "Should we convert everything, or focus on specific modules first?"
header: "Scope"
options:
  - label: "Full project (phased)"
    description: "Convert the entire project in dependency order (models -> utils -> core -> handlers -> entry). Recommended for clean breaks."
  - label: "Critical path only"
    description: "Convert only the modules needed for the current feature/migration. Remaining modules use .d.ts shims."
  - label: "Models + utilities only"
    description: "Convert data models and shared utilities. Keep handlers/entry points in source language with interop layer."
multiSelect: false
```

### defaults table

| Question | Default |
|---|---|
| Q1 | camelCase for internal, preserve wire-format |
| Q2 | Group by feature |
| Q3 | Barrel exports |
| Q4 | Full project (phased) |

## patterns

### Conversion manifest tracking file

```markdown
# Conversion Manifest — java-slack-sdk

## Conventions
- API wire-format fields: keep snake_case
- Internal fields: camelCase
- One interface per model file (may group related types)
- Barrel exports via index.ts per directory

## Phase 1: Models (200 files)
| Source File | Status | Target File | Notes |
|---|---|---|---|
| model/block/SectionBlock.java | done | src/models/blocks/section-block.ts | |
| model/block/ActionsBlock.java | done | src/models/blocks/actions-block.ts | |
| model/block/DividerBlock.java | done | src/models/blocks/divider-block.ts | |
| model/event/AppMentionEvent.java | in-progress | src/models/events/app-mention-event.ts | Has nested types |
| model/event/MessageEvent.java | pending | src/models/events/message-event.ts | |
| ... | | | |

## Phase 2: Utilities (15 files)
| Source File | Status | Target File | Notes |
|---|---|---|---|

## Phase 3: Core Services (30 files)
| Source File | Status | Target File | Notes |
|---|---|---|---|

## Phase 4: Handlers (40 files)
| Source File | Status | Target File | Notes |
|---|---|---|---|

## Phase 5: Entry Points (5 files)
| Source File | Status | Target File | Notes |
|---|---|---|---|
```

### Dependency graph analysis for prioritization

```typescript
// Script to analyze Java import graph and determine conversion order
import { readFileSync, readdirSync } from 'fs';
import { join, relative } from 'path';

interface FileNode {
  path: string;
  imports: string[];  // files this file imports
  importedBy: string[]; // files that import this file (fan-in)
}

function analyzeJavaImports(srcDir: string): FileNode[] {
  const files: Map<string, FileNode> = new Map();

  // Scan all .java files
  function scan(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (entry.name.endsWith('.java')) {
        const rel = relative(srcDir, fullPath);
        const content = readFileSync(fullPath, 'utf-8');
        const imports = [...content.matchAll(/^import\s+([\w.]+);/gm)]
          .map((m) => m[1].replace(/\./g, '/') + '.java');
        files.set(rel, { path: rel, imports, importedBy: [] });
      }
    }
  }
  scan(srcDir);

  // Build reverse dependency map (fan-in)
  for (const [path, node] of files) {
    for (const imp of node.imports) {
      const target = files.get(imp);
      if (target) {
        target.importedBy.push(path);
      }
    }
  }

  // Sort: highest fan-in first (most depended-on → convert first)
  return [...files.values()].sort(
    (a, b) => b.importedBy.length - a.importedBy.length,
  );
}

// Usage:
const ordered = analyzeJavaImports('./java-slack-sdk/slack-api-model/src/main/java');
console.log('Convert in this order:');
ordered.slice(0, 20).forEach((f) =>
  console.log(`  ${f.path} (imported by ${f.importedBy.length} files)`),
);
```

### Batch conversion script for Lombok @Data POJOs

```typescript
// Semi-automated: reads Java @Data class, outputs TS interface stub
function convertDataClass(javaSource: string): string {
  const lines = javaSource.split('\n');
  const className = lines
    .find((l) => l.includes('class '))
    ?.match(/class\s+(\w+)/)?.[1] ?? 'Unknown';

  const fields: { name: string; type: string; serializedName?: string }[] = [];
  let serializedName: string | undefined;

  for (const line of lines) {
    const snMatch = line.match(/@SerializedName\("(\w+)"\)/);
    if (snMatch) {
      serializedName = snMatch[1];
      continue;
    }

    const fieldMatch = line.match(
      /private\s+(?:final\s+)?(\w+(?:<[\w<>,\s]+>)?)\s+(\w+)\s*;/,
    );
    if (fieldMatch) {
      fields.push({
        type: mapJavaType(fieldMatch[1]),
        name: serializedName ?? fieldMatch[2],
        serializedName,
      });
      serializedName = undefined;
    }
  }

  const fieldLines = fields
    .map((f) => `  ${f.name}: ${f.type};`)
    .join('\n');

  return `export interface ${className} {\n${fieldLines}\n}\n`;
}

function mapJavaType(javaType: string): string {
  const map: Record<string, string> = {
    String: 'string',
    boolean: 'boolean',
    Boolean: 'boolean',
    int: 'number',
    Integer: 'number',
    long: 'number',
    Long: 'number',
    double: 'number',
    Double: 'number',
    float: 'number',
    Float: 'number',
  };
  if (map[javaType]) return map[javaType];
  if (javaType.startsWith('List<')) {
    const inner = javaType.slice(5, -1);
    return `${mapJavaType(inner)}[]`;
  }
  if (javaType.startsWith('Map<')) {
    const [k, v] = javaType.slice(4, -1).split(',').map((s) => s.trim());
    return `Record<${mapJavaType(k)}, ${mapJavaType(v)}>`;
  }
  return javaType; // Keep as-is for custom types (will need manual mapping)
}
```

## pitfalls

- **Converting everything before testing anything**: The biggest risk. Convert 5 model files, compile, test, commit. Then the next 5. Never go more than ~20 files without validating.
- **Ignoring the dependency graph**: Converting a handler before its model types exist forces you to use `any` everywhere, creating tech debt you'll forget to clean up.
- **Inconsistent naming conventions**: If file 1 uses `threadTs` and file 50 uses `thread_ts` for the same field, you'll have runtime bugs. Establish and document conventions in the manifest BEFORE starting.
- **Keeping source and target files**: Having `User.java` and `user.ts` in the repo simultaneously leads to confusion about which is authoritative. Delete the source after confirming the target works.
- **Automating too much**: Semi-automated scripts (like the POJO converter above) produce ~70% correct output. Always review and adjust. Fully automated conversion produces subtle type errors that are harder to find later.
- **Not tracking progress**: After converting 50 of 200 files, it's easy to lose track of what's done. The manifest file is essential for multi-session conversion work.
- **Skipping the hard 20%**: It's tempting to convert all easy POJOs and declare victory. The complex files (middleware, async chains, polymorphic factories) are where the real conversion effort lives. Plan them explicitly.
- **Breaking the build for days**: Use `allowJs: true` to keep the project buildable throughout. If the project must stay deployable during conversion, maintain a working build at all times.

## references

- https://www.typescriptlang.org/tsconfig#allowJs -- allowJs for incremental migration
- https://www.typescriptlang.org/docs/handbook/migrating-from-javascript.html -- official migration guide
- https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html -- .d.ts files for shims

## instructions

Use this expert when facing a large-scale conversion (50+ source files). Before converting any code, read this expert to establish the phase order, create a conversion manifest, and run dependency analysis. Pair with the appropriate language expert (`java-to-ts-ts.md`, `ruby-to-ts-ts.md`, or `js-to-ts-ts.md`) for per-file conversion rules, and `json-serialization-ts.md` for serialization-heavy model conversion.

## research

Deep Research prompt:

"Write a micro expert for large-scale language conversion strategy (100+ files from Java/Ruby/JS to TypeScript). Cover: phased conversion order (models → utils → core → handlers → entry), dependency graph analysis for prioritization, conversion manifest tracking, batch processing patterns, allowJs incremental migration, naming convention decisions, validation checkpoints, and common failure modes in big conversions."
