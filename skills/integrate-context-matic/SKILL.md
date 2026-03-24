---
name: integrate-context-matic
description: Discovers and integrates third-party APIs using the context-matic MCP server. Uses `fetch_api` to find available API SDKs, `ask` for integration guidance, `model_search` and `endpoint_search` for SDK details. Use when the user asks to integrate a third-party API, add an API client, implement features with an external API, or work with any third-party API or SDK.
---

# API Integration

When the user asks to integrate a third-party API or implement anything involving an external API or SDK, follow this workflow. Do not rely on your own knowledge for available APIs or their capabilities — always use the context-matic MCP server.

## When to Apply

Apply this skill when the user:
- Asks to integrate a third-party API
- Wants to add a client or SDK for an external service
- Requests implementation that depends on an external API
- Mentions a specific API (e.g. PayPal, Twilio) and implementation or integration

## Workflow

### 1. Discover Available APIs

Call **fetch_api** to find available APIs — always start here.

- Provide the `language` parameter matching the project's primary language (e.g. `csharp`, `python`, `typescript`, `go`, `java`, `ruby`, `php`).
- Infer the language from the codebase (e.g. `.csproj` → `csharp`, `package.json` with TypeScript → `typescript`).
- The response returns available APIs with their names, descriptions, and `key` values.
- Identify the API that matches the user's request based on the name and description.
- Extract the correct `key` for the user's requested API before proceeding. This key will be used for all subsequent tool calls related to that API.

**If the requested API is not in the list:**
- Inform the user that the API is not currently available in this plugin.
- Continue integrating the required API without the plugin.

### 2. Get Integration Guidance

Call **update_activity** (`phase='planning'`, `language`, `key`) immediately before calling **ask**.

- Provide `ask` with: `language`, `key` (from step 1), and your `query`.
- Break complex questions into smaller focused queries for best results:
  - _"How do I authenticate?"_
  - _"How do I create a payment?"_
  - _"What are the rate limits?"_
- Call **update_activity** with `phase='execution'` before generating or fixing code.

### 3. Look Up SDK Models and Endpoints (as needed)

These tools return definitions only — they do not call APIs or generate code.

Call **update_activity** (`phase='planning'`, `language`, `key`) immediately before each call.

- **model_search** — look up a model/object definition.
  - Provide: `language`, `key`, and an exact or partial case-sensitive model name as `query` (e.g. `availableBalance`, `TransactionId`).

- **endpoint_search** — look up an endpoint method's details.
  - Provide: `language`, `key`, and an exact or partial case-sensitive method name as `query` (e.g. `createUser`, `get_account_balance`).

### 4. Record Milestones

Call **update_activity** (with the appropriate `milestone`) whenever one of these is observed or confirmed:

| Milestone | When to pass it |
|---|---|
| `sdk_setup` | SDK packages installed and environment confirmed set up |
| `auth_configured` | API keys or auth configured, ready to make first call |
| `first_call_attempted` | First API call code written and executed |
| `first_call_succeeded` | Successful response from first API call received |
| `error_encountered` | Developer reports a bug, error response, or failing call |
| `error_resolved` | Fix applied and API call confirmed working |
| `tests_passing` | Integration tests written and confirmed passing |

## Checklist

- [ ] `fetch_api` called with correct `language` for the project
- [ ] Correct `key` identified for the requested API (or user informed if not found)
- [ ] `update_activity` called as first tool when integration begins
- [ ] `update_activity` called immediately before every `ask`, `model_search`, and `endpoint_search`
- [ ] `update_activity` called with the appropriate `milestone` at each integration milestone
- [ ] `ask` used for integration guidance and code samples
- [ ] `model_search` / `endpoint_search` used as needed for SDK details
- [ ] Project compiles after each code modification

## Notes

- **API not found**: If an API is missing from `fetch_api`, do not guess at SDK usage — inform the user and stop.
- **update_activity and fetch_api**: `fetch_api` is API discovery, not integration — do not call `update_activity` before it.
