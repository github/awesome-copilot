# TypeScript Project Configuration

Reference material for configuring TypeScript projects, the TypeScript compiler, and build tool integration.

## What is a tsconfig.json

- Reference material for [What is a tsconfig.json](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html)

The presence of a `tsconfig.json` file in a directory indicates that the directory is the root of a TypeScript project. The file specifies the root files and the compiler options required to compile the project.

**How TypeScript locates a `tsconfig.json`:**

- When `tsc` is invoked without input files, the compiler searches for `tsconfig.json` starting in the current directory, then each parent directory
- When `tsc` is invoked with input files directly, `tsconfig.json` is ignored
- Use `tsc --project` (or `tsc -p`) to specify an explicit path to a config file

**Top-level `tsconfig.json` fields:**

```json
{
  "compilerOptions": { },
  "files": ["src/main.ts", "src/utils.ts"],
  "include": ["src/**/*"],
  "exclude": ["node_modules", "**/*.spec.ts"],
  "extends": "./tsconfig.base.json",
  "references": [{ "path": "../shared" }]
}
```

**`files`** — an explicit list of files to include. If any file cannot be found, an error occurs:

```json
{
  "compilerOptions": { "outDir": "dist" },
  "files": [
    "core.ts",
    "app.ts"
  ]
}
```

**`include`** — glob patterns for files to include (supports `*`, `**`, `?`):

```json
{
  "include": ["src/**/*", "tests/**/*"]
}
```

- `*` matches any file segment (excludes directory separators)
- `**` matches any directory nesting depth
- `?` matches any single character

Supported extensions automatically: `.ts`, `.tsx`, `.d.ts`. With `allowJs`: `.js`, `.jsx`.

**`exclude`** — glob patterns for files to exclude. Defaults to `node_modules`, `bower_components`, `jspm_packages`, and the `outDir` if set:

```json
{
  "exclude": ["node_modules", "**/*.test.ts", "dist"]
}
```

Note: `exclude` only prevents files from being *included* automatically — a file referenced via `import` or a triple-slash directive will still be included.

**`extends`** — inherit configuration from a base file:

```json
{
  "extends": "@tsconfig/node18/tsconfig.json",
  "compilerOptions": {
    "outDir": "dist"
  },
  "include": ["src"]
}
```

All relative paths in the base file are resolved relative to the base file. Fields from the inheriting config override the base. Arrays (`files`, `include`, `exclude`) are not merged — they replace the base values entirely.

**`jsconfig.json`** — TypeScript recognizes `jsconfig.json` files as well; they are equivalent to a `tsconfig.json` with `"allowJs": true` set by default.

## Compiler Options in MSBuild

- Reference material for [Compiler Options in MSBuild](https://www.typescriptlang.org/docs/handbook/compiler-options-in-msbuild.html)

TypeScript can be integrated into MSBuild projects (Visual Studio, `.csproj`, `.vbproj`) via the `Microsoft.TypeScript.MSBuild` NuGet package.

**Install the NuGet package:**

```xml
<PackageReference Include="Microsoft.TypeScript.MSBuild" Version="5.0.0" />
```

**TypeScript compiler options in an MSBuild `.csproj` file** are set inside a `<PropertyGroup>`:

```xml
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TypeScriptTarget>ES2020</TypeScriptTarget>
    <TypeScriptModuleKind>ES2020</TypeScriptModuleKind>
    <TypeScriptStrict>true</TypeScriptStrict>
    <TypeScriptSourceMap>true</TypeScriptSourceMap>
    <TypeScriptOutDir>wwwroot/js</TypeScriptOutDir>
    <TypeScriptNoImplicitAny>true</TypeScriptNoImplicitAny>
    <TypeScriptRemoveComments>false</TypeScriptRemoveComments>
    <TypeScriptNoEmitOnError>true</TypeScriptNoEmitOnError>
  </PropertyGroup>
</Project>
```

**Common MSBuild TypeScript properties:**

| MSBuild Property | tsconfig Equivalent | Description |
|---|---|---|
| `TypeScriptTarget` | `target` | ECMAScript output version |
| `TypeScriptModuleKind` | `module` | Module system |
| `TypeScriptOutDir` | `outDir` | Output directory |
| `TypeScriptSourceMap` | `sourceMap` | Emit source maps |
| `TypeScriptStrict` | `strict` | Enable all strict checks |
| `TypeScriptNoImplicitAny` | `noImplicitAny` | Error on implicit `any` |
| `TypeScriptRemoveComments` | `removeComments` | Strip comments |
| `TypeScriptNoEmitOnError` | `noEmitOnError` | Don't emit on errors |
| `TypeScriptDeclaration` | `declaration` | Emit `.d.ts` files |
| `TypeScriptExperimentalDecorators` | `experimentalDecorators` | Enable decorators |
| `TypeScriptjsx` | `jsx` | JSX compilation mode |
| `TypeScriptNoResolve` | `noResolve` | Disable module resolution |
| `TypeScriptPreserveConstEnums` | `preserveConstEnums` | Keep const enum declarations |
| `TypeScriptSuppressImplicitAnyIndexErrors` | `suppressImplicitAnyIndexErrors` | Suppress index implicit any |

**Using a `tsconfig.json` with MSBuild** (preferred over individual properties):

```xml
<PropertyGroup>
  <TypeScriptCompileBlocked>true</TypeScriptCompileBlocked>
</PropertyGroup>
<Target Name="CompileTypeScript" BeforeTargets="Build">
  <Exec Command="tsc -p tsconfig.json" />
</Target>
```

**Compile TypeScript as part of the build** automatically by including `.ts` files:

```xml
<ItemGroup>
  <TypeScriptCompile Include="src\**\*.ts" />
</ItemGroup>
```

## TSConfig Reference

- Reference material for [TSConfig Reference](https://www.typescriptlang.org/tsconfig/)

Comprehensive reference for all TypeScript compiler options available in `tsconfig.json`.

### Type Checking Options

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "useUnknownInCatchVariables": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "allowUnusedLabels": false,
    "allowUnreachableCode": false
  }
}
```

| Option | Default | Description |
|---|---|---|
| `strict` | `false` | Enable all strict type-checking options |
| `noImplicitAny` | `false` | Error on expressions with an implied `any` type |
| `strictNullChecks` | `false` | `null`/`undefined` not assignable to other types |
| `strictFunctionTypes` | `false` | Stricter checking of function parameter types (contravariant) |
| `strictBindCallApply` | `false` | Strict checking of `bind`, `call`, and `apply` methods |
| `strictPropertyInitialization` | `false` | Properties must be initialized in the constructor |
| `noImplicitThis` | `false` | Error on `this` expressions with an implied `any` type |
| `useUnknownInCatchVariables` | `false` | Catch clause variables are `unknown` instead of `any` |
| `alwaysStrict` | `false` | Parse in strict mode; emit `"use strict"` in output |
| `noUnusedLocals` | `false` | Report errors on unused local variables |
| `noUnusedParameters` | `false` | Report errors on unused function parameters |
| `exactOptionalPropertyTypes` | `false` | Distinguish between `undefined` value and missing key |
| `noImplicitReturns` | `false` | Report error when not all code paths return a value |
| `noFallthroughCasesInSwitch` | `false` | Report errors for fallthrough cases in `switch` |
| `noUncheckedIndexedAccess` | `false` | Include `undefined` in index signature return type |
| `noImplicitOverride` | `false` | Require `override` keyword for overridden methods |

### Module Options

```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "baseUrl": "./",
    "paths": { "@app/*": ["src/*"] },
    "rootDirs": ["src", "generated"],
    "typeRoots": ["./typings", "./node_modules/@types"],
    "types": ["node", "jest"],
    "allowUmdGlobalAccess": false,
    "moduleSuffixes": [".ios", ".native", ""],
    "allowImportingTsExtensions": true,
    "resolvePackageJsonExports": true,
    "resolvePackageJsonImports": true,
    "customConditions": ["my-condition"],
    "resolveJsonModule": true,
    "allowArbitraryExtensions": true,
    "noResolve": false
  }
}
```

| Option | Description |
|---|---|
| `module` | Module system: `CommonJS`, `ES2015`–`ES2022`, `ESNext`, `Node16`, `NodeNext`, `Preserve` |
| `moduleResolution` | Resolution strategy: `classic`, `node`, `node16`, `nodenext`, `bundler` |
| `baseUrl` | Base directory for non-relative module names |
| `paths` | Re-map module names to different locations |
| `rootDirs` | Virtual merged directory for module resolution |
| `typeRoots` | Directories to include type definitions from |
| `types` | Only include these `@types` packages globally |
| `resolveJsonModule` | Allow importing `.json` files |
| `esModuleInterop` | Emit compatibility helpers for CommonJS/ES module interop |
| `allowSyntheticDefaultImports` | Allow `import x from 'module'` even without a default export |

### Emit Options

```json
{
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "emitDeclarationOnly": false,
    "sourceMap": true,
    "inlineSourceMap": false,
    "outFile": "./output.js",
    "outDir": "./dist",
    "removeComments": false,
    "noEmit": false,
    "importHelpers": true,
    "importsNotUsedAsValues": "remove",
    "downlevelIteration": false,
    "sourceRoot": "",
    "mapRoot": "",
    "inlineSources": false,
    "emitBOM": false,
    "newLine": "lf",
    "stripInternal": false,
    "noEmitHelpers": false,
    "noEmitOnError": true,
    "preserveConstEnums": false,
    "declarationDir": "./types",
    "preserveValueImports": false
  }
}
```

| Option | Default | Description |
|---|---|---|
| `declaration` | `false` | Generate `.d.ts` files from TS/JS files |
| `declarationMap` | `false` | Generate source maps for `.d.ts` files |
| `emitDeclarationOnly` | `false` | Only output `.d.ts` files, no JS |
| `sourceMap` | `false` | Generate `.js.map` source map files |
| `outDir` | — | Redirect output structure to the directory |
| `outFile` | — | Concatenate and emit output to a single file |
| `removeComments` | `false` | Strip all comments from TypeScript files |
| `noEmit` | `false` | Do not emit compiler output files |
| `noEmitOnError` | `false` | Do not emit if any type checking errors were reported |
| `importHelpers` | `false` | Import helper functions from `tslib` |
| `downlevelIteration` | `false` | Emit more compliant, but verbose JS for iterables |
| `declarationDir` | — | Output directory for generated declaration files |

### JavaScript Support Options

```json
{
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "maxNodeModuleJsDepth": 0
  }
}
```

| Option | Default | Description |
|---|---|---|
| `allowJs` | `false` | Allow JavaScript files to be imported in the project |
| `checkJs` | `false` | Enable error reporting in JS files (requires `allowJs`) |
| `maxNodeModuleJsDepth` | `0` | Max depth to search `node_modules` for JS files |

### Language and Environment Options

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "jsxFactory": "React.createElement",
    "jsxFragmentFactory": "React.Fragment",
    "jsxImportSource": "react",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "useDefineForClassFields": true,
    "moduleDetection": "force"
  }
}
```

| Option | Default | Description |
|---|---|---|
| `target` | `ES3` | Set the JS language version: `ES3`, `ES5`, `ES2015`–`ES2022`, `ESNext` |
| `lib` | (based on `target`) | Bundled library declaration files to include |
| `jsx` | — | JSX code generation: `preserve`, `react`, `react-jsx`, `react-jsxdev`, `react-native` |
| `experimentalDecorators` | `false` | Enable experimental support for decorators |
| `emitDecoratorMetadata` | `false` | Emit design-type metadata for decorated declarations |
| `useDefineForClassFields` | `true` (ES2022+) | Use `Object.defineProperty` for class fields |
| `moduleDetection` | `auto` | Strategy for detecting if a file is a script or module |

### Interop Constraints

```json
{
  "compilerOptions": {
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "preserveSymlinks": false,
    "forceConsistentCasingInFileNames": true
  }
}
```

| Option | Default | Description |
|---|---|---|
| `isolatedModules` | `false` | Ensure each file can be safely transpiled in isolation |
| `verbatimModuleSyntax` | `false` | Do not transform/elide any imports or exports not marked `type` |
| `esModuleInterop` | `false` | Emit additional JS to ease support for CJS modules |
| `allowSyntheticDefaultImports` | `false` | Allow default imports from non-default-exporting modules |
| `forceConsistentCasingInFileNames` | `false` | Ensure imports have consistent casing |

### Completeness / Performance Options

```json
{
  "compilerOptions": {
    "skipDefaultLibCheck": false,
    "skipLibCheck": true
  }
}
```

| Option | Default | Description |
|---|---|---|
| `skipLibCheck` | `false` | Skip type checking of all declaration files (`.d.ts`) |
| `skipDefaultLibCheck` | `false` | Skip type checking of default TypeScript lib files |

### Projects / Incremental Compilation

```json
{
  "compilerOptions": {
    "incremental": true,
    "composite": true,
    "tsBuildInfoFile": "./.tsbuildinfo",
    "disableSourceOfProjectReferenceRedirect": false,
    "disableSolutionSearching": false,
    "disableReferencedProjectLoad": false
  }
}
```

| Option | Default | Description |
|---|---|---|
| `incremental` | `false` | Save information about last compilation to speed up future builds |
| `composite` | `false` | Required for project references; enforces constraints for project structure |
| `tsBuildInfoFile` | `.tsbuildinfo` | File path to store incremental compilation information |

### Output Formatting / Diagnostics

```json
{
  "compilerOptions": {
    "noErrorTruncation": false,
    "diagnostics": false,
    "extendedDiagnostics": false,
    "listFiles": false,
    "listEmittedFiles": false,
    "traceResolution": false,
    "explainFiles": false
  }
}
```

## tsc CLI Options

- Reference material for [tsc CLI Options](https://www.typescriptlang.org/docs/handbook/compiler-options.html)

The TypeScript compiler `tsc` can be invoked from the command line to compile TypeScript files. Most `tsconfig.json` options can also be passed as CLI flags.

**Basic usage:**

```bash
# Compile a single file
tsc app.ts

# Use a specific tsconfig
tsc --project tsconfig.json
tsc -p tsconfig.json

# Watch mode
tsc --watch
tsc -w

# Build mode (project references)
tsc --build
tsc -b

# Type check only (no emit)
tsc --noEmit

# Show version
tsc --version
tsc -v

# Show help
tsc --help
tsc -h

# Print diagnostic information
tsc --diagnostics
```

**Override tsconfig from CLI:**

```bash
# Compile to ES2020, CommonJS modules, strict mode
tsc --target ES2020 --module commonjs --strict

# Enable source maps and output to dist/
tsc --sourceMap --outDir dist

# Check JS files
tsc --allowJs --checkJs
```

**Important CLI-only flags (not valid in tsconfig):**

| Flag | Description |
|---|---|
| `--build` / `-b` | Build project references in the correct dependency order |
| `--clean` | Delete output files from a `--build` invocation |
| `--dry` | Show what `--build` would do without actually building |
| `--force` | Force a rebuild in `--build` mode |
| `--watch` / `-w` | Watch input files for changes |
| `--project` / `-p` | Compile the project in the given directory or tsconfig |
| `--version` / `-v` | Print the compiler's version |
| `--help` / `-h` | Print help message |
| `--listFilesOnly` | Print names of files that would be part of compilation |
| `--generateTrace` | Generate an event trace and types list |

**Key compiler flags (also available in tsconfig):**

```bash
tsc --target ES2020
tsc --module NodeNext
tsc --moduleResolution NodeNext
tsc --strict
tsc --noImplicitAny
tsc --strictNullChecks
tsc --noEmit
tsc --noEmitOnError
tsc --declaration
tsc --sourceMap
tsc --outDir ./dist
tsc --rootDir ./src
tsc --allowJs
tsc --checkJs
tsc --esModuleInterop
tsc --resolveJsonModule
tsc --skipLibCheck
tsc --lib ES2020,DOM
tsc --jsx react-jsx
tsc --incremental
tsc --composite
```

**Build a project using `--build`:**

```bash
# Build with project references
tsc --build tsconfig.json

# Clean build artifacts
tsc --build --clean

# Rebuild everything (ignore incremental cache)
tsc --build --force

# Dry run to see what would be built
tsc --build --dry --verbose
```

## Project References

- Reference material for [Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)

Project References (introduced in TypeScript 3.0) allow TypeScript programs to be structured into smaller pieces. This improves build times, enforces logical separation between components, and enables code to be organized into new and better ways.

**Basic project reference configuration:**

```json
// tsconfig.json (in the root or a consuming project)
{
  "compilerOptions": {
    "declaration": true
  },
  "references": [
    { "path": "../shared" },
    { "path": "../utils", "prepend": true }
  ]
}
```

**Referenced project requirements (`composite: true` is required):**

```json
// shared/tsconfig.json
{
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

**What `composite: true` enforces:**

- `rootDir` must be set (defaults to directory containing `tsconfig.json`)
- All implementation files must be matched by an `include` pattern or listed in `files`
- `declaration` must be `true`
- `.tsbuildinfo` files are generated for incremental builds

**Building with project references:**

```bash
# Build all projects in dependency order
tsc --build

# Build a specific project
tsc --build src/tsconfig.json

# Clean all project reference build artifacts
tsc --build --clean

# Force full rebuild
tsc --build --force

# Verbose output
tsc --build --verbose
```

**Monorepo `tsconfig.json` layout example:**

```
project/
  tsconfig.json       ← solution-level config
  shared/
    tsconfig.json     ← composite: true
    src/
      index.ts
  server/
    tsconfig.json     ← references shared
    src/
      main.ts
  client/
    tsconfig.json     ← references shared
    src/
      app.ts
```

**Solution-level config (no `include`, only `references`):**

```json
// tsconfig.json
{
  "files": [],
  "references": [
    { "path": "shared" },
    { "path": "server" },
    { "path": "client" }
  ]
}
```

**`prepend` option** — concatenate a project's output before the current project's output (for `outFile` bundling only):

```json
{
  "references": [
    { "path": "../utils", "prepend": true }
  ]
}
```

**`disableSourceOfProjectReferenceRedirect`** — for very large projects, use `.d.ts` instead of source files when following project references (faster but less accurate error reporting):

```json
{
  "compilerOptions": {
    "disableSourceOfProjectReferenceRedirect": true
  }
}
```

**Key benefits of project references:**

- Faster incremental builds — only rebuild changed projects
- Strong logical boundaries between packages
- Better editor responsiveness in large monorepos
- Supports `--build` mode with dependency ordering
- `declarationMap` enables "go to source" navigation across project boundaries

## Integrating with Build Tools

- Reference material for [Integrating with Build Tools](https://www.typescriptlang.org/docs/handbook/integrating-with-build-tools.html)

TypeScript can be integrated with various JavaScript build tools and bundlers.

### Babel

Use `@babel/preset-typescript` to strip TypeScript types using Babel (no type checking — use `tsc --noEmit` separately):

```bash
npm install --save-dev @babel/preset-typescript @babel/core @babel/cli
```

```json
// babel.config.json
{
  "presets": ["@babel/preset-typescript"]
}
```

Compile TypeScript with Babel:

```bash
babel --extensions '.ts,.tsx' src --out-dir dist
```

Note: Babel does not type-check. Run `tsc --noEmit` separately for type checking.

### Webpack

Using `ts-loader`:

```bash
npm install --save-dev ts-loader webpack webpack-cli
```

```js
// webpack.config.js
module.exports = {
  entry: "./src/index.ts",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  output: {
    filename: "bundle.js",
    path: __dirname + "/dist",
  },
};
```

Using `babel-loader` with `@babel/preset-typescript` (type checking separate):

```bash
npm install --save-dev babel-loader @babel/core @babel/preset-env @babel/preset-typescript
```

```js
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env", "@babel/preset-typescript"],
          },
        },
      },
    ],
  },
};
```

### Vite

Vite uses `esbuild` for TypeScript transpilation (no type checking during build — use `tsc --noEmit` separately):

```bash
npm create vite@latest my-app -- --template vanilla-ts
```

```json
// tsconfig.json (Vite-recommended settings)
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true
  }
}
```

### Rollup

Using `@rollup/plugin-typescript`:

```bash
npm install --save-dev @rollup/plugin-typescript tslib
```

```js
// rollup.config.js
import typescript from "@rollup/plugin-typescript";

export default {
  input: "src/index.ts",
  output: {
    file: "dist/bundle.js",
    format: "cjs",
  },
  plugins: [typescript()],
};
```

### Gulp

Using `gulp-typescript`:

```bash
npm install --save-dev gulp-typescript
```

```js
const gulp = require("gulp");
const ts = require("gulp-typescript");

const tsProject = ts.createProject("tsconfig.json");

gulp.task("typescript", function () {
  return tsProject.src().pipe(tsProject()).js.pipe(gulp.dest("dist"));
});
```

### Grunt

Using `grunt-ts`:

```bash
npm install --save-dev grunt-ts
```

```js
// Gruntfile.js
module.exports = function (grunt) {
  grunt.initConfig({
    ts: {
      default: {
        tsconfig: "./tsconfig.json",
      },
    },
  });
  grunt.loadNpmTasks("grunt-ts");
  grunt.registerTask("default", ["ts"]);
};
```

### Browserify

Using `tsify`:

```bash
npm install --save-dev tsify browserify
```

```bash
browserify main.ts -p tsify --debug > bundle.js
```

### Jest

Using `ts-jest` for running TypeScript tests:

```bash
npm install --save-dev ts-jest @types/jest
```

```json
// jest.config.json
{
  "preset": "ts-jest",
  "testEnvironment": "node"
}
```

Using `@swc/jest` for faster transforms:

```bash
npm install --save-dev @swc/jest @swc/core
```

```json
// jest.config.json
{
  "transform": {
    "^.+\\.(t|j)sx?$": "@swc/jest"
  }
}
```

### MSBuild

See the [Compiler Options in MSBuild](#compiler-options-in-msbuild) section above.

## Configuring Watch

- Reference material for [Configuring Watch](https://www.typescriptlang.org/docs/handbook/configuring-watch.html)

TypeScript 3.8+ supports `watchOptions` in `tsconfig.json` to configure how the compiler watches files and directories.

**`watchOptions` configuration:**

```json
{
  "watchOptions": {
    "watchFile": "useFsEvents",
    "watchDirectory": "useFsEvents",
    "fallbackPolling": "dynamicPriority",
    "synchronousWatchDirectory": true,
    "excludeDirectories": ["**/node_modules", "_build"],
    "excludeFiles": ["build/fileWhichChangesOften.ts"]
  }
}
```

**`watchFile` strategies** — controls how individual files are watched:

| Strategy | Description |
|---|---|
| `fixedPollingInterval` | Check files for changes at a fixed interval |
| `priorityPollingInterval` | Check files at different intervals based on heuristics |
| `dynamicPriorityPolling` | Polling interval adjusts dynamically based on change frequency |
| `useFsEvents` (default) | Use OS file system events (`inotify`, `FSEvents`, `ReadDirectoryChangesW`) |
| `useFsEventsOnParentDirectory` | Watch the parent directory instead of individual files |

**`watchDirectory` strategies** — controls how directory trees are watched:

| Strategy | Description |
|---|---|
| `fixedPollingInterval` | Check directory for changes at a fixed interval |
| `dynamicPriorityPolling` | Polling interval adjusts dynamically |
| `useFsEvents` (default) | Use OS file system events for directory watching |

**`fallbackPolling`** — polling strategy to use when OS file system events are unavailable:

| Value | Description |
|---|---|
| `fixedPollingInterval` | Fixed interval polling |
| `priorityPollingInterval` | Priority-based polling |
| `dynamicPriorityPolling` | Dynamic interval polling (default) |

**`synchronousWatchDirectory`** — disable deferred watching on directories (useful on systems that don't support recursive watching natively):

```json
{
  "watchOptions": {
    "synchronousWatchDirectory": true
  }
}
```

**`excludeDirectories`** — reduce the number of directories watched (avoids watching large directories like `node_modules`):

```json
{
  "watchOptions": {
    "excludeDirectories": ["**/node_modules", "dist", ".git"]
  }
}
```

**`excludeFiles`** — exclude specific files from being watched:

```json
{
  "watchOptions": {
    "excludeFiles": ["src/generated/**/*.ts"]
  }
}
```

**Environment variable configuration** — TypeScript watch behavior can also be influenced by the `TSC_WATCHFILE` and `TSC_WATCHDIRECTORY` environment variables:

```bash
# Force polling for file watching
TSC_WATCHFILE=DynamicPriorityPolling tsc --watch

# Force polling for directory watching
TSC_WATCHDIRECTORY=FixedPollingInterval tsc --watch
```

**Recommended watch config for large projects:**

```json
{
  "watchOptions": {
    "watchFile": "useFsEvents",
    "watchDirectory": "useFsEvents",
    "fallbackPolling": "dynamicPriority",
    "excludeDirectories": ["**/node_modules", "dist", "build", ".git"]
  }
}
```

## Nightly Builds

- Reference material for [Nightly Builds](https://www.typescriptlang.org/docs/handbook/nightly-builds.html)

TypeScript publishes nightly builds to npm as the `typescript@next` package, allowing developers to test upcoming features and report bugs before official releases.

**Install the TypeScript nightly build:**

```bash
# Install globally
npm install -g typescript@next

# Install locally in a project
npm install --save-dev typescript@next
```

**Verify the installed version:**

```bash
tsc --version
# Example output: Version 5.x.0-dev.20240115
```

**Using nightly builds in Visual Studio Code:**

1. Install `typescript@next` locally in the project:
   ```bash
   npm install --save-dev typescript@next
   ```

2. Open the VS Code Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)

3. Run **"TypeScript: Select TypeScript Version..."**

4. Choose **"Use Workspace Version"**

This makes VS Code use the project's local TypeScript (the nightly build) instead of the bundled version.

**Setting workspace TypeScript version via `.vscode/settings.json`:**

```json
{
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

**Nightly builds in CI pipelines:**

```json
// package.json
{
  "devDependencies": {
    "typescript": "next"
  },
  "scripts": {
    "typecheck": "tsc --noEmit"
  }
}
```

```yaml
# GitHub Actions example
- name: Install nightly TypeScript
  run: npm install typescript@next
- name: Type check
  run: npx tsc --noEmit
```

**Switching back to a stable release:**

```bash
# Install specific version
npm install --save-dev typescript@5.3.3

# Install latest stable
npm install --save-dev typescript@latest
```

**`@next` vs `@rc`:**

| Tag | Description |
|---|---|
| `typescript@next` | Nightly build — latest development snapshot |
| `typescript@rc` | Release Candidate — nearly stable, pre-release |
| `typescript@latest` | Stable release |
| `typescript@beta` | Beta release — significant features, may have bugs |

**Checking available versions:**

```bash
npm dist-tag ls typescript
```
