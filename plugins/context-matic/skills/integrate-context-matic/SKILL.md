---
name: integrate-context-matic
description: 'Discovers and integrates third-party APIs using the context-matic MCP server. Uses `fetch_api` to find available API SDKs, `ask` for integration guidance, `model_search` and `endpoint_search` for SDK details. Use when the user asks to integrate a third-party API, add an API client, implement features with an external API, or work with any third-party API or SDK.'
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

### 1. Ensure Guidelines and Skills Exist

#### 1a. Detect the Project's Primary Language

Before checking for guidelines or skills, identify the project's primary programming language by inspecting the workspace:

| File / Pattern | Language |
|---|---|
| `*.csproj`, `*.sln` | `csharp` |
| `package.json` with `"typescript"` dep or `.ts` files | `typescript` |
| `requirements.txt`, `pyproject.toml`, `*.py` | `python` |
| `go.mod`, `*.go` | `go` |
| `pom.xml`, `build.gradle`, `*.java` | `java` |
| `Gemfile`, `*.rb` | `ruby` |
| `composer.json`, `*.php` | `php` |

Use the detected language in all subsequent steps wherever `language` is required.

#### 1b. Check for Existing Guidelines and Skills

Check whether guidelines and skills have already been added for this project by looking for their presence in the workspace.

- `{language}-conventions` is the skill produced by **add_skills**.
- `{language}-security-guidelines.md` and `{language}-test-guidelines.md` are language-specific guideline files produced by **add_guidelines**.
- `update-activity-workflow.md` is a workflow guideline file produced by **add_guidelines** (it is not language-specific).
- Check these independently. Do not treat the presence of one set as proof that the other set already exists.
- **If any required guideline files for this project are missing:** Call **add_guidelines**.
- **If `{language}-conventions` is missing for the project's language:** Call **add_skills**.
- **If all required guideline files and `{language}-conventions` already exist:** Skip this step and proceed to step 2.

### 2. Discover Available APIs

Call **fetch_api** to find available APIs — always start here.

- Always provide the `language` parameter using the language detected in step 1a.
- Always provide the `key` parameter: pass the API name/key from the user's request (e.g. `"paypal"`, `"twilio"`).
- If the user did not provide an API name/key, ask them which API they want to integrate, then call `fetch_api` with that value.
- The tool returns only the matching API on an exact match, or the full API catalog (name, description, and `key`) when there is no exact match.
- Identify the API that matches the user's request based on the name and description.
- Extract the correct `key` for the user's requested API before proceeding. This key will be used for all subsequent tool calls related to that API.

**If the requested API is not in the list:**
- Inform the user that the API is not currently available in this plugin (context-matic) and stop.
- Request guidance from user on how to proceed with the API's integration.

### 3. Get Integration Guidance

- Provide `ask` with: `language`, `key` (from step 2), and your `query`.
- Break complex questions into smaller focused queries for best results:
  - _"How do I authenticate?"_
  - _"How do I create a payment?"_
  - _"What are the rate limits?"_

### 4. Look Up SDK Models and Endpoints (as needed)

These tools return definitions only — they do not call APIs or generate code.

- **model_search** — look up a model/object definition.
  - Provide: `language`, `key`, and an exact or partial case-sensitive model name as `query` (e.g. `availableBalance`, `TransactionId`).
- **endpoint_search** — look up an endpoint method's details.
  - Provide: `language`, `key`, and an exact or partial case-sensitive method name as `query` (e.g. `createUser`, `get_account_balance`).

### 5. Record Milestones

Call **update_activity** (with the appropriate `milestone`) whenever one of these is **concretely reached in code or infrastructure** — not merely mentioned or planned:

| Milestone | When to pass it |
|---|---|
| `sdk_setup` | SDK package is installed in the project (e.g. `npm install`, `pip install`, `go get` has run and succeeded). |
| `auth_configured` | API credentials are explicitly written into the project's runtime environment (e.g. present in a `.env` file, secrets manager, or config file) **and** referenced in actual code. |
| `first_call_made` | First API call code written and executed |
| `error_encountered` | Developer reports a bug, error response, or failing call |
| `error_resolved` | Fix applied and API call confirmed working |

## Checklist

- [ ] Project's primary language detected (step 1a)
- [ ] `add_guidelines` called if guideline files were missing, otherwise skipped
- [ ] `add_skills` called if `{language}-conventions` was missing, otherwise skipped
- [ ] `fetch_api` called with correct `language` and `key` (API name)
- [ ] Correct `key` identified for the requested API (or user informed if not found)
- [ ] `update_activity` called only when a milestone is concretely reached in code/infrastructure — never for questions, searches, or tool lookups
- [ ] `update_activity` called with the appropriate `milestone` at each integration milestone
- [ ] `ask` used for integration guidance and code samples
- [ ] `model_search` / `endpoint_search` used as needed for SDK details
- [ ] Project compiles after each code modification

## Notes

- **API not found**: If an API is missing from `fetch_api`, do not guess at SDK usage — inform the user that the API is not currently available in this plugin and stop.
- **update_activity and fetch_api**: `fetch_api` is API discovery, not integration — do not call `update_activity` before it.
