---
name: chrome-extension-development
description: Build, review, debug, and improve production-quality Chrome extensions using Manifest V3. Use when creating a new Chrome extension, adding extension features, working with content scripts, service workers, popup or options pages, Chrome APIs, messaging, storage, permissions, authentication, security, testing, or Chrome Web Store preparation.
license: MIT
---

# Chrome Extension Development

Build Chrome extensions using modern Manifest V3 architecture, secure browser APIs, minimal permissions, maintainable code structure, and production-oriented development practices.

## When to Use

Use this skill when the user asks to:

- Create a Chrome extension from scratch
- Add a feature to an existing Chrome extension
- Migrate an extension to Manifest V3
- Build popup, options, or extension pages
- Create or modify content scripts
- Create or modify extension service workers
- Communicate between extension contexts
- Use Chrome extension APIs
- Store or synchronize extension data
- Integrate an extension with external APIs
- Add authentication to an extension
- Debug extension behavior
- Improve extension security or permissions
- Prepare an extension for Chrome Web Store submission
- Review an extension architecture or implementation

Do not assume that every browser-based feature belongs in an extension. First determine whether the requirement actually needs extension privileges, browser APIs, page access, or background execution.

## Core Principles

### 1. Use Manifest V3

New Chrome extensions should use Manifest V3 unless there is a specific compatibility requirement preventing it.

Do not generate Manifest V2 implementations for new projects.

Prefer:

- `manifest.json`
- Extension service workers
- Content scripts
- Extension pages
- Chrome extension APIs
- Declarative APIs where appropriate

Avoid deprecated Manifest V2 patterns.

### 2. Minimize Permissions

Request the smallest possible permission set.

Before adding a permission, determine:

1. Why it is required
2. Which API requires it
3. Whether a narrower permission exists
4. Whether the feature can work without the permission
5. Whether the permission creates additional Chrome Web Store review concerns

Prefer optional permissions when functionality does not need to be enabled immediately.

Do not request broad permissions such as `<all_urls>` unless they are genuinely required.

### 3. Separate Extension Contexts

Understand that these contexts have different responsibilities and security boundaries:

- Service worker
- Content script
- Popup
- Options page
- Extension pages
- Side panel
- DevTools page

Do not assume variables, DOM access, APIs, or runtime behavior are shared between contexts.

Use explicit messaging when communication is required.

### 4. Keep the Service Worker Event-Driven

Manifest V3 service workers are not persistent background pages.

Do not design the service worker around continuously running processes.

Use:

- Event listeners
- `chrome.alarms`
- Message handlers
- Declarative APIs
- Storage
- Short-lived asynchronous operations

Persist important state because the service worker can be stopped and restarted by Chrome.

## Architecture Workflow

When creating a new extension, follow this sequence.

### Step 1: Understand the Requirement

Identify:

- User workflow
- Browser pages involved
- Required UI
- Required browser APIs
- External APIs
- Data that must persist
- Authentication requirements
- Security requirements
- Chrome Web Store constraints

Do not start generating files before understanding the extension's execution contexts.

### Step 2: Determine the Extension Architecture

Choose only the contexts that are actually required.

Typical architecture:

```text
Chrome Extension
│
├── manifest.json
│
├── service-worker.js
│
├── content/
│   └── content.js
│
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
│
├── options/
│   ├── options.html
│   ├── options.js
│   └── options.css
│
├── sidepanel/
│   ├── sidepanel.html
│   ├── sidepanel.js
│   └── sidepanel.css
│
└── assets/
```

Do not create every directory by default. Adapt the structure to the requirements.

### Step 3: Define the Message Flow

For extensions containing multiple contexts, explicitly define communication.

Example:

```text
Content Script
      │
      │ chrome.runtime.sendMessage()
      ▼
Service Worker
      │
      │ API request / storage / processing
      ▼
Service Worker
      │
      │ response/message
      ▼
Content Script
```

Use message contracts that clearly define:

- Message type
- Payload
- Expected response
- Error behavior

Avoid tightly coupling contexts through undocumented message structures.

## Manifest Design

Start with the minimum manifest.

Example:

```json
{
  "manifest_version": 3,
  "name": "Example Extension",
  "version": "1.0.0",
  "description": "Example Chrome extension",
  "action": {
    "default_popup": "popup/popup.html"
  },
  "background": {
    "service_worker": "service-worker.js"
  }
}
```

Add permissions only when required.

Common permission categories include:

- `storage`
- `tabs`
- `activeTab`
- `scripting`
- `alarms`
- `notifications`
- `identity`

Treat host permissions separately from API permissions.

For example:

```json
{
  "host_permissions": [
    "https://example.com/*"
  ]
}
```

Prefer narrowly scoped hosts over broad access.

## Content Scripts

Use content scripts when the extension needs to inspect or modify webpages.

Content scripts should:

- Minimize DOM manipulation
- Avoid unnecessary polling
- Avoid global variable collisions
- Handle dynamic pages carefully
- Clean up event listeners and injected UI when appropriate
- Communicate with the service worker through explicit messages

Do not assume content scripts can directly access privileged Chrome APIs.

If privileged functionality is required, send a message to the service worker.

## Service Worker

Use the service worker for privileged or background operations such as:

- API requests
- Authentication coordination
- Storage operations
- Alarms
- Message handling
- Extension lifecycle events
- Context menu actions
- Tab-related events

Remember:

```text
Service worker ≠ persistent background process
```

Never rely on in-memory state surviving indefinitely.

Persist state that must survive service-worker termination.

## Popup and Extension UI

Keep popup logic focused on user interaction.

Avoid putting large application workflows directly into popup code.

For complex interfaces, consider:

- Side panel
- Extension page
- Options page
- Dedicated extension tab

Keep UI state separate from business logic where practical.

Use accessible HTML controls and meaningful labels.

## Storage

Choose storage based on the data's purpose.

Typical options:

- `chrome.storage.local` for local extension data
- `chrome.storage.sync` for small user preferences that should synchronize
- `chrome.storage.session` for temporary session state

Do not store secrets merely because the storage API makes it convenient.

Treat client-side extension storage as accessible to the extension and potentially exposed through compromised extension code.

## External APIs

When integrating external APIs:

1. Determine whether the request should originate from the content script or service worker.
2. Prefer the service worker for privileged or cross-origin requests when appropriate.
3. Validate API responses.
4. Handle network failures.
5. Handle authentication expiration.
6. Avoid embedding long-lived secrets in extension source code.

Never hard-code private API keys, client secrets, service-account credentials, or other sensitive credentials into the extension.

Remember that anything shipped to the browser should be considered potentially inspectable by the user.

## Authentication

For authentication:

- Prefer established browser authentication mechanisms.
- Use OAuth/OIDC flows when appropriate.
- Avoid storing access tokens unnecessarily.
- Handle token expiration.
- Avoid putting tokens into URLs.
- Never ship client secrets that are intended to remain confidential.
- Consider the security implications of content-script access to authenticated pages.

If authentication architecture is ambiguous, explain the security trade-offs before implementing it.

## Security

Treat browser extensions as privileged software.

Always review:

### Permissions

Check whether every permission is necessary.

### Content Security Policy

Avoid unsafe patterns that weaken the extension's security model.

Do not introduce:

```text
eval()
new Function()
```

or equivalent dynamic code execution without a compelling, reviewed reason.

### XSS

Do not insert untrusted data directly with:

```javascript
element.innerHTML = userInput;
```

Prefer:

```javascript
element.textContent = userInput;
```

or safely construct DOM elements.

### Message Validation

Do not blindly trust messages received from other extension contexts.

Validate:

- Message type
- Required fields
- Data types
- Allowed values

### External Content

Treat content retrieved from webpages and external APIs as untrusted input.

### Secrets

Never commit:

- API keys
- OAuth client secrets
- Private keys
- Service-account JSON files
- Passwords
- Production credentials

## Chrome API Usage

Before implementing a Chrome API:

1. Identify the exact API.
2. Determine required permissions.
3. Verify whether the API is available in the required extension context.
4. Check whether the API behavior differs under Manifest V3.
5. Consider whether a declarative alternative is preferable.

Do not invent Chrome API methods or parameters.

When API behavior is uncertain, consult current official Chrome documentation rather than guessing.

## Performance

Avoid:

- Excessive DOM observers
- Aggressive polling
- Repeated API calls
- Unnecessary content-script injection
- Large data stored in memory
- Blocking operations in UI contexts

Prefer event-driven behavior.

For webpage monitoring, use the narrowest observer or event mechanism that satisfies the requirement.

For network-heavy operations, consider:

- Debouncing
- Throttling
- Caching
- Pagination
- Request deduplication
- Appropriate retry behavior

## Error Handling

Handle failures explicitly.

At minimum consider:

- Permission denied
- Missing active tab
- Invalid URL
- Service-worker restart
- API timeout
- API authentication failure
- Network failure
- Invalid API response
- Storage failure
- Message delivery failure

User-facing errors should explain what happened and, when possible, what the user can do next.

Do not silently swallow errors.

## Testing

Before considering an extension complete, test:

### Installation

- Fresh installation
- Extension reload
- Upgrade scenario

### UI

- Popup
- Options
- Side panel, if applicable
- Different viewport sizes where relevant

### Content Script

- Supported pages
- Unsupported pages
- Dynamically rendered content
- Multiple tabs
- Page navigation

### Service Worker

- Startup
- Restart
- Message handling
- Alarms/events
- Error handling

### Permissions

Verify the extension behaves correctly when optional permissions are unavailable.

### Authentication

Test:

- Login
- Logout
- Expired token
- Invalid credentials
- Network failure

### Data

Test:

- Empty storage
- Existing storage
- Corrupt/unexpected data
- Large datasets where relevant

## Debugging Workflow

When debugging an extension:

1. Identify which extension context is failing.
2. Inspect the relevant console.
3. Check service-worker logs.
4. Check content-script logs.
5. Inspect extension messages.
6. Inspect network requests.
7. Verify permissions.
8. Verify the manifest.
9. Reproduce the issue with the smallest possible scenario.
10. Fix the underlying architecture rather than adding unrelated workarounds.

Do not assume an error in a webpage console originated from the extension.

## Chrome Web Store Readiness

Before publishing, review:

- Extension name
- Description
- Icons
- Screenshots
- Manifest
- Permissions
- Host permissions
- Privacy requirements
- Remote code usage
- Third-party libraries
- Authentication behavior
- Data collection
- Privacy policy requirements
- User-facing disclosures

Remove development-only code, debug logging, test credentials, and unused permissions.

## Code Quality

Prefer:

- Small modules
- Clear function boundaries
- Explicit data flow
- Consistent naming
- Centralized configuration
- Reusable utilities
- Explicit error handling
- Minimal permissions

Avoid:

- Huge monolithic scripts
- Global mutable state
- Duplicate API logic
- Unnecessary abstractions
- Copy-pasted message handlers
- Hard-coded environment-specific values

## Existing Projects

When modifying an existing extension:

1. Inspect the existing architecture first.
2. Read `manifest.json`.
3. Identify extension contexts.
4. Identify current messaging patterns.
5. Identify storage usage.
6. Identify permissions.
7. Identify build tooling and framework.
8. Reuse established patterns unless they are demonstrably problematic.

Do not rewrite an existing extension's architecture merely because another architecture is theoretically cleaner.

Preserve unrelated functionality.

## Frameworks

If the project uses React, Vue, Svelte, TypeScript, or another framework:

- Follow the project's existing build system.
- Do not introduce a new framework unnecessarily.
- Keep extension-context boundaries clear.
- Ensure generated assets work with Manifest V3.
- Verify the final output directory matches the manifest paths.

For simple extensions, prefer a lightweight implementation rather than adding a framework solely for structure.

## Implementation Strategy

When asked to build an extension, follow this order:

1. Clarify the user workflow if requirements are incomplete.
2. Inspect an existing codebase if one exists.
3. Determine the required extension contexts.
4. Design the message/data flow.
5. Define the minimum permissions.
6. Define the manifest.
7. Implement the core functionality.
8. Implement the UI.
9. Add error handling.
10. Add security protections.
11. Test the extension contexts independently.
12. Test the complete user workflow.
13. Review permissions and security again.
14. Prepare production/Web Store configuration.

Do not generate unnecessary files or permissions.

## Response Guidelines

When proposing an extension architecture, explain:

- Why each extension context is required
- Why each permission is required
- How contexts communicate
- Where persistent state is stored
- How authentication works
- What security risks exist
- How the extension will be tested

When implementing code, prefer complete working changes over isolated snippets.

When a requirement has security or Chrome Web Store implications, explicitly call them out rather than silently choosing a risky implementation.

When official Chrome API behavior is uncertain or potentially changed, verify against current official documentation before making a definitive implementation decision.
