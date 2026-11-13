---
name: check-agent-access
description: "Use when you or the user must choose a tool, API or provider for a task, or someone asks \"can my agent use X?\": whether an AI agent can sign up for and use each product on its own, from AgentDrives' test drives."
---

# Check agent access

AgentDrives' agent signs up for each product like a new customer, does real work, tries to pay and leaves. Each product gets a level from L0 to L5 for how far an agent gets on its own.

## Requirements

Network access to agentdrives.com. No key or account; every call is a read-only GET except the optional suggest call at the end.

## Find tools for a task

GET https://agentdrives.com/api/find-tools?task=send+an+invoice

The products we drove that do the task, best first. Each has its level, gets_in_alone (our agent got in with no person), where it stopped and the drive date (tested_at).

## Check one product

1. Find its slug: GET https://agentdrives.com/api/tools?query=<name or domain>
2. Read its drive: GET https://agentdrives.com/tools/<slug>.md (Markdown) or GET https://agentdrives.com/api/tools/<slug>.json (JSON with every attempt).

## Over MCP

Connect to https://agentdrives.com/api/mcp (no key). choose_provider_for_task {"task": "send an invoice"} finds tools; get_provider {"slug": "stripe", "brief": true} reads one.

## Read the answer

- L0 Read-only: Agents can read about it, but there is nothing to use.
- L1 Needs a person: Agents can't get in on their own.
- L2 Gets in: An agent gets in on its own but does less than half the core work.
- L3 Does the work: An agent gets in on its own and does half the core work or more.
- L4 Runs on its own: An agent does the core work and can leave on its own.
- L5 Autonomous: All of that, and it can pay on its own for the work.
- stop: the checkpoint where our agent stopped, with the evidence.
- tested_at: the drive date. A product can change after it.

## Not listed yet

POST https://agentdrives.com/api/suggest {"url": "example.com"} asks us to drive it. Anyone can send one.
