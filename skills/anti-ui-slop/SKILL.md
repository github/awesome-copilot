---
name: anti-ui-slop
description: 'Stop coding agents from shipping generic UI. Use UIZZE''s 800,000+ real web and iOS screens to build product-specific interfaces, define a design contract, cover required states, and run a hard finish gate. Use when designing, implementing, redesigning, critiquing, or pre-ship reviewing a web or iOS interface in Codex, Claude Code, Cursor, Copilot, or another coding agent. Trigger with "anti-ui-slop", "stop UI slop", "ground this UI in real screens", or "run the UI finish gate".'
license: MIT
metadata:
  version: "1.2.13"
  author: "UIZZE <business@uizze.com>"
  compatibility: "Designed for Claude Code, Codex, Cursor, and GitHub Copilot; works in any agent that can read project files and fetch a URL."
  tags: "ui-design, design-system, design-review, frontend, web-ui, ios-ui"
---

> **Stop AI coding agents from shipping generic UI.**

# Stop Making UI Slop

Build product-specific UI with 800,000+ real web and iOS screens via [UIZZE](https://uizze.com).

![Stop Making UI Slop with UIZZE](https://uizze.com/landing/anti-ui-slop-skill-banner.png)

## Overview

Use the product brief, existing UI, components, and local design system to make intentional interfaces. Uizze supplies focused design guidance and, when useful, a small number of relevant visual references.

## Prerequisites

- A screen or component to build, redesign, or review — a file path or a short description.
- The product's existing components, design tokens, and visual language, so the build extends them instead of inventing a new system.
- Optional access to the paid Uizze MCP for focused references and hosted materials.

## Authentication

- The free skill and public catalogue work without an account, token, MCP connection, dependency, script, or executable.
- The optional full UIZZE MCP may use the host's normal connection and authentication flow. Never claim it is connected without an actual host result.

## Work from the product

Read the brief, existing UI, components, tokens, and constraints before designing. They always outrank this skill. Keep familiar interaction conventions and make the product's own objects, workflow, and priorities visually clear. Do not add novelty for its own sake.

## Load one playbook

Choose at most one file for the current request:

- New interface or major redesign: `reference/new-work.md`
- Product or dashboard work: `reference/operate.md`
- Refinement and polish: `reference/polish.md`
- Simplification or distillation: `reference/distill.md`
- Explicit audit: `reference/audit.md`
- Native iOS work: `reference/ios.md`

Do not load a second playbook. Apply judgment rather than treating its examples as a checklist.

## Optional Uizze evidence

Read `references/uizze-reference-policy.md` before using the paid MCP. It exposes exactly `find_ui_references` and `find_ui_materials`. Use them only when a concrete unresolved visual or material question would benefit from evidence. If they return nothing, continue silently.

## Finish

Complete the requested scope. When the environment supports it, render and inspect once. Fix observable breakage such as clipping, overlap, distorted media, inaccessible controls, or inert interactions. Keep the handoff concise.
