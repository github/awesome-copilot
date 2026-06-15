# slack-router

## purpose

Route Slack app tasks to the minimal set of micro-expert files. Read only the clusters that match the user's request.

## task clusters

### Bolt Foundations
When: setting up a Slack Bolt app, `App()` constructor, listeners, middleware, event subscriptions
Read:
- `runtime.bolt-foundations-ts.md`
- `runtime.ack-rules-ts.md` (ack rules are integral to every Bolt handler)

### Ack Rules
When: `ack()` patterns, response timing, acknowledgement requirements, 3-second rule
Read:
- `runtime.ack-rules-ts.md`
Depends on: `runtime.bolt-foundations-ts.md` (ack applies within Bolt handler types)

### Slash Commands
When: slash commands, `/command`, command registration, command response
Read:
- `runtime.slash-commands-ts.md`
- `runtime.ack-rules-ts.md` (commands require ack within 3 seconds)
- `ui.block-kit-ts.md` (only if command opens a modal or sends Block Kit message)

### Block Kit UI
When: Block Kit, blocks, surfaces, modals, home tab, interactive components
Read:
- `ui.block-kit-ts.md`
- `runtime.ack-rules-ts.md` (interactive elements require ack in action/view handlers)
Depends on: `runtime.bolt-foundations-ts.md` (action/view handlers registered on the App)

### Events API
When: `app.event()`, event subscriptions, event types, `app_mention`, `reaction_added`, `team_join`, `app_home_opened`, `member_joined_channel`, retry handling, `context.retryNum`, `ignoreSelf`, `directMention`
Read:
- `bolt-events-ts.md`
- `runtime.bolt-foundations-ts.md` (handler registration context)

### Assistant Container
When: Slack Assistant, assistant panel, `threadStarted`, `userMessage`, `threadContextChanged`, `setStatus`, `setSuggestedPrompts`, `setTitle`, `getThreadContext`, `AssistantThreadContextStore`, `app.assistant()`
Read:
- `bolt-assistant-ts.md`
- `runtime.bolt-foundations-ts.md` (App setup for assistant registration)

### OAuth & Distribution
When: OAuth, multi-workspace, `InstallProvider`, `InstallationStore`, `authorize`, `clientId`, `clientSecret`, token storage, app distribution, `stateSecret`, Enterprise Grid, `tokens_revoked`, `app_uninstalled`
Read:
- `bolt-oauth-distribution-ts.md`
- `runtime.bolt-foundations-ts.md` (App constructor OAuth options)

### Socket Mode
When: Socket Mode, `socketMode`, `appToken`, `xapp-`, WebSocket, local development, no public URL, `SocketModeReceiver`, `@slack/socket-mode`, connection lifecycle, reconnect, `connections:write`
Read:
- `runtime.socket-mode-ts.md`
- `runtime.bolt-foundations-ts.md` (App constructor setup)
Depends on: `runtime.bolt-foundations-ts.md` (App constructor options)

### Web API & Proactive Messaging
When: `client.chat.postMessage`, `chat.update`, `chat.delete`, proactive messages, `chat.postEphemeral`, ephemeral, scheduled messages, `chat.scheduleMessage`, `users.info`, `users.lookupByEmail`, `conversations.list`, `conversations.history`, `filesUploadV2`, file upload, say vs respond vs client, pagination, cursor, rate limits
Read:
- `web-api-proactive-ts.md`
- `runtime.bolt-foundations-ts.md` (App setup and client initialization)
Depends on: `runtime.bolt-foundations-ts.md` (client property and token management)

### Shortcuts
When: shortcuts, global shortcut, message shortcut, `app.shortcut()`, `message_action`, compose menu, message context menu, `callback_id`, shortcut payload
Read:
- `runtime.shortcuts-ts.md`
- `runtime.ack-rules-ts.md` (shortcuts require ack within 3 seconds)
- `ui.modals-lifecycle-ts.md` (shortcuts typically open modals via trigger_id)
Depends on: `runtime.bolt-foundations-ts.md` (handler registration context)

### Modal Lifecycle
When: modals, `views.open`, `views.update`, `views.push`, `view_submission`, `view_closed`, `app.view()`, `response_action`, `private_metadata`, multi-step modal, modal validation, modal stack, `notify_on_close`, `trigger_id`
Read:
- `ui.modals-lifecycle-ts.md`
- `runtime.ack-rules-ts.md` (view submission ack patterns)
- `ui.block-kit-ts.md` (block layout for modal content)
Depends on: `runtime.bolt-foundations-ts.md` (App setup for view handler registration)

### Bolt for Python
When: Python, `slack_bolt`, `AsyncApp`, Flask adapter, FastAPI adapter, Django adapter, `SocketModeHandler`, Python Slack SDK, `@app.message`, `@app.command`, `@app.action`, `@app.event`, `@app.view`, `@app.shortcut`, `client.chat_postMessage`, `client.views_open`, argument injection, decorator listeners
Read:
- `bolt-python.md`
Note: All TS experts provide architectural patterns. This expert provides Python API mappings. Load the relevant TS expert for concepts, then this expert for Python translation.

### Bolt for Java
When: Java, `slack-bolt-java`, `com.slack.api.bolt`, Spring Boot, `SlackAppServlet`, `AppConfig.builder()`, `MethodsClient`, `ctx.client()`, `ctx.ack()`, `ctx.say()`, request configurator lambdas, `app.command`, `app.event`, `app.blockAction`, `app.viewSubmission`, `app.globalShortcut`, `SocketModeApp`
Read:
- `bolt-java.md`
Note: Java has SDK support for Slack only (Tier 3). For the Teams side, route to `../bridge/rest-only-integration-ts.md`.

### CLI: Getting Started
When: Slack CLI, `slack` command, install CLI, `slack auth login`, `slack auth list`, `slack create`, `slack project create`, `slack project init`, `slack project samples`, `slack doctor`, `.slack/` config, `project.json`, `cli-config.json`, hooks, `slack upgrade`, `slack version`, CLI setup
Read:
- `cli.getting-started.md`

### CLI: Local Dev & Deploy
When: `slack run`, `slack deploy`, `slack activity`, local development, deploy to Slack, hosted platform, dev server, activity logs, hot reload, file watching, Socket Mode dev, `--cleanup`, `--activity-level`, hooks system
Read:
- `cli.local-dev-deploy.md`
- `cli.getting-started.md` (only if project not yet set up)
Depends on: `cli.getting-started.md` (project must exist before run/deploy)

### CLI: Manifest & Triggers
When: `slack manifest`, `slack manifest validate`, `slack manifest info`, `manifest.ts`, `slack.json`, `slack trigger`, trigger create, trigger list, trigger update, trigger delete, trigger access, trigger types, shortcut trigger, event trigger, scheduled trigger, webhook trigger, `slack function`, function distribute, workflow trigger, trigger definition file
Read:
- `cli.manifest-triggers.md`
Depends on: `cli.getting-started.md` (project must exist before manifest/trigger ops)

### CLI: Datastore & Environment
When: `slack datastore`, datastore put, datastore get, datastore delete, datastore query, datastore count, bulk-put, bulk-get, bulk-delete, datastore update, `slack env`, `slack env add`, environment variable, `slack external-auth`, external OAuth provider, DefineDatastore
Read:
- `cli.datastore-env.md`
- `cli.manifest-triggers.md` (datastores must be declared in manifest)
Depends on: `cli.local-dev-deploy.md` (app must be deployed before datastore/env ops)

### Slack Automations Platform
When: Slack next-gen platform, DefineFunction, DefineWorkflow, DefineDatastore, Slack triggers, Slack hosted functions, Deno, Workflow Builder, custom functions, slack automation, competitive analysis
Read:
- `workflow.slack-automations-ts.md`
- `cli.manifest-triggers.md` (trigger definitions)
- `cli.datastore-env.md` (datastore operations)

### CLI: App Management
When: `slack app install`, `slack app uninstall`, `slack app delete`, `slack app link`, `slack app unlink`, `slack app list`, `slack app settings`, `slack collaborator`, collaborator add, collaborator remove, collaborator list, multi-workspace, workspace management
Read:
- `cli.app-management.md`
Depends on: `cli.local-dev-deploy.md` (app must be deployed before install/collaborator ops)

## cross-platform bridging

If the developer wants to **add Teams support** to an existing Slack app, route to `../bridge/index.md` for cross-platform bridging experts. The bridge domain covers Slack↔Teams feature mapping, UI conversion, identity bridging, and infrastructure migration.

## combining rule

If a request spans multiple clusters (e.g., "add a slash command that opens a Block Kit modal"), read files from **every** matching cluster. Avoid duplicates.

## file inventory

`bolt-assistant-ts.md` | `bolt-events-ts.md` | `bolt-java.md` | `bolt-oauth-distribution-ts.md` | `bolt-python.md` | `cli.app-management.md` | `cli.datastore-env.md` | `cli.getting-started.md` | `cli.local-dev-deploy.md` | `cli.manifest-triggers.md` | `runtime.ack-rules-ts.md` | `runtime.bolt-foundations-ts.md` | `runtime.shortcuts-ts.md` | `runtime.slash-commands-ts.md` | `runtime.socket-mode-ts.md` | `ui.block-kit-ts.md` | `ui.modals-lifecycle-ts.md` | `web-api-proactive-ts.md` | `workflow.slack-automations-ts.md`

<!-- Updated 2026-02-27: Added bolt-assistant-ts (Assistant container), bolt-events-ts (Events API), bolt-oauth-distribution-ts (OAuth/multi-workspace) experts based on @slack/bolt v4.6.0 source -->
<!-- Updated 2026-03-05: Added workflow.slack-automations-ts for Slack next-gen platform (functions, workflows, triggers, datastores) -->
<!-- Updated 2026-03-01: Added 5 Slack CLI experts (getting-started, local-dev-deploy, manifest-triggers, datastore-env, app-management) based on slack-cli Go source -->
