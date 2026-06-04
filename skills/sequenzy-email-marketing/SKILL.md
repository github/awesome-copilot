---
name: sequenzy-email-marketing
description: 'Operate Sequenzy email marketing workflows safely: manage subscribers, segments, campaigns, sequences, templates, transactional email, account identity, API keys, and delivery stats with review-first defaults. Use when the user asks GitHub Copilot to work with Sequenzy email marketing or lifecycle automation.'
metadata:
  author: Sequenzy
  version: '1.0'
compatibility: Works with GitHub Copilot agents and other SKILL.md-compatible coding agents. Requires access to a Sequenzy account, the Sequenzy CLI or API, and appropriate credentials.
---

# Sequenzy Email Marketing Skill

Use this skill when the user asks you to operate Sequenzy email marketing workflows, including subscribers, lists, tags, segments, campaigns, sequences, templates, transactional email, websites, API keys, account identity, or delivery statistics.

Canonical source: https://github.com/Sequenzy/skills/tree/main/skills/sequenzy-email-marketing

## Safety Defaults

- Prefer review-first workflows. Draft, preview, and return dashboard or review links before sending or activating anything.
- Verify account identity before mutations. Authenticate with `sequenzy login` for interactive work or `SEQUENZY_API_KEY` for automation, then verify the current account before changing data.
- Never invent subscriber IDs, campaign IDs, template IDs, API fields, or saved objects. Inspect current Sequenzy state or the canonical skill references first.
- Ask for explicit confirmation before sending campaigns, activating sequences, deleting resources, importing large lists, or rotating API keys.
- Redact API keys, tokens, and credentials in all output.

## Common Workflows

### Install the canonical skill

```bash
npx skills add Sequenzy/skills --skill sequenzy-email-marketing
```

### Verify access

```bash
sequenzy login
sequenzy whoami
sequenzy account
```

If the CLI is unavailable, use the Sequenzy API with `SEQUENZY_API_KEY`, but do not print the key.

### Subscriber and segment work

1. Inspect existing subscriber/list/tag/segment state before changing anything.
2. Add or update subscribers with the requested tags and attributes.
3. Return the saved subscriber profile or identifier.
4. For segments, preview or report the segment count before using it in a campaign.

### Campaign, sequence, and template work

1. Draft content and structure first.
2. Create or update the campaign, sequence, or template in draft/review mode when possible.
3. Return the review URL or saved object identifier.
4. Do not send or activate until the user explicitly approves.

### Stats and recommendations

When asked for performance analysis, read delivery/campaign stats, summarize the weakest points, and propose practical changes. Do not fabricate metrics if the API or CLI call fails.

## Example Prompts

```text
Use Sequenzy to draft a 4-email onboarding sequence for new trial users, then give me the dashboard URL to review it.
```

```text
Check last 30 days campaign stats, identify the weakest campaign, and suggest subject-line improvements without sending anything.
```

```text
Add user@example.com as a subscriber with the tags beta and founder, then show the saved subscriber profile.
```

## Boundaries

Do not claim a send, activation, import, deletion, or API-key change happened unless you actually performed it and verified the result. If credentials, product access, or command/API details are missing, explain the blocker and stop before pretending success.
