---
name: create-canvas-extension
description: 'Create or register a canvas extension in the awesome-copilot repository. Use when asked to scaffold a new canvas extension, create its plugin.json, add a reusable extension to one or more plugins, or migrate extension metadata. Extensions are reusable source under extensions/; shippable plugin manifests belong under plugins/.'
argument-hint: '[optional extension name or description]'
---

# Create a canvas extension

Use this skill only for the `github/awesome-copilot` repository. Canvas extensions are reusable source components. They do not have a `plugin.json` under `extensions/`.

## Required decisions

Before creating files, ask for each missing value:

1. **Extension ID**: lowercase kebab-case, matching the source folder and plugin name.
2. **Display metadata**:
   - description
   - version (default `1.0.0`)
   - author name and optional URL
   - keywords (lowercase, hyphenated, maximum 10)
   - repository and license (default to the repository URL and `MIT` when appropriate)
3. **Canvas entrypoint**: confirm whether the extension already has `extension.mjs`. If not, create a minimal entrypoint only when the user provides enough implementation details; otherwise create the directory and leave an explicit TODO.
4. **Preview image**: obtain an existing `assets/preview.png` path or ask the user to add it. Do not invent a binary image or silently use a misleading placeholder.
5. **Plugin registration**:
   - For a standalone installable canvas plugin, create `plugins/<extension-id>`.
   - For an extension that belongs to an existing plugin, ask for the parent plugin ID and add `./extensions/<extension-id>` to that plugin's `extensions.com.github.awesome-copilot.extensions`.
   - If the extension should be shipped by multiple plugins, collect all plugin IDs and add the same extension ID to each mapping file.

## Files to create

For a new extension plugin, create this structure:

```text
extensions/<extension-id>/
├── extension.mjs
└── assets/
    └── preview.png

plugins/<extension-id>/
├── plugin.json
└── README.md
```

The extension source may contain additional files such as `package.json`, canvas assets, or supporting modules. Keep all reusable implementation files under `extensions/<extension-id>/`.

Create `plugins/<extension-id>/plugin.json` with this shape:

```json
{
  "$schema": "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
  "name": "<extension-id>",
  "description": "<description>",
  "version": "1.0.0",
  "author": {
    "name": "<author>"
  },
  "repository": "https://github.com/github/awesome-copilot",
  "license": "MIT",
  "keywords": [
    "<keyword>"
  ],
  "extensions": {
    "com.github.copilot": {
      "logo": "assets/preview.png"
    },
    "com.github.awesome-copilot": {
      "extensions": [
        "./extensions/<extension-id>"
      ]
    }
  }
}
```

Keep Agent Plugins fields at the manifest top level. Repository composition belongs only under `extensions.com.github.awesome-copilot`; do not put `agents`, `commands`, `hooks`, or `skills` at the top level or directly under `extensions`. MCP servers are declared in `mcp.json` at the plugin root, never in `plugin.json`. Do not add `x-awesome-copilot`, `standalone`, or other repository-specific top-level fields.

For an existing parent plugin, create or update:

```text
plugins/<parent-plugin>/plugin.json (`extensions.com.github.awesome-copilot.extensions`)
```

Its `extensions` property must contain sorted repository-relative paths:

```json
{
  "extensions": [
    "./extensions/<extension-id>"
  ]
}
```

Do not copy the extension source into the parent plugin. Materialization resolves the IDs from the root `extensions/` directory, so the same source can be bundled by multiple plugins.

## Workflow

1. Inspect the repository before editing:
   - confirm `extensions/<extension-id>` and `plugins/<extension-id>` do not already conflict
   - inspect the target parent plugin, if any
   - check whether a preview image and entrypoint already exist
2. Ask only the missing required questions from the decisions above.
3. Create the source and plugin directories with the required files.
4. If creating a new entrypoint, keep it minimal and clearly mark implementation TODOs rather than fabricating behavior.
5. Add or update `extensions.com.github.awesome-copilot.extensions` for every parent plugin that should ship the extension. Keep paths alphabetically sorted and unique.
6. Ensure there is no `extensions/<extension-id>/.github/plugin/plugin.json`.
7. Run:

   ```bash
   npm run plugin:validate
   npm run build
   npm run website:data
   ```

8. Report the created paths, the plugins that ship the extension, and any missing user-provided assets or TODOs.

## Existing extension migration

When migrating an existing extension:

1. Move its existing manifest to `plugins/<extension-id>/plugin.json`.
2. Update the manifest to the namespace-based `extensions.com.github.copilot.logo` shape.
3. Remove the old manifest from `extensions/<extension-id>`.
4. Register the extension in any parent plugin's `extensions.com.github.awesome-copilot.extensions`.
5. Run the validation and build commands above.
