# project.scaffold-files-ts

## purpose

Project file structure, package.json dependencies, tsconfig, .env setup, npm scripts, appPackage directory, and CLI scaffolding for Teams SDK v2.

## rules

1. Every Teams SDK v2 project requires these base dependencies: `@microsoft/teams.api`, `@microsoft/teams.apps`, `@microsoft/teams.cards`, `@microsoft/teams.common`, `@microsoft/teams.dev`. These are always present regardless of features. Dev dependencies are: `@types/node` (^22.5.4), `dotenv` (^16.4.5), `rimraf` (^6.0.1), `tsx` (^4.20.6), `tsup` (^8.4.0), `typescript` (^5.4.5). [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
2. Feature-specific dependencies must be added based on the selected capabilities: AI/LLM requires `@microsoft/teams.ai` + `@microsoft/teams.openai`; Authentication/Graph requires `@microsoft/teams.graph` + `@microsoft/teams.graph-endpoints`; Graph beta API requires `@microsoft/teams.graph-endpoints-beta`; MCP Server requires `@microsoft/teams.mcp` + `@modelcontextprotocol/sdk` + `zod`; MCP Client requires `@microsoft/teams.mcpclient` + `@microsoft/teams.ai` + `@microsoft/teams.openai` + `@modelcontextprotocol/sdk`; A2A requires `@microsoft/teams.a2a` + `@microsoft/teams.ai` + `@microsoft/teams.openai`. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
3. Standard npm scripts are: `"clean": "npx rimraf ./dist"`, `"build": "npx tsup"`, `"start": "node -r dotenv/config ."`, `"dev": "tsx watch -r dotenv/config src/index.ts"`. The `dev` script uses `tsx` for TypeScript execution with file watching. The `start` script runs the compiled output from `dist/`. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
4. The `tsconfig.json` must use `"module": "NodeNext"`, `"target": "ESNext"`, `"moduleResolution": "NodeNext"`, `"strict": true`, `"outDir": "dist"`, `"rootDir": "src"`, and `"types": ["node"]`. The `include` array targets `"src/**/*.ts"`. These settings align with the Teams SDK v2 package expectations. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
5. The `.env` file always includes `CLIENT_ID`, `CLIENT_SECRET`, `TENANT_ID`, and `PORT` (default 3978). For AI features, add `OPENAI_API_KEY` or the Azure OpenAI set (`AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_VERSION`, `AZURE_OPENAI_MODEL_DEPLOYMENT_NAME`). [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
6. The `appPackage/` directory must contain `manifest.json`, `color.png` (192x192), and `outline.png` (32x32). This directory is zipped for sideloading. It is not part of the compiled `dist/` output. [learn.microsoft.com -- App package](https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/build-and-test/apps-package)
7. The CLI scaffolding command is `npx @microsoft/teams.cli@latest new typescript <name> --template <template>` where templates include `echo`, `ai`, `lights`, `auth`, etc. However, for full control over output, create files directly rather than using the CLI. [github.com/microsoft/teams.ts -- cli](https://github.com/microsoft/teams.ts/tree/main/packages/cli)
8. The recommended project structure places the entry point at `src/index.ts` and organizes larger projects into `src/handlers/`, `src/prompts/`, `src/functions/`, `src/cards/`, and `src/services/`. Keep simple bots in a single `src/index.ts`. Only create subdirectories when the project warrants it. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
9. Set `"main": "dist/index"` and `"types": "dist/index"` in `package.json` so the `start` script resolves to the compiled entry point. The `"files": ["dist"]` field restricts published content to the build output. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
10. Run `npx tsc --noEmit` as a build verification gate after creating or modifying source files. This type-checks without producing output. The project must compile cleanly before testing or deploying. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)

## patterns

### Complete package.json with feature dependency table

```typescript
// package.json -- base configuration (always required)
const packageJson = {
  "name": "my-teams-bot",
  "version": "0.0.1",
  "private": true,
  "license": "MIT",
  "main": "dist/index",
  "types": "dist/index",
  "files": ["dist"],
  "scripts": {
    "clean": "npx rimraf ./dist",
    "build": "npx tsup",
    "start": "node -r dotenv/config .",
    "dev": "tsx watch -r dotenv/config src/index.ts"
  },
  "dependencies": {
    // --- Always required ---
    "@microsoft/teams.api": "latest",
    "@microsoft/teams.apps": "latest",
    "@microsoft/teams.cards": "latest",
    "@microsoft/teams.common": "latest",
    "@microsoft/teams.dev": "latest",

    // --- Add per feature ---
    // AI / LLM:
    //   "@microsoft/teams.ai": "latest",
    //   "@microsoft/teams.openai": "latest",

    // Authentication / Graph:
    //   "@microsoft/teams.graph": "latest",
    //   "@microsoft/teams.graph-endpoints": "latest",

    // Graph beta API:
    //   "@microsoft/teams.graph-endpoints-beta": "latest",

    // MCP Server:
    //   "@microsoft/teams.mcp": "latest",
    //   "@modelcontextprotocol/sdk": "latest",
    //   "zod": "latest",

    // MCP Client:
    //   "@microsoft/teams.mcpclient": "latest",
    //   "@microsoft/teams.ai": "latest",
    //   "@microsoft/teams.openai": "latest",
    //   "@modelcontextprotocol/sdk": "latest",

    // A2A (Server or Client):
    //   "@microsoft/teams.a2a": "latest",
    //   "@microsoft/teams.ai": "latest",
    //   "@microsoft/teams.openai": "latest",
  },
  "devDependencies": {
    "@types/node": "^22.5.4",
    "dotenv": "^16.4.5",
    "rimraf": "^6.0.1",
    "tsx": "^4.20.6",
    "tsup": "^8.4.0",
    "typescript": "^5.4.5"
  }
};
```

### tsconfig.json and .env templates

```typescript
// tsconfig.json -- standard configuration
const tsconfig = {
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "module": "NodeNext",
    "target": "ESNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noImplicitAny": true,
    "declaration": true,
    "inlineSourceMap": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": false,
    "resolveJsonModule": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "pretty": true,
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node"]
  },
  "include": ["src/**/*.ts"]
};

// .env -- base variables (always required)
// CLIENT_ID=
// CLIENT_SECRET=
// TENANT_ID=
// PORT=3978
//
// For AI with OpenAI:
// OPENAI_API_KEY=
//
// For AI with Azure OpenAI:
// AZURE_OPENAI_API_KEY=
// AZURE_OPENAI_ENDPOINT=
// AZURE_OPENAI_API_VERSION=2024-02-01
// AZURE_OPENAI_MODEL_DEPLOYMENT_NAME=
```

### Recommended project structure

```typescript
// Minimal project (simple bot)
// my-teams-bot/
// ├── appPackage/
// │   ├── manifest.json      # Teams app manifest
// │   ├── color.png           # 192x192 app icon
// │   └── outline.png         # 32x32 outline icon
// ├── src/
// │   └── index.ts            # App entry point (all logic here)
// ├── .env                    # Environment variables
// ├── package.json
// └── tsconfig.json

// Expanded project (complex agent)
// my-teams-bot/
// ├── appPackage/
// │   ├── manifest.json
// │   ├── color.png
// │   └── outline.png
// ├── src/
// │   ├── index.ts            # App entry point, App init, start
// │   ├── handlers/           # Message and invoke handlers
// │   │   ├── messages.ts
// │   │   └── cardActions.ts
// │   ├── prompts/            # AI prompt configurations
// │   │   └── mainPrompt.ts
// │   ├── functions/          # AI function definitions
// │   │   ├── weather.ts
// │   │   └── search.ts
// │   ├── cards/              # Adaptive Card templates
// │   │   ├── welcomeCard.ts
// │   │   └── feedbackCard.ts
// │   └── services/           # API clients, business logic
// │       └── apiClient.ts
// ├── .env
// ├── package.json
// └── tsconfig.json

// CLI scaffolding (alternative to manual creation):
// npx @microsoft/teams.cli@latest new typescript my-teams-bot --template echo
// cd my-teams-bot
// npm install
```

## pitfalls

- **Missing base dependencies**: Omitting any of the five core packages (`teams.api`, `teams.apps`, `teams.cards`, `teams.common`, `teams.dev`) causes import errors. Always include all five.
- **Wrong `main` field**: Setting `"main": "src/index"` instead of `"main": "dist/index"` causes the `start` script to fail because it runs compiled JS. The `dev` script uses `tsx` and runs TypeScript directly from `src/`.
- **Missing `dotenv` in dev script**: The `-r dotenv/config` flag in both `start` and `dev` scripts requires `dotenv` as a devDependency. Without it, environment variables are not loaded and credentials fail silently.
- **`tsconfig` module mismatch**: Using `"module": "commonjs"` instead of `"NodeNext"` causes runtime import errors with the Teams SDK packages which use ESM-compatible patterns.
- **Forgetting `appPackage/` icons**: The manifest references `color.png` and `outline.png`. Missing or wrong-sized icons cause Teams to reject the app package on upload.
- **Not running `npx tsc --noEmit`**: Skipping the type-check gate means type errors surface only at runtime or in production. Always verify before testing.
- **Using `npm start` during development**: The `start` script runs compiled JS from `dist/`. Use `npm run dev` during development for live TypeScript reloading with `tsx watch`.
- **Installing feature packages without code**: Adding `@microsoft/teams.ai` to `package.json` but not importing or using it adds unnecessary weight. Only add dependencies you actually use in code.

## references

- [Teams SDK v2 GitHub repository](https://github.com/microsoft/teams.ts)
- [Teams SDK v2 -- @microsoft/teams.cli](https://github.com/microsoft/teams.ts/tree/main/packages/cli)
- [Teams SDK v2 -- Package catalog](https://github.com/microsoft/teams.ts#packages)
- [Teams: App package structure](https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/build-and-test/apps-package)
- [tsup documentation](https://tsup.egoist.dev/)
- [tsx documentation](https://github.com/privatenumber/tsx)

## instructions

This expert covers the canonical project scaffold for a Teams SDK v2 TypeScript bot. Use it when you need to:

- Create a new project from scratch with the correct file structure
- Set up `package.json` with base and feature-specific dependencies
- Configure `tsconfig.json` for Teams SDK v2 compatibility
- Create a `.env` file with the correct variables per feature set
- Understand the recommended directory layout for simple and complex projects
- Use the CLI (`npx @microsoft/teams.cli`) for quick scaffolding
- Configure npm scripts for clean, build, start, and dev workflows
- Set up the `appPackage/` directory with manifest and icons
- Run build verification with `npx tsc --noEmit`

Pair with `runtime.app-init-ts.md` for the `src/index.ts` entry point code and `runtime.manifest-ts.md` for the `appPackage/manifest.json` structure. Pair with `runtime.app-init-ts.md` for the src/index.ts entry point, and `runtime.manifest-ts.md` for appPackage/manifest.json details.

## research

Deep Research prompt:

"Write a micro expert defining the canonical file scaffold for a Teams SDK v2 TypeScript bot project. Cover package.json with all base dependencies (@microsoft/teams.api, teams.apps, teams.cards, teams.common, teams.dev) and the complete feature dependency table (AI, Auth/Graph, Graph beta, MCP Server, MCP Client, A2A, RAG), devDependencies (@types/node, dotenv, rimraf, tsx, tsup, typescript), npm scripts (clean/build/start/dev), tsconfig.json with NodeNext module and ESNext target, .env template with base and feature-specific variables, appPackage/ directory with manifest.json and icon requirements, recommended directory structure (minimal vs expanded), CLI scaffolding with npx @microsoft/teams.cli, and build verification with npx tsc --noEmit. Include the full package.json template, tsconfig.json, and directory tree."
