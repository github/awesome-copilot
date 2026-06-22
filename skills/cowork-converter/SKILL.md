---
name: cowork-converter
description: "Convert a GitHub Copilot CLI plugin, Claude Code plugin, or any agent-skills directory into a Microsoft 365 Copilot Cowork package (.zip). Use when the user asks to convert, package, or publish a plugin to Cowork, mentions 'Cowork plugin', 'M365 Cowork', or asks to create a cowork.zip. Also triggers if the user asks to transform skills for Microsoft 365 Copilot distribution."
---

# Cowork Plugin Converter

Convert any Copilot CLI / Claude Code plugin into a distributable Microsoft 365 Copilot Cowork package.

## What this skill produces

```
<plugin-name>-cowork/
├── manifest.json          # M365 Unified App Manifest v1.28 with agentSkills
├── color.png              # 192×192 color icon
├── outline.png            # 32×32 outline icon
└── skills/
    └── <skill-name>/
        ├── SKILL.md
        └── references/   # Per-skill copy of shared reference files
<plugin-name>-cowork.zip  # Ready-to-sideload package
```

## Inputs to gather

Before running the conversion script, confirm:

1. **Source plugin directory** — the folder containing the existing skills. If not provided, ask the user.
2. **Output directory** — where to write the cowork package. Default: parent of source dir.
3. **Plugin name** — short (≤30 chars) and full display name. Infer from source directory name if `plugin.json` / `manifest.json` is absent, then confirm with user.
4. **Description** — short (≤80 chars) and full (≤4000 chars). Infer from existing metadata if available.
5. **Developer info** — name, website, privacy URL, terms URL. Use reasonable defaults (e.g., from existing plugin.json), but confirm if absent.
6. **Accent color** — hex code. Default `#0078D4`.
7. **Icons** — check whether `color.png` and `outline.png` already exist at the source root. If absent, generate solid-color placeholders using the script.

## Source formats recognised

| Source format | Skill detection | Shared refs detection |
|---|---|---|
| Copilot CLI plugin (`skills/*/skill.md` or `SKILL.md`) | Walk `skills/` sub-dirs | `references/` at plugin root |
| Claude Code plugin (`.claude-plugin/plugin.json` + `skills/`) | Walk `skills/` sub-dirs | Top-level `.md` files listed in `plugin.json` |
| Bare skills directory (`*/SKILL.md` at root) | Walk root sub-dirs | Any `references/` or `*.md` at root |

## Conversion workflow

Run `scripts/convert.py` (shown below). If it fails, follow the manual steps.

### Step 1 — Run the converter script

```bash
python ~/.copilot/skills/cowork-converter/scripts/convert.py \
  --source <source-plugin-dir> \
  --output <output-dir> \
  --name-short "My Plugin" \
  --name-full "My Plugin for Copilot Cowork" \
  --description-short "One-line description" \
  --description-full "Full description up to 4000 chars." \
  --developer-name "Your Name" \
  --website "https://example.com" \
  --privacy-url "https://example.com/privacy" \
  --terms-url "https://example.com/terms" \
  --accent-color "#0078D4"
```

The script:
- Discovers all skills in the source directory
- Validates each skill's `name` frontmatter matches its folder name
- Copies skills to `skills/<name>/SKILL.md`
- Copies companion files (references, scripts, etc.) into each skill's folder
- Resolves shared top-level references: copies them into every skill's `references/` folder that links to them
- Generates `manifest.json` with all `agentSkills` entries
- Creates placeholder icons if none exist (solid `#0078D4` squares)
- Packages everything into `<plugin-name>-cowork.zip`
- Prints a validation report

### Step 2 — Review the validation report

The script outputs a table like:

```
Skill               Folder/name match   Companion files   Size
audit               ✓                   5/20              42 KB
design-qa           ✓                   5/20              38 KB
...
TOTAL: 11 skills, all valid
```

Fix any `✗` entries before distributing.

### Step 3 — Replace placeholder icons (if needed)

If placeholder icons were generated, the script warns you. Replace them:
- `color.png`: 192×192 px, full-color PNG
- `outline.png`: 32×32 px, single-color outline PNG

### Step 4 — Sideload for testing

```bash
npm install -g @microsoft/m365agentstoolkit-cli
atk auth login
atk install --file-path <plugin-name>-cowork.zip --scope Personal
```

### Step 5 — Publish to tenant

Upload via **M365 Admin Center → Manage Apps → Upload custom app**, then enable in **Cowork → Sources & Skills**.

## Validation rules (enforce these)

- Skill folder name must exactly match the `name` field in `SKILL.md` frontmatter (kebab-case)
- `name` field: 1–64 chars, kebab-case only (lowercase, hyphens, no underscores, no consecutive hyphens)
- `description` field: 1–1024 chars
- Max 20 companion files per skill
- Max 5 MB per companion file, max 10 MB total per skill
- No path traversal (`..`) in companion file paths
- No hidden files (`.` prefix) as companion files
- Icons must be PNG; `color.png` must be 192×192, `outline.png` must be 32×32

## What is NOT converted (inform the user)

| Source feature | Status |
|---|---|
| `commands/` (slash commands) | Not supported in Cowork |
| `agents/` sub-agents or `agents/openai.yaml` | Not supported in Cowork |
| `hooks/` event handlers | Not supported in Cowork |
| `settings.json` | Not applicable |
| `bin/` executables | Not applicable |
| `.mcp.json` MCP servers | Converted to `agentConnectors[]` if URL is present |

## MCP connector conversion (optional)

If the source has a `.mcp.json` with remote HTTPS server entries, add them to `manifest.json`:

```json
"agentConnectors": [
  {
    "id": "<server-id>",
    "displayName": "<display name>",
    "description": "<description>",
    "toolSource": {
      "remoteMcpServer": {
        "mcpServerUrl": "<https url>",
        "authorization": {
          "type": "OAuthPluginVault",
          "referenceId": "<oauth-registration-id>"
        }
      }
    }
  }
]
```

Local (`stdio`) MCP servers cannot be converted — inform the user.

## Final response

After a successful conversion, report:

- Output directory path
- Zip file path
- Number of skills converted
- List of skills with companion file counts
- Any features skipped (not supported in Cowork)
- Icon status (original vs generated placeholder)
- Next step: sideload command
