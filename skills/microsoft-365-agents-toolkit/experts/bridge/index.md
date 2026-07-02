# bridge-router

## purpose

Route cross-platform bridging tasks to the minimal set of micro-expert files. Each expert covers bridging between Slack and Teams (or AWS and Azure) in either direction. Read only the clusters that match the user's request.

## task clusters

### Block Kit <-> Adaptive Cards
When: converting Block Kit JSON to Adaptive Card JSON or vice versa, mapping Slack blocks to card elements, mapping Adaptive Card elements to Block Kit blocks
Read:
- `ui-block-kit-adaptive-cards-ts.md`
Cross-domain deps: `../slack/ui.block-kit-ts.md` (Slack Block Kit patterns), `../teams/ui.adaptive-cards-ts.md` (Teams Adaptive Card patterns)

### Commands: Slash <-> Text
When: bridging slash commands between Slack and Teams, command registration differences, porting commands in either direction
Read:
- `commands-slash-text-ts.md`
Cross-domain deps: `../slack/runtime.slash-commands-ts.md` (Slack command patterns), `../teams/runtime.routing-handlers-ts.md` (Teams app.message() patterns)

### Events <-> Activities
When: mapping Slack events to Teams activity handlers or vice versa, event model differences
Read:
- `events-activities-ts.md`
Cross-domain deps: `../slack/runtime.bolt-foundations-ts.md` (Slack event patterns), `../teams/runtime.routing-handlers-ts.md` (Teams activity routes)

### Identity & OAuth Bridge
When: bridging Slack OAuth/identity and Azure AD/Entra ID, user mapping, SSO, OAuth implementation code (InstallationService, OAuthStateService, token refresh)
Read:
- `identity-oauth-bridge-ts.md`
Cross-domain deps: `../teams/auth.oauth-sso-ts.md` (Teams OAuth/SSO flow), `../teams/graph.usergraph-appgraph-ts.md` (Graph API for user lookup)

### Middleware <-> Handlers
When: converting Slack Bolt middleware chains to Teams handler patterns or vice versa, porting global/listener middleware, removing or adding ack()
Read:
- `middleware-handlers-ts.md`
Cross-domain deps: `../slack/runtime.bolt-foundations-ts.md` (Slack middleware patterns), `../teams/runtime.routing-handlers-ts.md` (Teams handler patterns)

### Modals <-> Dialogs
When: bridging Slack modals (views.open, viewSubmission, viewsUpdate, viewClosed, blockSuggestion in modals) and Teams task module / dialog flows
Read:
- `ui-modals-dialogs-ts.md`
Cross-domain deps: `../teams/ui.dialogs-task-modules-ts.md` (Teams dialog patterns), `ui-block-kit-adaptive-cards-ts.md` (converting modal UI between Block Kit and Adaptive Cards)

### App Home <-> Personal Tab
When: bridging Slack App Home tab (AppHomeOpenedEvent, views.publish) and Teams personal tab or bot welcome card
Read:
- `ui-app-home-personal-tab-ts.md`
Cross-domain deps: `events-activities-ts.md` (event mapping), `../teams/ui.adaptive-cards-ts.md` (card construction), `../teams/runtime.proactive-messaging-ts.md` (background updates)

### Legacy Attachments <-> Cards
When: bridging pre-Block Kit legacy Slack attachments (callback_id, color, actions, attachmentAction) and Adaptive Cards
Read:
- `ui-legacy-attachments-cards-ts.md`
Cross-domain deps: `../teams/ui.adaptive-cards-ts.md` (Teams card patterns)

### Transport: Socket Mode <-> HTTPS
When: bridging Slack Socket Mode, RTM, or HTTP Events API and Teams Bot Framework HTTPS transport
Read:
- `transport-socketmode-https-ts.md`
Cross-domain deps: `../teams/runtime.app-init-ts.md` (Teams app startup), `../teams/dev.debug-test-ts.md` (ngrok/Dev Tunnels setup)

### Infrastructure: Compute
When: bridging Lambda and Azure Functions, compute migration, serverless porting in either direction
Read:
- `infra-compute-ts.md`
- `infra-secrets-config-ts.md` (App Settings / env vars needed for compute config)

### Infrastructure: Storage
When: bridging S3 and Blob Storage, DynamoDB and Cosmos DB, storage migration in either direction
Read:
- `infra-storage-ts.md`
Cross-domain deps: `../teams/state.storage-patterns-ts.md` (IStorage interface for bot state on Cosmos DB)

### Infrastructure: Secrets & Config
When: bridging AWS Secrets Manager and Azure Key Vault, SSM and App Configuration
Read:
- `infra-secrets-config-ts.md`
Cross-domain deps: `../security/secrets-ts.md` (secrets management best practices)

### Infrastructure: Observability
When: bridging CloudWatch and Application Insights, X-Ray and Azure Monitor, logging migration
Read:
- `infra-observability-ts.md`
Cross-domain deps: `../teams/dev.debug-test-ts.md` (Teams SDK logging with ConsoleLogger)

### Interactive Responses
When: bridging respond({ replace_original }), respond({ delete_original }), chat.update, chat.postEphemeral, deferred responses, response_url patterns between Slack and Teams
Read:
- `interactive-responses-ts.md`
Cross-domain deps: `../teams/ui.adaptive-cards-ts.md` (card construction), `../teams/runtime.proactive-messaging-ts.md` (deferred update infrastructure)

### Files: Upload & Download
When: bridging files.upload, files.sharedPublicURL, file events, file download/upload patterns between platforms
Read:
- `files-upload-download-ts.md`
Cross-domain deps: `../teams/graph.usergraph-appgraph-ts.md` (Graph API auth), `../teams/runtime.manifest-ts.md` (supportsFiles flag)

### Link Unfurl <-> Preview
When: bridging link_shared event and chat.unfurl() (Slack) with link preview cards (Teams)
Read:
- `link-unfurl-preview-ts.md`
Cross-domain deps: `../teams/ui.message-extensions-ts.md` (message extension patterns), `../teams/runtime.manifest-ts.md` (messageHandlers domain config)

### Shortcuts <-> Extensions
When: bridging Slack global shortcuts and message shortcuts with Teams message extensions or compose extensions
Read:
- `shortcuts-extensions-ts.md`
Cross-domain deps: `../teams/ui.message-extensions-ts.md` (message extension patterns), `../teams/ui.dialogs-task-modules-ts.md` (task module details)

### Scheduling & Deferred Send
When: bridging chat.scheduleMessage, chat.deleteScheduledMessage, reminders.add, timer-based patterns between platforms
Read:
- `scheduling-deferred-send-ts.md`
Cross-domain deps: `../teams/runtime.proactive-messaging-ts.md` (proactive send infrastructure), `../teams/state.storage-patterns-ts.md` (persisting scheduled items)

### Channel Ops <-> Graph
When: bridging conversations.create, conversations.archive, conversations.invite, conversations.kick, conversations.setTopic via Graph API
Read:
- `channel-ops-graph-ts.md`
Cross-domain deps: `../teams/graph.usergraph-appgraph-ts.md` (Graph API auth), `identity-oauth-bridge-ts.md` (user ID mapping)

### Workflows <-> Automation
When: bridging Slack Workflow Builder workflows, custom workflow steps (workflow_step_execute), and Power Automate flows
Read:
- `workflows-automation-ts.md`
Cross-domain deps: `../teams/ui.adaptive-cards-ts.md` (card construction for bot-driven workflows), `../teams/runtime.proactive-messaging-ts.md` (flow-triggered bot messages)

### Composable Workflow Platform
When: composable workflow architecture, reusable workflow engine, WorkflowDefinition, template workflows, five-element lifecycle, workflow platform design, workflow operating layer
Read:
- `workflow.composable-platform-ts.md`
Cross-domain deps: `../teams/workflow.sharepoint-lists-ts.md` (state), `../teams/workflow.message-native-records-ts.md` (visibility), `../teams/workflow.triggers-compose-ts.md` (triggers), `../teams/ai.conversational-query-ts.md` (intelligence), `../teams/workflow.approvals-inline-ts.md` (routing)

### App Distribution & Packaging
When: bridging Slack App Directory listing, OAuth install flow, InstallationStore, org-level installs and Teams sideloading, app packaging, Teams Admin Center
Read:
- `app-distribution-packaging-ts.md`
Cross-domain deps: `identity-oauth-bridge-ts.md` (identity model bridge), `../teams/runtime.manifest-ts.md` (Teams manifest creation)

### Rate Limiting & Resilience
When: bridging rate limiting patterns, retry logic, throttling handling, proactive broadcast resilience, circuit breaker between platforms
Read:
- `rate-limiting-resilience-ts.md`
Cross-domain deps: `../teams/runtime.proactive-messaging-ts.md` (proactive send infrastructure), `../teams/graph.usergraph-appgraph-ts.md` (Graph API throttling)

### Cross-Platform Advisor
When: starting a cross-platform bridging project, assessing scope, making bridging decisions, "help me add Teams", "help me add Slack", "help me migrate", "what do I need to do to bridge"
Read:
- `cross-platform-advisor-ts.md`
Note: This expert orchestrates the full bridging workflow — it detects direction, scans the codebase, classifies the bot profile, walks through decisions, then routes to the individual experts above for implementation.

### Cross-Platform Architecture
When: hosting both bots in a single server, shared Express, dual bot, single process, platform-agnostic service layer, deployment architecture
Read:
- `cross-platform-architecture-ts.md`
Cross-domain deps: `../slack/runtime.bolt-foundations-ts.md` (Slack setup), `../teams/runtime.app-init-ts.md` (Teams setup)

### Python Cross-Platform
When: Python dual-platform, Python unified server, `slack_bolt` + `microsoft_teams`, FastAPI shared server, Python Slack + Teams, Tier 2, Python adaptation
Read:
- `python-cross-platform.md`
Cross-domain deps: `../slack/bolt-python.md` (Slack Python SDK), `../teams/teams-python.md` (Teams Python SDK), `cross-platform-architecture-ts.md` (architecture patterns to adapt)

### REST-Only Integration
When: Java, C#, Go, Ruby, no SDK, raw HTTP, Bot Framework REST API, Slack Events API, Slack Web API, manual JWT validation, manual signature verification, language without native SDK
Read:
- `rest-only-integration-ts.md`
Cross-domain deps: `cross-platform-architecture-ts.md` (if mixing REST with TS SDK)

### Composite: Full Slack <-> Teams Bridge
When: complete end-to-end cross-platform bridging between Slack and Teams bots
Read:
- `ui-block-kit-adaptive-cards-ts.md`
- `commands-slash-text-ts.md`
- `events-activities-ts.md`
- `identity-oauth-bridge-ts.md`
- `middleware-handlers-ts.md`
- `transport-socketmode-https-ts.md`
- `ui-modals-dialogs-ts.md`
- `ui-app-home-personal-tab-ts.md`
- `ui-legacy-attachments-cards-ts.md`
- `interactive-responses-ts.md`
- `files-upload-download-ts.md`
- `link-unfurl-preview-ts.md`
- `shortcuts-extensions-ts.md`
- `scheduling-deferred-send-ts.md`
- `channel-ops-graph-ts.md`
- `workflows-automation-ts.md`
- `app-distribution-packaging-ts.md`
- `rate-limiting-resilience-ts.md`
Cross-domain deps: `../teams/project.scaffold-files-ts.md` (scaffold the new Teams project), `../teams/runtime.app-init-ts.md` (initialize the Teams app), `../teams/runtime.manifest-ts.md` (create the Teams manifest)

### Composite: Full AWS <-> Azure Bridge
When: complete end-to-end infrastructure bridging between AWS and Azure
Read:
- `infra-compute-ts.md`
- `infra-storage-ts.md`
- `infra-secrets-config-ts.md`
- `infra-observability-ts.md`
Cross-domain deps: `../security/secrets-ts.md` (secrets hygiene for Azure)

## combining rule

If a request involves both Slack↔Teams app bridging **and** AWS↔Azure infra bridging, read files from **both** composite clusters.

## file inventory

`app-distribution-packaging-ts.md` | `channel-ops-graph-ts.md` | `workflow.composable-platform-ts.md` | `commands-slash-text-ts.md` | `cross-platform-advisor-ts.md` | `cross-platform-architecture-ts.md` | `events-activities-ts.md` | `files-upload-download-ts.md` | `identity-oauth-bridge-ts.md` | `infra-compute-ts.md` | `infra-observability-ts.md` | `infra-secrets-config-ts.md` | `infra-storage-ts.md` | `interactive-responses-ts.md` | `link-unfurl-preview-ts.md` | `middleware-handlers-ts.md` | `python-cross-platform.md` | `rate-limiting-resilience-ts.md` | `rest-only-integration-ts.md` | `scheduling-deferred-send-ts.md` | `shortcuts-extensions-ts.md` | `transport-socketmode-https-ts.md` | `ui-app-home-personal-tab-ts.md` | `ui-block-kit-adaptive-cards-ts.md` | `ui-legacy-attachments-cards-ts.md` | `ui-modals-dialogs-ts.md` | `workflows-automation-ts.md`

<!-- Updated 2026-02-27: Reframed from migrate-router to bridge-router — bidirectional cross-platform bridging between Slack↔Teams and AWS↔Azure. Renamed all files to platform-neutral names. -->
<!-- Updated 2026-02-27: Added cross-platform-architecture-ts (dual-bot hosting) and rest-only-integration-ts (SDK-less HTTP patterns for Java/C#/Go). -->
<!-- Updated 2026-02-28: Added RED gap workarounds and YELLOW gap best practices to expert files: interactive-responses-ts (R1 refresh.userIds, Y11 _version), events-activities-ts (R2 reaction→button, Y16 RSC manifest), ui-modals-dialogs-ts (R3 cancel TTL, R4/R6 step routing, R5 validation re-render), scheduling-deferred-send-ts (R7 Service Bus), link-unfurl-preview-ts (Y7 cache middleware), commands-slash-text-ts (Y1 text+manifest), rate-limiting-resilience-ts (Y17 retry+p-queue). -->
<!-- Updated 2026-03-05: Added workflow.composable-platform-ts for composable workflow operating layer architecture -->
<!-- Updated 2026-02-28: Added remaining missing patterns: events-activities-ts (Y2 replyWithBroadcast helper, Y3 Graph thread replies), files-upload-download-ts (Y4/5/6 sendFile helper), ui-modals-dialogs-ts (Y9 dynamic selects), ui-block-kit-adaptive-cards-ts (Y14 Action.ShowCard confirmation), link-unfurl-preview-ts (Y15 manifest domain generator), transport-socketmode-https-ts (R10 Azure Relay for on-prem). -->
