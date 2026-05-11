---
name: x-twitter-scraper
description: 'Build GitHub Copilot workflows with Xquik X API SDKs, REST endpoints, MCP tools, signed webhooks, tweet search, user lookup, follower exports, media actions, and agent automation.'
---

# X Twitter Scraper

Use this skill when a user wants to integrate Xquik into an app, script, data pipeline, or AI agent workflow for X API and Twitter scraper tasks.

## Use Cases

- Search tweets, fetch tweet details, read timelines, and download media.
- Look up users, check relationships, and export followers or following.
- Start extraction jobs for replies, reposts, quotes, likes, lists, communities, articles, and search results.
- Create account monitors and verify HMAC-signed webhook events.
- Add TypeScript, Python, Go, Java, Kotlin, C#, Ruby, PHP, CLI, or Terraform clients.
- Connect agent runtimes through the Xquik MCP server.

## Source Checks

Before writing code, inspect the current Xquik source material:

- REST API docs: https://docs.xquik.com/api-reference/overview
- SDK index: https://docs.xquik.com/sdks
- OpenAPI spec: https://xquik.com/openapi.json
- MCP server docs: https://docs.xquik.com/mcp
- Skill repo: https://github.com/Xquik-dev/x-twitter-scraper

Do not invent endpoint names, request fields, response fields, scopes, pricing, limits, or package names. Read the relevant SDK README and API reference page first.

## Implementation Flow

1. Identify the workflow: search, lookup, extraction, monitor, webhook, media, write action, billing, or MCP.
2. Choose the integration surface: generated SDK for application code, REST for custom clients, MCP for agents, or webhooks for event delivery.
3. Confirm authentication requirements from the docs and use environment variables for API keys.
4. Use typed request and response models when an SDK exists for the user's language.
5. Add retries and pagination according to the SDK or API docs.
6. Add explicit user confirmation before write actions, payment flows, or long-running monitoring.
7. Keep webhook verification server-side and compare HMAC signatures before processing events.
8. Return structured data to the caller instead of scraping generated UI output.

## SDK Pattern

When application code is involved, match the SDK to the user's project language:

- Inspect project files and package manifests to identify the language and framework.
- Open the SDK index, then read the matching SDK README before choosing install commands, package names, imports, or client methods.
- Prefer the official SDK for the detected language when one exists.
- Use REST only when the project language has no suitable official SDK or the user asks for a custom client.
- Keep API keys in environment variables or the project's existing secret manager.

Use project-native typed request and response models. Keep network calls in server-side code unless the SDK docs explicitly support browser use.

## Webhook Pattern

When adding webhook handlers:

- Read the documented signing header name and payload format.
- Verify the HMAC signature before parsing business logic.
- Reject missing, malformed, or mismatched signatures.
- Make handlers idempotent because webhook delivery can retry.
- Store only the fields needed for the product workflow.

## MCP Pattern

Use the MCP server when the user wants an agent to explore or call Xquik tools directly. Keep application code on REST or SDK clients when the app needs stable typed contracts, tests, or internal abstractions.

## Safety And Accuracy

- Keep language neutral and technical.
- State that Xquik is a third-party X data and automation API.
- Do not claim affiliation with X Corp.
- Do not bypass access controls or platform policies.
- Do not expose API keys, webhook secrets, account cookies, tokens, or raw signatures.
- Do not hard-code credentials in examples or tests.
- Do not document private infrastructure details.
- Prefer official Xquik docs, SDK READMEs, and the OpenAPI spec over memory.
