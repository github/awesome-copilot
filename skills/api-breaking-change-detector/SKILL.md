---
name: api-breaking-change-detector
description: "Cross-references C# Web API controllers/DTOs against their TypeScript/JavaScript consumers (React, Angular, Vue, Svelte, Node.js, or hand-written/auto-generated HTTP clients like Fetch, Axios, NSwag) to catch contract drift in both directions: backend changes that break client applications (renamed/removed JSON keys, new required parameters, status code shifts) and frontend code sending fields the backend no longer reads. Works directly against source code, not exported OpenAPI spec files. Use when the user asks to check for breaking API changes, verify frontend/backend contract sync, or audit a DTO/controller change against its TypeScript/JS consumers before merging. Not for generating new API code from a spec (see openapi-to-application-code) or scaffolding new endpoints (see aspnet-minimal-api-openapi)."
---

# API Breaking Change Detector

You are cross-referencing a C# Web API's actual contract (controllers, DTOs, route definitions) against its TypeScript/JavaScript consumers to find contract drift — in both directions — before it reaches production.

## When to use this

Trigger when the user asks to:
- Check whether a DTO/controller change will break frontend or client applications
- Verify the client and backend API contract are still in sync
- Audit a specific endpoint, or the whole API surface, for breaking changes before a release

Do not use this for:
- Generating new API code from an OpenAPI spec (see `openapi-to-application-code`)
- Scaffolding new endpoints with OpenAPI docs (see `aspnet-minimal-api-openapi`)
- Comparing two OpenAPI spec *files* directly — this skill reads source code, not exported specs

## Process

1. **Discover Global JSON & Naming Policies:**
   - Check `Program.cs` or `Startup.cs` for active JSON options (e.g. `JsonNamingPolicy.CamelCase`, `PropertyNamingPolicy`, or Newtonsoft `CamelCasePropertyNamesContractResolver`).
   - Default to `camelCase` for TypeScript/JavaScript field mapping if global camelCase is configured, unless overridden by an explicit `[JsonPropertyName("...")]` attribute on the C# property.
   - Ignore C# properties annotated with `[JsonIgnore]`.

2. **Identify the C# contract surface.** For each Controller action in scope:
   - **Route**: Base `[Route("...")]` + action `[HttpGet("...")]` / `[HttpPost("...")]`. Normalize route parameters (e.g. `{id:int}` or `{id:guid}` $\rightarrow$ `{id}`).
   - **Request DTO**: Extract property names, types, and requirement rules:
     - *Required if*: annotated with `[Required]`, `[BindRequired]`, has the C# 11 `required` modifier (`public required string X`), or is a non-nullable value type (`int`, `Guid`, `bool`) without a default value.
     - *Optional if*: nullable (`string?`, `int?`), or has a default initializer.
   - **Response DTO**: Property names, types, and nullability.
   - **Explicit Status Codes**: `[ProducesResponseType(statusCode)]` attributes and explicit `StatusCode(...)` return paths.

3. **Find the matching TypeScript/JavaScript consumer (with Normalized URL Matching):**
   - **Auto-generated client match (high confidence):** look for generated client files (NSwag/OpenAPI Generator output) and match by generated method/interface name directly.
   - **Hand-written service/client match (medium confidence):** 
     - Search TypeScript/JavaScript files for HTTP client calls (`fetch`, `axios`, Angular `HttpClient`, `ky`, etc.) whose normalized URL pattern matches the controller's route.
     - Normalize template strings and concatenations (e.g., `${this.apiUrl}/users/${id}` or `baseUrl + '/users/' + userId` $\rightarrow$ `/users/{id}`).
     - Match normalized routes against C# routes regardless of variable naming in TypeScript/JS.
   - **No match found:** report as "no client consumer located" rather than guessing — do not assume an endpoint is unused just because a match wasn't found statically.
   - Label every finding with which of these three methods was used to locate it.

4. **Compare backend → frontend/client (breaks the client):**
   - A DTO property renamed or removed that the TypeScript/JS interface or object model still expects
   - A new required request field the client never sends
   - A response status code the client doesn't handle (e.g. controller now returns 409 Conflict, but client error handler only handles 400/500)
   - A response field's type changed (e.g. `long` $\rightarrow$ `string`, or non-nullable $\rightarrow$ nullable) in a way the client type assumes differently

5. **Compare frontend/client → backend (stale/dead client code vs. silent bugs):**
   - *Harmless dead field*: Client sends a payload property the backend ignores without error.
   - *Silently broken bug (High Severity)*: Client logic reads a response property that the backend no longer returns (resulting in `undefined` at runtime and potential application failures).

6. **Produce the report** (see Output Format). This skill does not modify code.

## Output Format

1. **Scope Audited** — Controllers, DTOs, and TypeScript/JavaScript files audited, along with detected JSON naming policies (e.g. `camelCase` enabled via `Program.cs`).
2. **Backend → Client Breaks** — Grouped by endpoint: what changed, match method used (Auto-generated / Normalized Route Match), exact impact on the client, and severity (Compilation Error vs. Silent Runtime Failure).
3. **Client → Backend Drift** — Stale fields sent or expected, explicitly distinguishing harmless dead fields from silently broken client UI logic.
4. **No Consumer Found** — Unmatched backend DTOs/endpoints requiring manual confirmation.
5. **Match Confidence Summary** — Breakdown of findings derived from auto-generated clients vs. normalized hand-written routes vs. unmatched routes.

## Guidelines

- **URL Normalization**: Always strip query parameters (`?status=active`) and normalize path parameters (`${id}` / `:id` / `{id}`) before comparing routes.
- **Naming Policies**: Never assume a C# property name matches a TypeScript/JS property verbatim without checking for `[JsonPropertyName("...")]` or global `JsonNamingPolicy.CamelCase` settings.
- **Modern C# Nuances**: Check for C# 11 `required` keyword and `#nullable enable` annotations (`string?` vs `string`) when assessing required properties.
- **Framework Agnostic**: Apply contract matching across any TypeScript or JavaScript client (Fetch, Axios, Angular, React, Vue, Svelte, Node.js).
- **Never Fabricate**: If no matching client service or DTO is found, report "No consumer located via static search" — never guess a pairing based purely on loose class names.
- **Reporting Only**: Do not modify code; output a scannable, actionable audit report.