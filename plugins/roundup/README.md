# Roundup

Status briefing generator that learns how you communicate.

Roundup watches your work across GitHub, email, Teams, Slack, and other tools, then drafts status updates and briefings in your own voice for any audience you define.

## The Problem

Managers and team leads spend hours each week assembling status updates from scattered sources: scanning PR activity in GitHub, reading email threads for decisions, checking Teams or Slack for context, then rewriting all of it for different audiences at different levels of detail.

The data to write these updates already exists. The work is in gathering it and packaging it. Roundup automates the gathering and drafting. You provide quality control and hit send.

## How It Works

**First time (5 minutes):** Run the setup skill. It asks about your role, your audiences, and where your team's work happens. Then you paste in an example or two of updates you've already written. From those examples, it learns your format, tone, structure, and what you include vs. skip.

**Every time after:** Tell roundup which audience you're writing for. It pulls fresh data from your configured sources, synthesizes across them, and drafts a briefing matching your style.

## Installation

```bash
copilot plugin install roundup@awesome-copilot
```

## Getting Started

### First-Time Setup

```
use roundup-setup
```

The setup flow walks you through:
- Describing your role and team
- Pasting in example updates you've already written
- Defining your audiences (leadership, team, partners, etc.) and what each one cares about
- Identifying where your team's work and conversations happen

### Generating a Briefing

```
use roundup
```

Or be more specific:

```
use roundup -- generate a leadership briefing covering this past week
```

```
use roundup -- draft a team update since Monday
```

## What's Included

| Skill | What It Does |
|-------|-------------|
| `roundup-setup` | Interactive onboarding that learns your style, audiences, and data sources |
| `roundup` | Generates draft briefings from your config on demand |

## What It Can Pull From

Roundup adapts to whatever tools are available in your environment:

| Source | What It Looks For |
|--------|-------------------|
| GitHub | PRs, issues, commits, review activity across your configured repos |
| M365 / WorkIQ | Email threads, Teams messages, calendar events, shared docs |
| Slack | Channel messages, threads, announcements |
| Google Workspace | Gmail, Calendar, Drive activity |

During setup, roundup discovers which of these you have access to and configures itself accordingly. If you add new tools later, re-run setup to include them.

No API keys or additional setup required beyond what's already configured in your Copilot CLI environment.

## What Makes It Different

**It learns from your examples.** Rather than forcing you into a template, roundup analyzes how you actually write and replicates that style. Your briefings sound like you wrote them.

**It works with whatever you have.** GitHub only? Fine. Full M365 suite? Great. Mix of Slack and Google? Works too. The setup flow discovers your environment and adapts.

**Multiple audiences, one setup.** Define different audience profiles with different detail levels and formats. Same underlying data, different output for each.

**Your config is a readable file.** Everything roundup learned lives in `~/.config/roundup/config.md` -- plain markdown you can open, read, and hand-edit anytime. No opaque settings or hidden state.

## Reconfiguring

To start setup over from scratch:

```
use roundup-setup
```

It will ask before overwriting your existing config.

To make small adjustments, just open `~/.config/roundup/config.md` in any text editor. The file is written in plain English and organized by section. Your changes are respected on the next run.

## License

MIT
