# Runnable Recipe Examples

This folder contains standalone, executable TypeScript examples for each cookbook recipe. Each file can be run directly with `tsx` or via npm scripts.

## Prerequisites

- Node.js 18 or later
- Install dependencies (this links to the local SDK in the repo):

```bash
npm install
```

## Running Examples

Each `.ts` file is a complete, runnable program. You can run them in two ways:

### Using npm scripts:

```bash
npm run <script-name>
```

### Using tsx directly:

```bash
npx tsx <filename>.ts
```

### Available Recipes

| Recipe               | npm script                     | Direct command                    | Description                                |
| -------------------- | ------------------------------ | --------------------------------- | ------------------------------------------ |
| Error Handling       | `npm run error-handling`       | `npx tsx error-handling.ts`       | Demonstrates error handling patterns       |
| Multiple Sessions    | `npm run multiple-sessions`    | `npx tsx multiple-sessions.ts`    | Manages multiple independent conversations |
| Managing Local Files | `npm run managing-local-files` | `npx tsx managing-local-files.ts` | Organizes files using AI grouping          |
| PR Visualization     | `npm run pr-visualization`     | `npx tsx pr-visualization.ts`     | Generates PR age charts                    |
| Persisting Sessions  | `npm run persisting-sessions`  | `npx tsx persisting-sessions.ts`  | Save and resume sessions across restarts   |

### Examples with Arguments

**PR Visualization with specific repo:**

```bash
npx tsx pr-visualization.ts --repo github/copilot-sdk
```

**Managing Local Files (edit the file to change target folder):**

```bash
# Edit the targetFolder variable in managing-local-files.ts first
npx tsx managing-local-files.ts
```

## Local SDK Development

The `package.json` references the local Copilot SDK using `"*"`, which resolves to the local SDK source. This means:

- Changes to the SDK source are immediately available
- No need to publish or install from npm
- Perfect for testing and development

If you modify the SDK source, you may need to rebuild:

```bash
cd ../../src
npm run build
```

## TypeScript Features

These examples use modern TypeScript/Node.js features:

- Top-level await (requires `"type": "module"` in package.json)
- ESM imports
- Type safety with TypeScript
- async/await patterns

## Learning Resources

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Node.js Documentation](https://nodejs.org/docs/latest/api/)
- [GitHub Copilot SDK for Node.js](https://github.com/github/copilot-sdk/blob/main/nodejs/README.md)
- [Parent Cookbook](../README.md)
