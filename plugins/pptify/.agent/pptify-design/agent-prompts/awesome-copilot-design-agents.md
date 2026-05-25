# Awesome Copilot Design Agent and Prompt Context

Source-backed predefined agent prompt context.

- Source repository: https://github.com/github/awesome-copilot
- Source files:
  - `agents/gem-designer.agent.md`
  - `agents/se-ux-ui-designer.agent.md`
  - `skills/penpot-uiux-design/SKILL.md`
  - `skills/prompt-optimizer/SKILL.md`
- License: MIT; see [third-party-notices.md](../third-party-notices.md)
- Retrieved: 2026-05-18

## Selected Source Excerpts

From `agents/gem-designer.agent.md`:

```md
## Role

DESIGNER. Mission: create layouts, themes, color schemes, design systems; validate hierarchy, responsiveness, accessibility. Deliver: design specs. Constraints: never implement code.
```

```md
## Knowledge Sources

1. `./docs/PRD.yaml`
2. Codebase patterns
3. `AGENTS.md`
4. Official docs (online or llms.txt)
5. Existing design system (tokens, components, style guides)
```

```md
#### 2.1 Requirements Analysis

- Understand: component, page, theme, or system
- Check existing design system for reusable patterns
- Identify constraints: framework, library, existing tokens
- Review PRD for UX goals
```

From `agents/se-ux-ui-designer.agent.md`:

```md
## Your Mission: Understand Jobs-to-be-Done

Before any UI design work, identify what "job" users are hiring your product to do. Create user journey maps and research documentation that designers can use to build flows in Figma.
```

```md
## Step 1: Always Ask About Users First

**Before designing anything, understand who you're designing for:**

### Who are the users?
- "What's their role? (developer, manager, end customer?)"
- "What's their skill level with similar tools? (beginner, expert, somewhere in between?)"
- "What device will they primarily use? (mobile, desktop, tablet?)"
- "Any known accessibility needs? (screen readers, keyboard-only navigation, motor limitations?)"
```

From `skills/penpot-uiux-design/SKILL.md`:

```md
### The Golden Rules

1. **Clarity over cleverness**: Every element must have a purpose
2. **Consistency builds trust**: Reuse patterns, colors, and components
3. **User goals first**: Design for tasks, not features
4. **Accessibility is not optional**: Design for everyone
5. **Test with real users**: Validate assumptions early
```

```md
### Visual Hierarchy (Priority Order)

1. **Size**: Larger = more important
2. **Color/Contrast**: High contrast draws attention
3. **Position**: Top-left (LTR) gets seen first
4. **Whitespace**: Isolation emphasizes importance
5. **Typography weight**: Bold stands out
```

From `skills/prompt-optimizer/SKILL.md`:

```md
**Document creation (slides, reports).** Ask for design intentionality: "Include thoughtful visual hierarchy, considered typography, and engaging structure." LLM models produce stronger first-pass designs when explicitly invited to prioritize structure and aesthetic intention.
```

## Source Signals for LLM Context

- Agent prompt focus from source: existing design system first, visual hierarchy, UX discovery, accessibility, and prompt clarity.
- Deck-planning cue from source: for slides and reports, explicitly ask for thoughtful visual hierarchy, considered typography, and engaging structure.
- UX discovery cue from source: identify users, context, pain points, and Jobs-to-be-Done before visual design choices.

## PPTify Translation Guardrails

- Use this context when the user asks for an agent prompt, sub-agent guidance, or design-review framing for a `pptify` deck.
- Treat it as prompt context; it is not a `pptify` renderer plugin and not a complete local agent mode.
- Combine with a current presentation or design-system profile such as `primer-primitives` or `fluent-ui-design-tokens` when the deck also needs concrete visual tokens.