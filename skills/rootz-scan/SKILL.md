---
name: scan
description: Scan any website for AI Discovery configuration at /.well-known/ai. Reports identity, knowledge, feed, policies, and integrity signals.
argument-hint: domain to scan (e.g., rootz.global)
---

# Scan for AI Discovery

Check a website for AI Discovery configuration and report what you find.

## Instructions

1. **Get the domain** from `$ARGUMENTS` or ask the user
2. **Fetch** `https://{domain}/.well-known/ai` using web_fetch
3. **Parse** the response:
   - If JSON: parse and extract organization, content links, policies
   - If redirect/HTML: note the redirect target
   - If 404: report "No AI Discovery found"
4. **If ai.json found**, also fetch:
   - Knowledge endpoint (usually `/ai/knowledge.json`)
   - Feed endpoint (usually `/ai/feed.json`)
5. **Report** in this format:

```
## AI Discovery Report: {domain}

### Identity
- Organization: {name}
- Domain: {domain}
- Contact: {email/url}

### Content
- Knowledge: {found/not found} — {entry count if found}
- Feed: {found/not found} — {entry count if found}

### Policies
- AI Training: {allow/deny/conditional}
- Attribution: {required/preferred/not required}
- Rate Limit: {value or none}
- Commercial Use: {allow/deny/contact}

### Integrity
- Content Hash: {present/absent}
- Signature: {present/absent}
- Method: {method if present}

### Assessment
{1-2 sentence summary of AI readiness}
```

6. **If no AI Discovery found**, suggest: "This site doesn't have AI Discovery yet. Use `/rootz-ai-discovery:create` to help them set one up."

## Examples

```
User: /rootz-ai-discovery:scan rootz.global
AI: [Fetches /.well-known/ai, parses response, reports structured findings]

User: /rootz-ai-discovery:scan anthropic.com
AI: [Reports 404 — no AI Discovery found, suggests creating one]
```
