---
name: flowhunt-skill
description: Automation discovery audit skill. Use when the user wants to identify automation opportunities in their workflow, audit time-consuming manual processes, or get a structured intake to understand which tools (Gmail, Calendar, Slack, task trackers, CRMs) are candidates for automation. Walks through a 5-question workflow intake and produces a ranked list of automation wins. Install via `npx skills add heyneuron/flowhunt-skill`.
---

# FlowHunt Skill

Automation discovery audit for individuals and teams. Conducts a structured 5-question intake to understand the user's current workflow, then audits connected tools (Gmail, Calendar, Slack, Notion, task trackers, CRMs) to identify the highest-ROI automation opportunities.

## When to use this skill

- User asks "what should I automate?"
- User wants to audit their workflow for automation opportunities
- User mentions spending too much time on repetitive tasks
- User wants to connect their tools and find integration gaps
- Any request about workflow automation discovery, process audit, or automation ROI

## How to use this skill

Run the 5-question intake:
1. What tools do you use daily? (Gmail, Calendar, Slack, Notion, Jira, HubSpot, etc.)
2. Which recurring tasks take the most time each week?
3. Do you copy-paste data between tools? Which ones?
4. What reminders or follow-ups do you forget most often?
5. What would you automate first if you had a developer for a day?

Then:
- Map the tools mentioned to available integration surfaces (Zapier, Make, n8n, native APIs)
- Score each candidate automation by: time saved per week × ease of implementation
- Return a ranked list of top 3-5 automation wins with concrete next steps
- For each win: describe the trigger, action, and expected weekly time savings

## Guidelines

- Keep the intake conversational, one question at a time
- Don't assume tool availability — ask first
- Prioritize automations that eliminate copy-paste or manual follow-ups
- Flag quick wins (under 1h to implement) separately from complex integrations
- Always end with a concrete "start here" recommendation
