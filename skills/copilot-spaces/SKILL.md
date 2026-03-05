---
name: copilot-spaces
description: 'Use Copilot Spaces to provide project-specific context to conversations. Use this skill when users mention a "Copilot space", want to load context from a shared knowledge base, discover available spaces, or ask questions grounded in curated project documentation, code, and instructions.'
---

# Copilot Spaces

Use Copilot Spaces to bring curated, project-specific context into conversations. A Space is a shared collection of repositories, files, documentation, and instructions that grounds Copilot responses in your team's actual code and knowledge.

## Available MCP Tools

| Tool | Purpose |
|------|---------|
| `mcp__github__list_copilot_spaces` | List all spaces accessible to the current user |
| `mcp__github__get_copilot_space` | Load a space's full context by owner and name |

## When to Use Spaces

- User mentions "Copilot space" or asks to "load a space"
- User wants answers grounded in specific project docs, code, or standards
- User asks "what spaces are available?" or "find a space for X"
- User needs onboarding context, architecture docs, or team-specific guidance
- User wants to debug or understand code using curated project context

## Workflow

### 1. Discover Spaces

When a user asks what spaces are available or you need to find the right space:

```
Call mcp__github__list_copilot_spaces
```

This returns all spaces the user can access, each with a `name` and `owner_login`. Present relevant matches to the user.

### 2. Load a Space

When a user names a specific space or you've identified the right one:

```
Call mcp__github__get_copilot_space with:
  owner: "org-or-user"    (the owner_login from the list)
  name: "Space Name"      (exact space name, case-sensitive)
```

This returns the space's full content: attached documentation, code context, custom instructions, and any other curated materials. Use this context to inform your responses.

### 3. Answer Using Space Context

Once loaded, the space content becomes part of your context. Use it to:
- Answer questions about the project's architecture, patterns, or standards
- Generate code that follows the team's conventions
- Explain how specific systems work based on internal docs
- Debug issues using project-specific knowledge

## Examples

### Example 1: User Asks for a Space

**User**: "Load the Accessibility copilot space"

**Action**:
1. Call `mcp__github__get_copilot_space` with owner `"github"`, name `"Accessibility"`
2. Use the returned context to answer questions about accessibility standards, MAS grades, compliance processes, etc.

### Example 2: User Wants to Find Spaces

**User**: "What copilot spaces are available for our team?"

**Action**:
1. Call `mcp__github__list_copilot_spaces`
2. Filter/present spaces relevant to the user's org or interests
3. Offer to load any space they're interested in

### Example 3: Context-Grounded Question

**User**: "Using the security space, what's our policy on secret scanning?"

**Action**:
1. Call `mcp__github__get_copilot_space` with the appropriate owner and name
2. Find the relevant policy in the space content
3. Answer based on the actual internal documentation

## Tips

- Space names are **case-sensitive** -- use the exact name from `list_copilot_spaces`
- Spaces can be owned by users or organizations -- always provide both `owner` and `name`
- Space content can be large (docs, code, instructions) -- focus on the parts relevant to the user's question
- If a space isn't found, suggest listing available spaces to find the right name
- Spaces auto-update as underlying repos change, so the context is always current
- Some spaces contain custom instructions that should guide your behavior (coding standards, preferred patterns, etc.)
