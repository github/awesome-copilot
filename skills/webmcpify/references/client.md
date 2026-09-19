# ChatGPT client reality — Site tools

Checked 2026-09-14 against the official OpenAI documentation:
<https://learn.chatgpt.com/docs/webmcp>. Re-check that page before publishing or
relying on model/workspace availability; this UI is moving independently of the
WebMCP draft and Chrome implementation.

## What is documented

- ChatGPT calls WebMCP integrations **Site tools**. In the desktop app's built-in
  browser, open **Site tools** in the address bar and then **Available site tools**
  to inspect the page's registrations. This is the fastest client-side ground
  truth for the currently open page.
- Site tools are available to ChatGPT Work and Codex with GPT-5.6 Sol or GPT-5.6
  Terra. GPT-5.6 Luna currently has WebMCP disabled. The desktop app must be
  current, and availability still depends on rollout and the current page.
- The official page says Site tools are unavailable in Enterprise and Edu
  workspaces.
- ChatGPT's built-in browser currently implements only a subset of WebMCP: it
  discovers imperative tools registered with JavaScript in the top-level page,
  not declarative form tools or tools registered inside iframes. This is a
  client compatibility boundary, not evidence that either broader WebMCP form
  or frame support is invalid in Chrome.
- Tools belong to the page that registered them. Closing or navigating away can
  make them unavailable; a client that tears down the page between turns cannot
  call that old registration.
- Each invocation in the built-in browser receives a safety review. Normal access
  and confirmation policies still apply.

Date every public summary and link the official page. Do not publish model names
from memory.

## Dated observations, not promises

One session on 2026-08-26/27 observed plain Chat handing Site-tools work to Work
mode and collapsing the browser pane, while a Work workspace offered Site tools.
Those observations are account/UI-specific and do not override the official
availability statement. Verify them in the exact account before troubleshooting a
customer report or publishing a claim.

## Troubleshooting order

1. In the built-in browser, keep the page open and inspect **Site tools → Available
   site tools**.
2. Confirm the desktop app is current and the selected model is one the official
   page currently lists.
3. Confirm the account/workspace is eligible; absence on the wrong model can look
   exactly like a broken integration because the assistant falls back to ordinary
   browser interaction.
4. Confirm the expected Site tool is registered imperatively in the top-level
   page. A declarative form or iframe registration may be valid WebMCP but is not
   currently discoverable as a ChatGPT Site tool.
5. For the website itself, confirm a secure context and live registration. Use the
   headed-Chrome harness in `verify.md` for developer proof; ChatGPT availability
   and Chrome harness success are separate checks.
