---
name: social-publishing
description: Schedule and publish social media posts across 13 platforms (X, LinkedIn, Instagram, Facebook Pages, TikTok, Discord, Telegram, YouTube, Reddit, WordPress, Pinterest) via SocialClaw — one workspace API key covers everything.
license: MIT
metadata:
  version: "1.0"
  source: https://github.com/ndesv21/socialclaw
  homepage: https://getsocialclaw.com
---

# Social Publishing via SocialClaw

Agent-first skill for scheduling and publishing social media content across 13 platforms using a single workspace API key. No per-platform OAuth setup required.

## When to Use This Skill

Use this skill when you need to:
- Publish or schedule posts across multiple social media platforms simultaneously
- Manage a social media content calendar programmatically
- Upload media and attach it to social posts
- Retrieve post analytics after publishing

## Prerequisites

- A SocialClaw workspace API key (get one at [getsocialclaw.com](https://getsocialclaw.com))
- npm or npx available

```bash
# Install via npx
npx skills add ndesv21/socialclaw

# Or install as a package
npm install socialclaw@0.1.12
```

Set your API key:
```bash
export SOCIALCLAW_API_KEY=your_workspace_api_key
```

## Supported Platforms

- **X** (Twitter)
- **LinkedIn** (Profile + Page)
- **Instagram** (Business + Standalone)
- **Facebook Pages**
- **TikTok**
- **Discord**
- **Telegram**
- **YouTube**
- **Reddit**
- **WordPress**
- **Pinterest**

## Core Capabilities

### 1. Multi-Platform Publishing
Publish to one or many platforms with a single API call. SocialClaw handles platform-specific formatting and rate limits automatically.

### 2. Campaign Management
Group posts into campaigns, set schedules, and manage content across multiple social accounts from a single workspace.

### 3. Media Upload
Upload images and videos once, then reuse them across platform-specific posts.

### 4. Schedule Validation
Validate that posts comply with platform-specific timing rules before scheduling.

### 5. Analytics
Retrieve engagement metrics for published posts.

## Usage Examples

### Example 1: Publish a Post to Multiple Platforms

```
Publish this product announcement to X, LinkedIn, and Instagram:
"Excited to launch our new feature! Check it out at example.com #launch"

Schedule it for tomorrow at 9am PST.
```

### Example 2: Create a Campaign

```
Create a 5-day content campaign for our product launch week:
- Day 1: Teaser post on X and LinkedIn
- Day 3: Feature highlight on Instagram and Facebook
- Day 5: Launch day announcement across all platforms
```

### Example 3: Upload and Attach Media

```
Upload the product screenshot at ./screenshot.png and attach it to
the LinkedIn post scheduled for Friday.
```

## Guidelines

1. **One API key, all platforms** — Your workspace API key authenticates across all connected social accounts without per-platform OAuth.
2. **Validate before scheduling** — Always run schedule validation to avoid platform-specific rate limit violations.
3. **Platform-specific formatting** — Character limits and media specs differ per platform; the skill handles normalization automatically.
4. **Campaign vs. single post** — For coordinated multi-day rollouts, use campaigns rather than individual post calls.

## Limitations

- Requires a SocialClaw account with connected social accounts
- Platform availability depends on your workspace tier
- Some platforms (TikTok, YouTube) require video content for optimal performance
