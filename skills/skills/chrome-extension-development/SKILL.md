---
name: chrome-extension-development
description: Build, review, debug, and secure Chrome extensions using Manifest V3, including service workers, content scripts, extension pages, Chrome APIs, messaging, storage, permissions, authentication, testing, and Chrome Web Store preparation.
---

# Chrome Extension Development

Build Chrome extensions with Manifest V3 using minimal permissions, clear context boundaries, secure data flow, event-driven background processing, and maintainable architecture.

## When to Use

Use this skill when creating or modifying Chrome extensions, including:

- Manifest V3 migration
- Service workers
- Content scripts
- Popup, options, side-panel, and extension pages
- Chrome APIs
- Messaging
- Storage
- External API integration
- Authentication
- Debugging and code review
- Chrome Web Store preparation

First determine whether the requirement actually needs an extension or privileged browser access.

## Manifest and Permissions

Use Manifest V3 for new extensions. Prefer service workers, content scripts, extension pages, Chrome APIs, and declarative APIs.

Keep `manifest.json` minimal. Request only permissions required by the feature. Prefer narrow host permissions and optional permissions where practical. Avoid `<all_urls>` unless broad access is genuinely required.

Do not invent Chrome API names, parameters, or permissions. When current API behavior is uncertain, verify the official Chrome documentation.

## Extension Contexts

Treat these as separate execution contexts:

- Service worker
- Content script
- Popup
- Options page
- Side panel
- Other extension pages

Do not assume they share DOM access, variables, memory, APIs, or lifecycle. Use explicit messaging between contexts.

Choose the smallest architecture that satisfies the requirement. Do not create unnecessary files, contexts, frameworks, or dependencies.

Before implementation, identify the user workflow, required contexts, APIs, permissions, message flow, persistent state, authentication, external services, and security constraints.

## Service Workers

Manifest V3 service workers are event-driven and can be stopped and restarted.

Use them for:

- Message handling
- Extension lifecycle events
- API requests
- Storage
- Alarms
- Notifications
- Context menus
- Tab events

Do not treat a service worker as a persistent process. Persist state that must survive termination.

## Content Scripts

Use content scripts to inspect or modify webpages.

They should:

- Minimize DOM manipulation
- Avoid unnecessary polling
- Avoid global namespace collisions
- Handle dynamic content
- Clean up injected UI and listeners
- Use messaging for privileged operations

Do not assume content scripts can directly use privileged APIs.

## Messaging

Define explicit message contracts containing a message type, payload, response, and error behavior.

Validate incoming messages and payloads. Never blindly trust data received from another context.

For larger extensions, centralize message types.

Typical flow:

```text
Content Script -> Service Worker -> API/Storage -> Response
```

## UI

Keep popup code focused on short user interactions. For complex workflows, prefer an extension page or side panel.

Use accessible controls and meaningful labels. Separate UI state from business logic where practical.

## Storage

Choose storage based on the data's purpose:

- `chrome.storage.local` — persistent local data
- `chrome.storage.sync` — small synchronized preferences
- `chrome.storage.session` — temporary session state

Handle missing, invalid, outdated, and corrupt values.

Do not treat extension storage as a secure secret store.

## External APIs

Use the service worker for privileged or cross-origin API operations when appropriate.

Handle authentication failures, timeouts, network failures, invalid responses, and rate limits.

Use caching, debouncing, throttling, pagination, and request deduplication when useful.

Never hard-code private API keys, private keys, service-account credentials, passwords, or other confidential secrets into extension code.

Anything shipped to the browser should be considered inspectable.

## Authentication

Prefer established OAuth/OIDC mechanisms when appropriate.

Consider token expiration, logout, refresh, storage, context exposure, and authentication failures.

Never embed confidential client secrets or private credentials in client-side code. Do not put sensitive tokens into URLs.

If the authentication model is unclear, explain the security implications before implementation.

## Security

Treat extensions as privileged software.

### Untrusted Content

Never insert untrusted data directly into HTML.

Prefer:

```javascript
element.textContent = value;
```

over unsafe HTML insertion.

### Dynamic Code

Do not introduce `eval()`, `new Function()`, or equivalent dynamic code execution.

### Messages

Validate message type, required fields, data types, and allowed values.

### External Data

Treat webpage content and API responses as untrusted. Validate and sanitize data before rendering or processing.

### Secrets

Never commit or bundle:

- Private API keys
- Private keys
- Service-account JSON
- Passwords
- Production credentials

## Performance

Prefer event-driven behavior.

Avoid aggressive polling, excessive DOM observers, repeated API requests, unnecessary content-script injection, and large in-memory datasets.

Use debouncing, throttling, caching, pagination, request deduplication, and appropriate retries when needed.

Use the narrowest event or observer that satisfies the requirement.

## Error Handling

Handle failures explicitly, including:

- Permission denial
- Unsupported URLs
- Missing active tabs
- Service-worker restart
- API timeout
- Network failure
- Authentication failure
- Invalid API responses
- Storage failure
- Message delivery failure

User-facing errors should explain the problem and provide a useful recovery action when possible. Do not silently swallow errors.

## Existing Projects

Before modifying an existing extension:

1. Read `manifest.json`.
2. Identify extension contexts.
3. Inspect messaging and storage.
4. Inspect permissions and host permissions.
5. Identify frameworks and build tooling.
6. Follow existing project conventions.

Do not rewrite architecture unnecessarily. Preserve unrelated functionality.

If the project already uses React, Vue, Svelte, TypeScript, or another framework, follow its existing build system. Do not replace a framework without a clear reason.

## Testing

Test the actual extension contexts.

### Installation

Test fresh installation, reload, and upgrade behavior.

### UI

Test popup, options, side panel, and relevant viewport sizes.

### Content Scripts

Test supported and unsupported pages, dynamic content, navigation, and multiple tabs.

### Service Worker

Test startup, restart, messages, alarms/events, and error handling.

### Authentication

Test login, logout, expired tokens, invalid credentials, and network failure.

### Storage

Test empty, existing, invalid, and unusually large datasets where relevant.

## Debugging

When debugging:

1. Identify the failing extension context.
2. Inspect its console and logs.
3. Inspect service-worker and content-script logs.
4. Inspect runtime messages.
5. Inspect network requests.
6. Verify permissions and manifest configuration.
7. Reproduce the smallest failing scenario.
8. Fix the root cause.

Do not assume a webpage console error originated from the extension.

## Chrome Web Store

Before publishing, review:

- Name and description
- Icons and screenshots
- Manifest
- Permissions and host permissions
- Privacy requirements
- Remote code
- Third-party dependencies
- Authentication
- Data collection
- Privacy policy requirements
- User disclosures

Remove development credentials, test credentials, debug code, unnecessary logging, and unused permissions.

## Common Mistakes

Avoid:

- Treating a service worker as persistent
- Assuming content scripts can use privileged APIs
- Requesting unnecessarily broad permissions
- Storing secrets in source code
- Trusting messages without validation
- Rendering untrusted data with unsafe HTML
- Depending on in-memory service-worker state
- Polling when events are available
- Forgetting service-worker restart tests
- Assuming popup state persists after closing
- Adding unnecessary frameworks

## Implementation Workflow

When building or modifying an extension:

1. Understand the user workflow.
2. Inspect the existing codebase.
3. Identify contexts and permissions.
4. Design message and data flow.
5. Update the manifest.
6. Implement core functionality and UI.
7. Add error handling.
8. Review security.
9. Test each context.
10. Test the complete workflow.
11. Review permissions again.
12. Prepare production configuration.

Do not generate unnecessary files, permissions, dependencies, or abstractions.

## Response Guidelines

Before implementation, explain decisions affecting architecture, permissions, security, lifecycle, or maintainability.

When generating code:

- Prefer complete working changes
- Follow existing project conventions
- Preserve unrelated behavior
- Keep message contracts explicit
- Avoid unnecessary abstractions

Explicitly identify security and Chrome Web Store risks. Verify uncertain Chrome API behavior against official documentation instead of guessing.
