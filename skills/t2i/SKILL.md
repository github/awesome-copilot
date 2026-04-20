---
name: t2i
description: 'Use the t2i CLI to generate AI images from text prompts via Microsoft Foundry providers (FLUX.2, MAI-Image-2). Activate when the user asks to generate images, automate image creation in scripts, or set up image generation for CI/CD.'
---

# t2i — Text-to-Image CLI Skill

This skill teaches AI agents (GitHub Copilot, Claude Code, and MCP-aware assistants) how to use the **t2i** command-line tool for image generation. Learn the commands, workflows, and best practices for automating text-to-image tasks in scripts and terminal environments.

## When to Use This Skill

Activate this skill when:
- User asks to generate an image from a text prompt
- User mentions text-to-image, image generation, or AI images
- User wants to automate image generation in a script or pipeline
- User needs batch image generation across multiple prompts
- User is setting up image generation for CI/CD or deployment workflows
- User requests help with t2i command syntax or configuration

## Quick Reference

| Command | Purpose |
|---------|---------|
| `t2i config` | Interactive setup wizard (provider, API keys) |
| `t2i "<prompt>"` | Generate one image from a text prompt |
| `t2i "<prompt>" --provider <p> --output <file>` | Generate with specific provider and filename |
| `t2i providers` | List available image generation providers |
| `t2i secrets set <provider>` | Configure or rotate API credentials securely |
| `t2i secrets list` | Show stored secrets (redacted) |
| `t2i doctor` | Run diagnostics (config, API connectivity, secrets) |
| `t2i version` | Show version and commit SHA |
| `t2i init` | Write `.github/skills/t2i/SKILL.md` and `.claude/skills/t2i/SKILL.md` to current repo |

## Providers

Two cloud providers available in the **Lite** edition:

| Provider | Model | Use For |
|----------|-------|---------|
| `foundry-flux2` | FLUX.2 Pro | High-quality images, fine-grained control, batch jobs |
| `foundry-mai2` | MAI-Image-2 | Fast iteration, rich prompt understanding, synchronous API |

**Default:** `foundry-flux2` if user doesn't specify `--provider`.

## Common Workflows

### 1. First-Time Setup

```bash
# Step 1: Interactive config
t2i config

# Step 2: Enter API credentials when prompted
# (CLI stores securely via DPAPI on Windows, encrypted on macOS/Linux)

# Step 3: Verify connection
t2i doctor

# Step 4: Generate your first image
t2i "a robot painting a landscape"
```

**Agent tip:** If user skips `t2i config`, they'll get a "not configured" error. Always suggest running it first.

### 2. Generate One Image

```bash
# Basic: uses default provider and outputs to current directory
t2i "a cyberpunk city at night, neon lights"

# With custom filename
t2i "a robot waving" --output my-robot.png

# Specific provider and dimensions
t2i "minimalist line art of a cat" \
  --provider foundry-mai2 \
  --width 1024 \
  --height 1024 \
  --output cat.png
```

### 3. Batch Generate via Shell Loop

**Bash:**
```bash
#!/bin/bash
prompts=(
  "a robot painting a landscape"
  "a cyberpunk city at night"
  "a watercolor painting of a castle"
)

for prompt in "${prompts[@]}"; do
  echo "Generating: $prompt"
  t2i "$prompt" --output "image-$(date +%s).png"
  sleep 2  # rate limiting
done
```

**PowerShell:**
```powershell
$prompts = @(
    "a robot painting a landscape",
    "a cyberpunk city at night",
    "a watercolor painting of a castle"
)

foreach ($prompt in $prompts) {
    Write-Host "Generating: $prompt"
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    & t2i $prompt --output "image-$timestamp.png"
    Start-Sleep -Seconds 2  # rate limiting
}
```

## Important Rules for Agents

1. **Always verify config first** — Before suggesting any image generation command, check if the user has run `t2i config`. If they haven't, suggest it: "Run `t2i config` first to set up your provider and credentials."

2. **Never expose API keys** — Do not include API keys, tokens, or secrets in code examples, commit messages, or logs. Always direct users to `t2i secrets set` for credential management.

3. **Use environment variables in CI/CD** — For GitHub Actions, Azure Pipelines, or other CI systems, prefer setting `T2I_FOUNDRY_FLUX2_API_KEY` or `T2I_FOUNDRY_MAI2_API_KEY` as secrets, not hardcoded in scripts.

4. **Default to foundry-flux2** — If the user doesn't specify a provider, use `foundry-flux2`. It offers the best quality and control. Only suggest `foundry-mai2` if the user prefers speed or has specific MAI compatibility needs.

5. **Use `--output <file>` for predictable filenames** — When scripting batch jobs, always specify `--output` to ensure consistent, parseable filenames. Without it, images go to `generated_<random>.png`.

6. **Run `t2i doctor` to diagnose issues** — If the user reports generation failures or API errors, always suggest `t2i doctor` first. It checks config, secrets, API connectivity, and permission issues in one command.

7. **Suggest `t2i init` for new repos** — When onboarding a new project or repo, offer to run `t2i init` so future AI agents (Copilot, Claude Code) working on that repo will know how to use t2i.

## Secrets & Security

**Storage Priority** (checked in this order):
1. **Environment variables** — `T2I_<PROVIDER>_<FIELD>` (best for CI/CD)
2. **DPAPI** (Windows) — `%LOCALAPPDATA%\t2i\secrets.dpapi` encrypted per-user
3. **Plaintext file** (macOS/Linux) — `~/.config/t2i/secrets.json` with `0600` permissions

**In CI/CD:**
```yaml
# GitHub Actions example
env:
  T2I_FOUNDRY_FLUX2_API_KEY: ${{ secrets.T2I_API_KEY }}
  T2I_FOUNDRY_FLUX2_ENDPOINT: ${{ secrets.T2I_ENDPOINT }}

steps:
  - run: t2i "your prompt" --output image.png
```

**For local development:**
- Run `t2i secrets set foundry-flux2` to store credentials securely
- Never commit secrets files — add `~/.config/t2i/` and `%APPDATA%\t2i\` to `.gitignore`

## More Info

- **Full documentation:** [docs/cli-tool.md](https://github.com/elbruno/ElBruno.Text2Image/blob/main/docs/cli-tool.md)
- **GitHub repository:** [elbruno/ElBruno.Text2Image](https://github.com/elbruno/ElBruno.Text2Image)
- **Package:** [NuGet: ElBruno.Text2Image.Cli](https://www.nuget.org/packages/ElBruno.Text2Image.Cli/)
- **Report issues:** [GitHub Issues](https://github.com/elbruno/ElBruno.Text2Image/issues)
