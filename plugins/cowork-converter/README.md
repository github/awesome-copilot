# cowork-converter

Convert a GitHub Copilot CLI plugin, Claude Code plugin, or any agent-skills directory into a distributable **Microsoft 365 Copilot Cowork package** (`.zip`).

## What it does

Transforms an existing plugin into the M365 Unified App Manifest v1.28 format required by Copilot Cowork:

- Discovers all skills (`SKILL.md` files) from Copilot CLI, Claude Code, or bare-skills layouts
- Validates name/folder match and companion file limits per the Cowork spec
- Resolves shared top-level references into per-skill `references/` folders
- Generates `manifest.json` with `agentSkills[]` entries
- Creates solid-color placeholder icons if none exist (pure stdlib PNG, no dependencies)
- Packages a compliant `.zip` rooted at `manifest.json`
- Prints a per-skill validation report

## Usage

After installing the plugin, ask Copilot:

> *"Convert my plugin at ~/my-plugin to a Cowork package"*  
> *"Package these skills as a Cowork zip"*  
> *"Build a cowork.zip from this Claude plugin"*

Or run the script directly:

```bash
python skills/cowork-converter/scripts/convert.py \
  --source    ./my-plugin \
  --output    ./dist \
  --name-short        "My Plugin" \
  --name-full         "My Plugin for Copilot Cowork" \
  --description-short "One-line description" \
  --description-full  "Full description." \
  --developer-name    "Your Name" \
  --website           "https://example.com" \
  --privacy-url       "https://example.com/privacy" \
  --terms-url         "https://example.com/terms"
```

## Requirements

- Python 3.8+ (standard library only, no third-party packages)

## Output

```
<plugin-name>-cowork/
├── manifest.json
├── color.png              # 192×192
├── outline.png            # 32×32
└── skills/
    └── <skill-name>/
        ├── SKILL.md
        └── references/
<plugin-name>-cowork.zip
```

## Source

Plugin maintained at [sebastian-sieber/cowork-converter](https://github.com/sebastian-sieber/cowork-converter).
