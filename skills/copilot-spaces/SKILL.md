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

**Note:** Spaces are **read-only** via the API. You can list and load spaces, but cannot create, update, or delete them. If a user wants to edit a Space, direct them to the web UI at `github.com/copilot/spaces`.

## When to Use Spaces

- User mentions "Copilot space" or asks to "load a space"
- User wants answers grounded in specific project docs, code, or standards
- User asks "what spaces are available?" or "find a space for X"
- User needs onboarding context, architecture docs, or team-specific guidance
- User wants to follow a structured workflow defined in a Space (templates, checklists, multi-step processes)

## Workflow

### 1. Discover Spaces

When a user asks what spaces are available or you need to find the right space:

```
Call mcp__github__list_copilot_spaces
```

This returns all spaces the user can access, each with a `name` and `owner_login`. Present relevant matches to the user.

To filter for a specific user's spaces, match `owner_login` against the username (e.g., "show me my spaces").

### 2. Load a Space

When a user names a specific space or you've identified the right one:

```
Call mcp__github__get_copilot_space with:
  owner: "org-or-user"    (the owner_login from the list)
  name: "Space Name"      (exact space name, case-sensitive)
```

This returns the space's full content: attached documentation, code context, custom instructions, and any other curated materials. Use this context to inform your responses.

### 3. Follow the Breadcrumbs

Space content often references external resources: GitHub issues, dashboards, repos, discussions, or other tools. Proactively fetch these using other MCP tools to gather complete context. For example:
- A space references an initiative tracking issue. Use `issue_read` to get the latest comments.
- A space links to a project board. Use project tools to check current status.
- A space mentions a repo's masterplan. Use `get_file_contents` to read it.

### 4. Answer or Execute

Once loaded, use the space content based on what it contains:

**If the space contains reference material** (docs, code, standards):
- Answer questions about the project's architecture, patterns, or standards
- Generate code that follows the team's conventions
- Debug issues using project-specific knowledge

**If the space contains workflow instructions** (templates, step-by-step processes):
- Follow the workflow as defined, step by step
- Gather data from the sources the workflow specifies
- Produce output in the format the workflow defines
- Show progress after each step so the user can steer

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

### Example 4: Space as a Workflow Engine

**User**: "Write my weekly update using the PM Weekly Updates space"

**Action**:
1. Call `mcp__github__get_copilot_space` to load the space. It contains a template format and step-by-step instructions.
2. Follow the space's workflow: pull data from attached initiative issues, gather metrics, draft each section.
3. Fetch external resources referenced by the space (tracking issues, dashboards) using other MCP tools.
4. Show the draft after each section so the user can review and fill in gaps.
5. Produce the final output in the format the space defines.

## Tips

- Space names are **case-sensitive**. Use the exact name from `list_copilot_spaces`.
- Spaces can be owned by users or organizations. Always provide both `owner` and `name`.
- Space content can be large (20KB+). If returned as a temp file, use grep or view_range to find relevant sections rather than reading everything at once.
- If a space isn't found, suggest listing available spaces to find the right name.
- Spaces auto-update as underlying repos change, so the context is always current.
- Some spaces contain custom instructions that should guide your behavior (coding standards, preferred patterns, workflows). Treat these as directives, not suggestions.
- Spaces cannot be edited via the API. Direct users to `github.com/copilot/spaces` to modify Space settings, attached files, or instructions.
