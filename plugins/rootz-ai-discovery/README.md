# Rootz AI Discovery Plugin

Scan websites for AI Discovery configuration, analyze AI readiness, and generate `.well-known/ai` files for any project.

## What is AI Discovery?

[AI Discovery](https://rootz.global/ai/standard.md) (`/.well-known/ai`) is a three-tier standard for machine-readable identity:

| Tier | File | Purpose |
|------|------|---------|
| 1 | `ai.json` | Identity, contact, policies |
| 2 | `knowledge.json` | Structured encyclopedia |
| 3 | `feed.json` | AI-optimized content feed |

Think of it as `robots.txt` for the AI age — but instead of just saying what's allowed, it tells AI agents who you are, what you do, and how to interact responsibly.

## Skills

| Skill | Description |
|-------|-------------|
| `scan` | Quick check of any domain for AI Discovery configuration |
| `discover` | Deep AI readiness analysis (robots.txt, security.txt, sitemap, meta tags, structured data) |
| `create` | Generate spec-compliant `.well-known/ai` files for any project |

## Agent

The `@rootz` agent combines all three skills and responds contextually — mention a domain and it scans, ask to "set up AI discovery" and it creates.

## Examples

```
# Scan a website
/rootz-ai-discovery:scan rootz.global

# Deep analysis
/rootz-ai-discovery:discover anthropic.com

# Create AI Discovery for your project
/rootz-ai-discovery:create My Company Name
```

## Why This Matters

AI agents are the primary way software interacts with information. But most websites provide no structured, verifiable identity for machines. AI Discovery fills that gap — and this plugin makes it easy to check any site and help any project adopt the standard.

## Links

- [AI Discovery Standard](https://rootz.global/ai/standard.md) (CC-BY-4.0)
- [Reference Implementation](https://rootz.global/.well-known/ai)
- [Rootz Corp](https://rootz.global)
- [Full Plugin (with capture + attestation)](https://github.com/rootz-global/ai-discovery-plugin)
