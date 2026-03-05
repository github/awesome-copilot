---
name: copilot-spaces
description: 'Use Copilot Spaces to provide project-specific context to conversations. Use this skill when users mention a "Copilot space", want to load context from a shared knowledge base, discover available spaces, or ask questions grounded in curated project documentation, code, and instructions.'
---

# Copilot Spaces

Use Copilot Spaces to bring curated, project-specific context into conversations. A Space is a shared collection of repositories, files, documentation, and instructions that grounds Copilot responses in your team's actual code and knowledge.

## Available Tools

### MCP Tools (Read-only)

| Tool | Purpose |
|------|---------|
| `mcp__github__list_copilot_spaces` | List all spaces accessible to the current user |
| `mcp__github__get_copilot_space` | Load a space's full context by owner and name |

### REST API via `gh api` (Full CRUD)

The Spaces REST API supports creating, updating, deleting spaces, and managing collaborators. The MCP server only exposes read operations, so use `gh api` for writes.

**User Spaces:**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/users/{username}/copilot-spaces` | Create a space |
| `GET` | `/users/{username}/copilot-spaces` | List spaces |
| `GET` | `/users/{username}/copilot-spaces/{number}` | Get a space |
| `PUT` | `/users/{username}/copilot-spaces/{number}` | Update a space |
| `DELETE` | `/users/{username}/copilot-spaces/{number}` | Delete a space |

**Organization Spaces:** Same pattern under `/orgs/{org}/copilot-spaces/...`

**Collaborators:** Add, list, update, and remove collaborators at `.../collaborators`

**Scope requirements:** PAT needs `read:user` for reads, `user` for writes. Add with `gh auth refresh -h github.com -s user`.

**Note:** This API is functional but not yet in the public REST API docs. It may require the `copilot_spaces_api` feature flag.

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

### 5. Manage Spaces (via `gh api`)

When a user wants to create, update, or delete a space, use `gh api`. First, find the space number from the list endpoint.

**Update a space's instructions:**
```bash
gh api users/{username}/copilot-spaces/{number} \
  -X PUT \
  -f general_instructions="New instructions here"
```

**Update name, description, or instructions together:**
```bash
gh api users/{username}/copilot-spaces/{number} \
  -X PUT \
  -f name="Updated Name" \
  -f description="Updated description" \
  -f general_instructions="Updated instructions"
```

**Create a new space:**
```bash
gh api users/{username}/copilot-spaces \
  -X POST \
  -f name="My New Space" \
  -f general_instructions="Help me with..." \
  -f visibility="private"
```

**Attach resources (replaces entire resource list):**
```json
{
  "resources_attributes": [
    { "resource_type": "free_text", "metadata": { "name": "Notes", "text": "Content here" } },
    { "resource_type": "github_issue", "metadata": { "repository_id": 12345, "number": 42 } },
    { "resource_type": "github_file", "metadata": { "repository_id": 12345, "file_path": "docs/guide.md" } }
  ]
}
```

**Delete a space:**
```bash
gh api users/{username}/copilot-spaces/{number} -X DELETE
```

**Updatable fields:** `name`, `description`, `general_instructions`, `icon_type`, `icon_color`, `visibility` ("private"/"public"), `base_role` ("no_access"/"reader"), `resources_attributes`

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

### Example 5: Update Space Instructions Programmatically

**User**: "Update my PM Weekly Updates space to include a new writing guideline"

**Action**:
1. Call `mcp__github__list_copilot_spaces` and find the space number (e.g., 19).
2. Call `mcp__github__get_copilot_space` to read current instructions.
3. Modify the instructions text as requested.
4. Push the update:
```bash
gh api users/labudis/copilot-spaces/19 -X PUT -f general_instructions="updated instructions..."
```

## Tips

- Space names are **case-sensitive**. Use the exact name from `list_copilot_spaces`.
- Spaces can be owned by users or organizations. Always provide both `owner` and `name`.
- Space content can be large (20KB+). If returned as a temp file, use grep or view_range to find relevant sections rather than reading everything at once.
- If a space isn't found, suggest listing available spaces to find the right name.
- Spaces auto-update as underlying repos change, so the context is always current.
- Some spaces contain custom instructions that should guide your behavior (coding standards, preferred patterns, workflows). Treat these as directives, not suggestions.
- **Write operations** (`gh api` for create/update/delete) require the `user` PAT scope. If you get a 404 on write operations, run `gh auth refresh -h github.com -s user`.
- Resource updates **replace the entire array**. To add a resource, include all existing resources plus the new one. To remove one, include `{ "id": 123, "_destroy": true }` in the array.
