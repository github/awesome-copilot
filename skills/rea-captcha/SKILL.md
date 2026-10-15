---
name: rea-captcha
description: 'Use when a GitHub Copilot browser workflow pauses at a CAPTCHA or security check in an owned or explicitly authorized test flow and must inspect evidence, choose a bounded human or test action, and resume the same browser session only after fresh validation. Never use for third-party production challenges or access-control bypass.'
---

# rea-captcha

Handle a browser verification pause as a state transition, not as proof that a click succeeded. Keep the browser session the calling workflow already owns, inspect the current gate, follow the returned policy, and resume only after fresh evidence says the gate is clear.

This skill requires the local [`rea-captcha`](https://github.com/masakaai/rea-captcha) MCP server. It adds verification handling to an existing browser workflow; it does not replace the workflow's navigation tools.

## Choose the smallest safe path

- If the calling agent already has page evidence, call `captcha_analyze` with the page URL and at least one of HTML, visible text, or runtime signals. This path is read-only and needs no browser configuration.
- If the task must preserve an active browser, use the configured session lifecycle below.
- If the MCP server is unavailable or only the browser tools are configured, report the blocked state and leave the browser session open. Do not improvise clicks or move session data.

The zero-configuration server command is:

```sh
npx -y rea-captcha mcp --stateless
```

That mode supports only `captcha_analyze`. The session lifecycle tools require a separate stateful launch with an explicit configuration for the browser session the agent already uses. Tool discovery by itself is not evidence that a session is configured.

## Same-session lifecycle

Use one `session_id` for the entire lifecycle:

1. Call `captcha_inspect` once.
2. If the decision is `continue`, return to the browser task.
3. If the decision is `agent-action` or `local-processing`, call `captcha_complete` once. It may act only on the configured exact origin; provider actions also require the vendor's documented non-production test key.
4. Call `captcha_resume`. Continue only when it reports `resumed` with fresh `clear` or `passed` evidence.
5. If the decision is `human-handoff`, call `captcha_handoff` once, then `captcha_wait` with a bounded timeout. After a person clears the gate in the same browser, call `captcha_resume`.

Keep the original browser, page, cookies, and session ID throughout. A timeout, malformed evidence, or a still-active challenge is not success; preserve the session and report the evidence needed for recovery.

## Examples

### Classify captured evidence

For HTML containing a Turnstile widget, call:

```json
{
  "url": "https://example.test/checkout",
  "html": "<div class=\"cf-turnstile\"></div>"
}
```

Use the returned finding and policy. Do not click or infer that the page is verified. Stateless analysis never creates a browser session.

### Resume an authorized provider test

For an integration demo already configured as session `checkout-test`:

1. Call `captcha_inspect` with `{"session_id":"checkout-test"}`.
2. Only when the decision is `agent-action`, call `captcha_complete` with `{"session_id":"checkout-test","timeout_ms":30000,"poll_ms":100}`.
3. Call `captcha_resume` with the same session ID.
4. Accept success only when the result is `resumed` and includes fresh validation evidence.

## Hard boundaries

- Operate only on owned applications, explicit test environments, or provider demos using documented non-production credentials.
- Never automate a third-party production challenge, defeat anti-bot controls, or bypass access restrictions.
- Never export cookies, challenge tokens, browser profiles, or credentials to another browser or service.
- Never describe OCR output, a clicked checkbox, or a returned token as proof of successful validation.
- Use human handoff for unsupported or production challenges, with a bounded wait and fresh inspection before resume.

See the [MCP tool catalog](https://github.com/masakaai/rea-captcha/blob/main/docs/mcp-tools.md) for exact inputs and configuration requirements. The [validation record](https://github.com/masakaai/rea-captcha/blob/main/docs/validation.md) documents the same-session and provider-test boundaries; it is not evidence of production CAPTCHA solving.
