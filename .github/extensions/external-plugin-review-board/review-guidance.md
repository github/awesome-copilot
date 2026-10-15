# External plugin review guidance

Guidance used by the External Plugin Review Board canvas when the agent performs an AI review of
`external-plugin` + `ready-for-review` submissions in github/awesome-copilot. Edit this file to tune
how submissions are triaged.

## Maintainer decision pattern

Baseline derived from ~47 maintainer decisions (Aug–Sep 2026). Refresh this with recent closed
submissions before reviewing (see "Calibrate" below).

**Typically approved**

- Established vendors or well-known OSS projects with genuine developer-workflow value
  (e.g. Sumo Logic, Atlassian Teamwork Graph CLI, bitdrift, Remotion, Radius, incident.io-style SRE tooling).
- Genuinely useful Copilot tooling and canvases that don't duplicate built-in features
  (e.g. excel-cli/excel-mcp, chat-fork-map, cache-stats, usage-insights).

**Typically rejected (with the maintainer's usual wording)**

- Thin connectors to paid services that offer little practical Copilot value beyond promoting the service
  (no usable free path, narrow scope, sales-led framing) — "Sorry, we're not a channel for purely paid services." or
  "This appears to be a narrow paid SaaS connector rather than a broadly useful Copilot plugin."
  Being paid or vendor-backed is not on its own a reason to reject: per the
  [paid-services guidance](https://github.com/github/awesome-copilot/discussions/968), technically useful,
  broadly relevant, neutrally framed plugins that are clear about their limitations are welcome.
- Marketing pitches for brand-new products, often vibe-coded dumps (repo days old, 0 stars, few commits) —
  "This is primarily a marketing push for an external service."
- Free skills as an on-ramp to the vendor's paid/credit-based MCP or connector: vendor LICENSE or
  `metadata.author`, `mcp add` setup commands pointing at the vendor's API, UTM/referral links, or an upstream
  README that markets the free content as a funnel — "we're not a marketing channel".
- Crypto / payments / finance niches, or otherwise niche problem spaces — "This is not a fit for the repo."
  / "a bit too niche a problem space for this repo."
- Duplicates of built-in Copilot features: memory ("Copilot has a built-in memory system"), tool-use guards
  ("Copilot harnesses already have built-in provisions for controlling tool use"), markdown viewing, browser
  automation ("This can be done using Playwright, which is available in the Copilot harnesses").
- Opinionated personal workflows or frameworks — "too specific towards a style of working."
- Product-specific and narrow — "too product-specific and narrowly scoped for this repo at this time."
- Self-promotional or overly complex skills — "heavily geared towards self-promotion ... overly complex".
- Bulk submissions of many tiny related repos from one submitter.
- Resubmissions: check whether the reasons for the previous rejection were actually addressed.

## Procedure per issue

1. `gh issue view <N> -R github/awesome-copilot --json title,body,author,comments` — read the submission
   form (repo, path, sha, description, author/homepage URLs, notes) and the automated comments:
   "Reviewer signals" table (repo age, stars/forks), quality gate results and warnings, the AGT
   "Contributor Reputation Check" (HIGH/MEDIUM risk), pricing/checkout homepage heuristics, and any
   "Warnings" section. Note any maintainer comments.
2. Inspect the plugin repo at the submitted SHA (read-only), e.g. `gh api repos/OWNER/REPO`,
   `gh api repos/OWNER/REPO/git/trees/SHA?recursive=1`, `gh api repos/OWNER/REPO/contents/PATH?ref=SHA`,
   `gh api repos/OWNER/REPO/commits?per_page=10`. Determine what it contains (skills, agents, MCP servers,
   hooks, canvases, scripts), content size/quality, whether it's a thin wrapper around a paid/hosted
   service, whether the repo is brand new, whether the submitter account is new, and whether it duplicates
   built-in Copilot features.
3. Optionally fetch the homepage to check for pricing / paid-only access.
4. Never comment on, label, or modify issues or repos while reviewing.

## Calibrate

Before a large batch, glance at recent maintainer decisions to see if the pattern has shifted:

```
gh issue list -R github/awesome-copilot --label external-plugin --state closed --limit 40 --json number,title,labels
```

and read the `/approve` / `/reject` comments on the most recent ones.

## Recommendation buckets

- `straight-reject` — clearly matches a rejection pattern.
- `probably-reject` — likely reject, but something specific deserves a quick maintainer look.
- `needs-review` — genuine judgement call.
- `accept` — fits the approval pattern.

## Ownership labels

Intake labels submissions by who owns the plugin repository:

- `first party` — owned by a Microsoft/GitHub organization (Microsoft, GitHub, Azure, dotnet, MicrosoftDocs,
  microsoftgraph). The board fast-tracks these straight to `accept` without an AI review. If a maintainer
  explicitly moves one to `Unreviewed`, that opts it out of the fast-track: review it using the same procedure,
  maintainer decision pattern, and recommendation buckets as any other submission. Assess its repo fit,
  usefulness, duplication, and content quality on their merits; first-party ownership is not a reason to
  recommend `accept`.
- `third party` — owned by another organization. This is a signal only; apply the normal decision pattern.
- No ownership label — owned by a user account (or ownership couldn't be determined).
