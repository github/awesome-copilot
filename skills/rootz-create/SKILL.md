---
name: create
description: Generate AI Discovery configuration files (.well-known/ai) for any project or organization. Interviews the user, reads existing project files, and produces spec-compliant ai.json, knowledge.json, and feed.json.
argument-hint: Organization name or project directory
---

# Create AI Discovery Configuration

Help the user generate a complete `/.well-known/ai` configuration for their project or organization.

## Instructions

### Step 1: Gather context

Read whatever project information is available:
- `README.md` or `README`
- `package.json`, `composer.json`, `Cargo.toml`, `pyproject.toml`
- `LICENSE` file
- Any existing `.well-known/` directory

If `$ARGUMENTS` is provided, use it as the organization/project name.

### Step 2: Interview the user

Ask for anything you couldn't find. Keep it conversational:

1. **Organization name** and one-line description
2. **Domain** where this will be hosted
3. **Contact** email or URL for AI agents
4. **What does your organization do?** (2-3 sentences)
5. **Key products or services** (names and descriptions)
6. **AI policies?** (training permission, attribution, rate limits)

### Step 3: Generate ai.json (Discovery)

```json
{
  "version": "1.2",
  "organization": {
    "name": "[Name]",
    "domain": "[domain.com]",
    "description": "[One-line description]",
    "mission": "[2-3 sentence mission]",
    "contact": { "email": "[email]", "web": "[url]" }
  },
  "content": {
    "knowledge": "/ai/knowledge.json",
    "feed": "/ai/feed.json"
  },
  "policies": {
    "ai_training": "[allow/deny/conditional]",
    "attribution": "[required/preferred/not-required]",
    "rate_limit": "100/hour",
    "commercial_use": "[allow/deny/contact]"
  },
  "_signature": {
    "contentHash": "[SHA-256 of JSON above]",
    "signedAt": "[ISO timestamp]",
    "method": "sha256",
    "standard": "/.well-known/ai v1.2"
  }
}
```

### Step 4: Generate knowledge.json (Encyclopedia)

```json
{
  "version": "1.0",
  "organization": "[Name]",
  "glossary": [
    { "term": "[Name]", "definition": "[What it is]", "category": "[product/concept/technology]" }
  ],
  "products": [
    { "name": "[Name]", "description": "[What it does]", "status": "[active/beta]", "url": "[URL]" }
  ],
  "technology": {
    "stack": ["[languages, frameworks]"],
    "architecture": "[Brief description]"
  }
}
```

### Step 5: Generate feed.json (Updates)

```json
{
  "version": "1.0",
  "organization": "[Name]",
  "entries": [
    {
      "title": "AI Discovery Configured",
      "date": "[today]",
      "summary": "[Organization] has enabled AI Discovery. AI agents can now access structured, verifiable information about our organization.",
      "tags": ["ai-discovery", "launch"]
    }
  ]
}
```

### Step 6: Write the files

Create the directory structure:
```
.well-known/
└── ai/
    ├── ai.json
    ├── knowledge.json
    └── feed.json
```

Place in `public/` or `static/` if the project has one.

### Step 7: Report and next steps

- What files were created and where
- How to deploy (static hosting, Express route, nginx)
- How to verify: "Scan your domain after deployment to confirm"
- Link to full spec: https://rootz.global/ai/standard.md
