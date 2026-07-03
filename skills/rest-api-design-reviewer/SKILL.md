---
name: rest-api-design-reviewer
description: Reviews REST API design, including naming conventions, status codes, and versioning, and automatically generates the OpenAPI spec
---

# rest-api-design-reviewer

This skill reviews REST API design quality by auditing route files, controllers, and existing specs — checking naming conventions, HTTP method usage, status codes, versioning strategy, and response structure — then generates or improves an OpenAPI 3.1 specification from the findings.

## When to Use This Skill

Use this skill when you need to:
- Review or audit existing REST API routes and controllers for design quality
- Check naming conventions, HTTP verbs, status codes, and versioning strategy
- Generate or improve an OpenAPI 3.1 specification from existing code
- Identify and fix inconsistencies in request/response structure and error shapes

## Prerequisites

- Route files, controller code, Swagger/OpenAPI specs, or Postman collections available in the workspace
- API must be REST-based (not GraphQL, gRPC, or WebSocket)

## Core Capabilities

### 1. REST Design Audit
Analyzes API routes and controllers against REST best practices across six categories: naming conventions, HTTP method semantics, status code correctness, versioning strategy, request/response structure, and security concerns. Each finding is classified as [CRITICAL], [WARNING], or [SUGGESTION].

### 2. OpenAPI 3.1 Spec Generation
Generates a complete OpenAPI 3.1 YAML specification from existing routes, including `paths`, `components/schemas`, `components/responses`, and `securitySchemes`. Uses `$ref` for reusable components and documents all response codes including error cases.

### 3. Richardson Maturity Scoring
Evaluates the API against the Richardson Maturity Model (Levels 0-3) and reports the current level with a target recommendation of Level 2 minimum.

## Usage Examples

### Example 1: Review routes from a file
```
Review the REST API routes in src/routes/users.ts and identify any design issues
```

### Example 2: Generate OpenAPI spec
```
Audit my Express routes and generate an OpenAPI 3.1 spec for the entire API
```

### Example 3: Check a specific concern
```
Are my HTTP status codes correct across all endpoints in this project?
```

### Example 4: Full project review
```
Review the REST API routes in this project and generate the OpenAPI 3.1 spec
```

## Guidelines

1. **Always read the actual files first** - Read route files and controllers before responding; never assume the API structure from the request alone.
2. **Use structured output** - Always respond with the Review Summary table, Findings blocks, OpenAPI spec, and Richardson Score table. Do not replace these with prose summaries.
3. **Show before and after** - For every finding, show the current (wrong) path or code and the corrected version side by side.
4. **Severity classification** - Use exactly three labels: [CRITICAL] for breaking or security issues, [WARNING] for standard violations, [SUGGESTION] for DX and maturity improvements.
5. **Generate complete specs** - When generating OpenAPI YAML, include all paths found, reusable `$ref` components, and all response codes — not just the happy path.

## Common Patterns

### Pattern: Fixing verb-in-path naming
```
Before: GET /getUsers
        POST /createUser
        POST /deleteUser/:id

After:  GET /users
        POST /users
        DELETE /users/:id
```

### Pattern: Correct status code mapping
```
Before: POST /users -> 200 OK
        DELETE /users/:id -> 200 OK

After:  POST /users -> 201 Created (with Location header)
        DELETE /users/:id -> 204 No Content
```

### Pattern: Adding versioning to base path
```
Before: /api/users
        /api/orders

After:  /api/v1/users
        /api/v1/orders
```

### Pattern: Standardized error response shape
```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "User with id 42 was not found.",
    "details": []
  }
}
```

### Pattern: Collection response envelope
```json
{
  "data": [],
  "meta": {
    "total": 0,
    "page": 1,
    "limit": 20
  }
}
```

## Output Format

Structure every response with these four sections in order:

**Review Summary table:**

| Category       | Issues Found | Severity                        |
|---------------|--------------|----------------------------------|
| Naming         | X            | CRITICAL / WARNING / SUGGESTION  |
| HTTP Methods   | X            | ...                              |
| Status Codes   | X            | ...                              |
| Versioning     | X            | ...                              |
| Response Shape | X            | ...                              |
| Security       | X            | ...                              |

**Findings — one block per issue:**

[Category] — [SEVERITY] — [Short title]
- Found: (exact path or code reference)
- Fix: (corrected version)
- Why: (one sentence explaining the REST principle violated)

**OpenAPI 3.1 Specification** — full YAML based on what was provided.

**Richardson Maturity Score:**

| Level | Name                       | Achieved |
|-------|----------------------------|----------|
| 0     | Single URI, single verb    | YES / NO |
| 1     | Multiple URIs (resources)  | YES / NO |
| 2     | HTTP verbs + status codes  | YES / NO |
| 3     | HATEOAS (hypermedia links) | YES / NO |

## Limitations

- Only reviews REST APIs — does not audit GraphQL, gRPC, or WebSocket interfaces
- Requires route files or code to be accessible in the workspace; cannot review APIs from a URL alone
- OpenAPI spec generation reflects the API surface only — does not infer business logic or database schema
- Security audit covers documentation-level concerns only (missing auth headers, sensitive params); does not perform penetration testing
