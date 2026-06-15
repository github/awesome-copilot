# cross-platform-advisor-ts

## purpose

Interactive cross-platform bridging advisor. Detects which platform(s) a bot already targets, determines the bridging direction, analyzes the codebase, and walks the developer through every YELLOW/RED bridging decision — with a "take all defaults" escape hatch on every question.

## rules

### Phase 0: Direction Detection

1. **Detect the existing platform.** Scan the codebase in parallel for platform signatures:

   | Pattern to search | Platform detected |
   |---|---|
   | `@slack/bolt` or `require('slack')` or `app.command(` (Bolt-style) | Slack |
   | `@microsoft/teams-ai` or `@microsoft/teams.apps` or `teamsBot` or `BotFrameworkAdapter` | Teams |
   | `Block Kit` or `"type":"section"` or `blocks:` (Slack-style) | Slack |
   | `AdaptiveCards` or `"type":"AdaptiveCard"` or `CardFactory` | Teams |
   | `SLACK_BOT_TOKEN` or `SLACK_APP_TOKEN` or `socketMode` | Slack |
   | `CLIENT_ID` + `CLIENT_SECRET` + `TENANT_ID` (Azure Bot) | Teams |
   | `ack(` (Slack acknowledgement) | Slack |
   | `app.on("message"` or `app.message(` (Teams AI style) | Teams |

2. **Determine direction.** Based on what was found:
   - **Slack only detected** → Direction is **Slack → Teams** (adding Teams support)
   - **Teams only detected** → Direction is **Teams → Slack** (adding Slack support)
   - **Both detected** → Dual-platform bot already exists. Ask what they want to do (extend, reconcile, or audit).
   - **Neither detected** → Ask the developer which platform they're starting from.

3. **Confirm with the developer.** Present the detected direction:
   ```
   header: "Direction"
   question: "I detected {platform} patterns in your codebase. Which direction are you bridging?"
   options:
     - label: "Add Teams to existing Slack bot (Recommended)"
       description: "Keep Slack, add Teams as a second platform."
     - label: "Add Slack to existing Teams bot"
       description: "Keep Teams, add Slack as a second platform."
     - label: "Audit existing dual-platform bot"
       description: "Both platforms detected — review coverage and gaps."
   ```

   Adapt the recommended option to match what was detected. If Teams was detected, recommend "Add Slack."

### Phase 1: Codebase Analysis

4. **Scan for platform API usage.** Search the codebase for these patterns to build a feature inventory. Run all searches in parallel:

   **Slack patterns (relevant when Slack → Teams):**

   | Pattern to search | What it detects | Maps to |
   |---|---|---|
   | `app.command` | Slash commands | G7 |
   | `app.message` | Message pattern matching | G1 |
   | `say(` or `respond(` | Simple replies | G2 |
   | `blocks:` or `Block Kit` or `"type":"section"` | Block Kit UI | G16 |
   | `views.open` or `views.push` | Modals / stacking | G19, Y24 |
   | `view_submission` or `viewSubmission` | Modal submission | G20 |
   | `app.use(` | Middleware | G14 |
   | `ack(` | Slack acknowledgement | G15 |
   | `chat.postEphemeral` or `response_type.*ephemeral` | Ephemeral messages | Y1, R1 |
   | `reply_broadcast` or `broadcast.*true` | Thread broadcast | Y2 |
   | `conversations.replies` | Thread discovery | Y3 |
   | `files.upload` or `file_shared` | File upload | Y4/5/6 |
   | `link_shared` or `chat.unfurl` | Link unfurling | Y7 |
   | `scheduleMessage` or `chat.schedule` | Scheduled messages | Y8, R7 |
   | `reminders.add` | Reminders | Y9 |
   | `conversations.archive` | Channel archive | Y10, R8 |
   | `conversations.kick` or `conversations.invite` | Channel member mgmt | Y11 |
   | `app.shortcut` or `global_shortcut` | Global shortcuts | Y13 |
   | `message_shortcut` | Message shortcuts | Y14 |
   | `block_suggestion` or `app.options` | Dynamic selects | Y15 |
   | `app_home_opened` or `views.publish` | App Home | Y16 |
   | `view_hash` or `hash` (in modal context) | View hash / race cond | Y17 |
   | `blockAction` (inside modals) | Mid-form updates | R4 |
   | `ack.*errors` or `response_action.*errors` | Field validation | R5 |
   | `notify_on_close` or `view_closed` | Cancel notification | R3 |
   | `workflow_step` or `workflow_step_execute` | Workflow Builder | Y12 |
   | `reaction_added` or `reaction_removed` | Emoji reactions | R2 |
   | `SLACK_APP_TOKEN` or `socketMode` or `SocketModeReceiver` | Socket Mode | Y19 |
   | `retryConfig` or `retry` (in Bolt config) | Built-in retry | Y20 |
   | `confirm:` or `"confirm"` (on button/action) | Confirmation dialogs | Y21 |
   | `*.example.com` in manifest or unfurl config | Unfurl wildcards | Y23 |
   | `conversations.create` or `conversations.setTopic` | Channel ops | Y10/Y11 |

   **Teams patterns (relevant when Teams → Slack):**

   | Pattern to search | What it detects | Slack equivalent |
   |---|---|---|
   | `app.on("message"` or `activity.text` | Message handling | `app.message` |
   | `AdaptiveCard` or `CardFactory.adaptiveCard` | Adaptive Cards | Block Kit |
   | `app.on("dialog"` or `taskModule` | Task module / dialog | `views.open` modal |
   | `proactiveMessage` or `continueConversation` | Proactive messaging | `chat.postMessage` to channel |
   | `app.on("messageReaction"` | Reaction events | `reaction_added` |
   | `refresh.userIds` | Per-user cards | Ephemeral messages |
   | `MessageExtension` or `composeExtension` | Message extensions | Shortcuts |
   | `tab.fetch` or `tab.submit` | Personal tabs | App Home |
   | `Graph` or `graphClient` | Microsoft Graph calls | Slack Web API |
   | `SSO` or `oauth` (Teams context) | SSO / OAuth | Slack OAuth |
   | `FileConsentCard` or `supportsFiles` | File consent flow | `files.upload` |
   | `messageHandlers` (in manifest) | Link unfurling | `link_shared` |
   | `ChannelMessage.Read.Group` (RSC) | All channel messages | Default in Slack |

5. **Build the feature list.** From scan results, produce a table: `Feature | Found (Y/N) | File:Line | Feature ID`. Only include features where code evidence was found.

6. **Determine the bot profile.** Use the feature list to classify:
   - **Profile A** — Only GREEN features found (G1–G34)
   - **Profile B** — GREEN + YELLOW from: Y1, Y2, Y3, Y4/5/6, Y17, Y18, Y21
   - **Profile C** — Profile B + any of: Y7, Y8, Y9, Y10, Y11, Y13, Y14, Y15, Y16, Y23, Y24
   - **Profile D** — Profile C + any of: Y12, Y19, Y20, Y22, or any RED feature is core

   Note: For Teams → Slack direction, the profile classification still applies — the feature IDs map to equivalent complexity tiers in the reverse direction.

7. **Present the profile.** Show the developer:
   - Their detected profile (A/B/C/D)
   - The bridging direction (Slack → Teams or Teams → Slack)
   - The feature inventory table
   - Which phases from the bridging sequence apply (reference `MigrationDecisionMatrix.md` Section 2)
   - How many YELLOW and RED decisions they need to make

### Phase 2: Decision Walkthrough

8. **Ask one decision at a time.** For each YELLOW/RED feature found in the codebase, present a question using `AskUserQuestion`. Walk through decisions in phase order (matching the bridging phase sequence), not alphabetically.

9. **Decision ordering.** Present decisions in this order (skip any not found in codebase):

   **Phase 5 — Interactive Responses:**
   Y1 (Ephemeral), Y21 (Confirmation dialogs), Y17 (View hash)

   **Phase 7 — Files + Unfurling:**
   Y4/5/6 (File upload), Y7 (Link unfurling), Y23 (Unfurl wildcards)

   **Phase 8 — Scheduling + Channel Ops:**
   Y8 (Scheduled messages), Y9 (Reminders), Y10 (Channel archive), Y11 (Channel member removal)

   **Phase 9 — Shortcuts + App Home:**
   Y13 (Global shortcuts), Y14 (Message shortcuts), Y15 (Dynamic selects), Y16 (App Home), Y24 (Multi-step modals)

   **Phase 10 — Workflows + Distribution:**
   Y12 (Workflow Builder), Y22 (App Directory)

   **Phase 11 — Resilience:**
   Y18 (All channel messages), Y19 (Socket Mode), Y20 (Retry)

   **Message handling (parallel with Phase 5):**
   Y2 (reply_broadcast), Y3 (Thread discovery)

   **RED features (after all YELLOW):**
   R1 (True ephemeral), R2 (Emoji reactions), R3 (viewClosed), R4 (Mid-form dynamic), R5 (Field validation), R6 (Dialog stacking), R7 (Scheduled API), R8 (Channel archive), R9 (Retroactive unfurl), R10 (Firewall transport)

   Note: For Teams → Slack direction, adapt the questions to reflect adding Slack equivalents. The same feature IDs apply but the "source" and "target" swap. For example, Y1 becomes "Your bot uses refresh.userIds — Slack supports true ephemeral messages via chat.postEphemeral. Use it directly."

10. **Every question gets an escape hatch.** The final option in every `AskUserQuestion` call MUST be one of:
   - First question: **"You Decide Everything"** — accept all defaults for ALL decisions (YELLOW + RED), skip remaining questions, jump to Phase 3.
   - Subsequent questions: **"You Decide Everything Else"** — accept defaults for all REMAINING decisions, skip remaining questions, jump to Phase 3.

   When the developer picks either escape hatch, record all remaining features as "default" and proceed to Phase 3 immediately.

11. **Question format for YELLOW features.** Each `AskUserQuestion` must include:
   - `header`: Feature ID (e.g., "Y1 Ephemeral")
   - `question`: Clear question about which approach they prefer (adapted for bridging direction)
   - Options from `MigrationDecisionMatrix.md` Section 3, with the **(Recommended)** option listed first
   - Final option: the escape hatch

12. **Question format for RED features.** Each `AskUserQuestion` must include:
   - `header`: Feature ID (e.g., "R4 Dynamic")
   - `question`: What they want to do about the platform gap (adapted for bridging direction)
   - Options matching the strategies from `MigrationDecisionMatrix.md` Section 4
   - Final option: the escape hatch

13. **Record every decision.** Maintain a running decisions table as you go:

    | Feature | Decision | Option | Notes |
    |---|---|---|---|
    | Y1 Ephemeral | `refresh.userIds` | A (Recommended) | — |
    | Y4/5/6 Files | `sendFile()` helper | B (Recommended) | Default accepted |
    | ... | ... | ... | ... |

### Phase 3: Bridging Plan Output

14. **Generate the bridging plan.** After all decisions are made (or defaults accepted), produce a single actionable plan with:

    - **Direction** — Which platform exists, which is being added
    - **Profile summary** — Profile letter, feature count, phase count
    - **Decisions summary** — The completed decisions table
    - **Phase-by-phase implementation order** — For each applicable phase:
      - Which expert(s) to load: `.experts/bridge/{filename}`
      - What to implement
      - Which decision applies (if any)
      - Go/no-go gate from `MigrationDecisionMatrix.md` Section 2
    - **Helpers to build** — List of helper utilities/plugins chosen (e.g., `sendFile()`, `RetryPlugin`), grouped as a "Phase 0" pre-work step
    - **RED feature workarounds** — For each RED feature, the chosen strategy and implementation approach
    - **Estimated phase count** — Total phases and which can be parallelized

15. **Always reference, never duplicate.** Point developers to the specific expert files for implementation details. Do NOT reproduce the code patterns from individual experts — just reference them by filename and rule number.

### Phase 4: Per-Project Implementation Order

When implementing each bridged project (whether a single sample or a batch), follow this exact sequence. Do NOT skip steps or reorder them.

16. **Step 1 — Write all source files.** Write every file the project needs before running any commands:
    - `package.json` — dependencies, scripts (`build`, `start`, `dev`)
    - `tsconfig.json` — TypeScript compiler config
    - `src/index.ts` — main entry point (and any additional `.ts` files)
    - `.env.sample` — template with placeholder values for all required env vars
    - Stub implementations — where an API is not yet wired up, leave a clearly marked `// TODO:` with an explanation of what should go there so the code still compiles.

17. **Step 2 — Install dependencies.** Run `npm install` in the project directory. Verify `node_modules` is created and there are no install errors.

18. **Step 3 — Build and verify.** Run `npm run build`. Must succeed with **zero TypeScript errors**. Fix any issues before proceeding.

19. **Step 4 — Create app manifest.**
    - **Adding Teams:** Create `appPackage/` directory with `manifest.json` (schema v1.19+), `color.png` (192x192), `outline.png` (32x32). The manifest must be valid and ready to zip for sideloading.
    - **Adding Slack:** Create or update `manifest.yaml` (Slack app manifest) with bot scopes, event subscriptions, and slash commands. Alternatively, configure via api.slack.com app settings.

20. **Step 5 — Write README.md.** The README is written **last** because it documents the final state of the project. It must contain:

    - **One-paragraph description** of what the example demonstrates.
    - **`## Prerequisites`** — Node.js 18+, platform-specific accounts and registrations.
    - **`## Environment Setup`** — step-by-step instructions for filling out `.env`.
    - **`## Running Locally`** — full launch sequence with tunneling setup.
    - **`## Installing the App`** — platform-specific installation instructions (sideloading for Teams, OAuth install for Slack, or both).
    - **`## What Was Bridged`** — bullet list mapping original platform concept → target platform equivalent.
    - **`## TODO`** — checklist of remaining items.

## question templates

Use these as the basis for each `AskUserQuestion` call. Adapt the question text based on what was found in the codebase (e.g., mention the specific file where the feature was detected) and the bridging direction.

### Y1 — Ephemeral Messages
```
question: "Your bot uses ephemeral messages ({file}:{line}). How should the target platform handle user-only visibility?"
header: "Y1 Ephemeral"
options:
  - label: "refresh.userIds (Recommended)"
    description: "Wrap cards with refresh.userIds for per-user content. Covers ~80% of cases. 4-8 hrs."
  - label: "Send to 1:1 chat"
    description: "Route ephemeral content to user's personal bot chat. Different UX but reliable. 2-4 hrs."
  - label: "Build sendEphemeral() helper"
    description: "SDK wrapper auto-detecting context. Best if reused across multiple bots. 8-12 hrs."
  - label: "{escape hatch}"
```

Note: For Teams → Slack, ephemeral is natively supported via `chat.postEphemeral`. This question may be skipped — just use the native API.

### Y2 — Threaded Replies with reply_broadcast
```
question: "Your bot uses reply_broadcast ({file}:{line}). How should the target platform handle thread + channel posting?"
header: "Y2 Broadcast"
options:
  - label: "Two API calls (Recommended)"
    description: "Call reply() and send() separately. Two lines of code, 1-2 hrs."
  - label: "Build reply(text, { broadcast }) wrapper"
    description: "Convenience method that internally sends both calls. 2-4 hrs."
  - label: "{escape hatch}"
```

### Y3 — Thread Discovery
```
question: "Your bot reads thread replies ({file}:{line}). How should the target platform fetch thread history?"
header: "Y3 Threads"
options:
  - label: "Graph API direct (Recommended)"
    description: "GET /messages/{id}/replies with ChannelMessage.Read.All permission. 4-8 hrs."
  - label: "Build getThreadReplies() helper"
    description: "Wrapper encapsulating Graph client setup and auth. 8-12 hrs."
  - label: "{escape hatch}"
```

Note: For Teams → Slack, use `conversations.replies` directly — native API.

### Y4/5/6 — File Upload
```
question: "Your bot uploads files ({file}:{line}). How should the target platform handle file operations?"
header: "Y4-6 Files"
options:
  - label: "Build sendFile() helper (Recommended)"
    description: "Unified wrapper: auto-detects personal/channel, routes to OneDrive/SharePoint, chunks >4MB. 24-40 hrs. The manual flow is a 30-line footgun."
  - label: "Manual FileConsentCard flow"
    description: "Implement the 3-step consent flow yourself. 16-24 hrs per upload pattern."
  - label: "{escape hatch}"
```

Note: For Teams → Slack, use `files.uploadV2` directly — much simpler than the Teams consent flow.

### Y7 — Link Unfurling
```
question: "Your bot unfurls links ({file}:{line}). How should the target platform handle link previews?"
header: "Y7 Unfurl"
options:
  - label: "Cache-first with prefetch (Recommended)"
    description: "Cache middleware wraps handler. Without this, the 5-second deadline silently kills slow unfurls. 12-16 hrs."
  - label: "Synchronous handler only"
    description: "Direct handler, must return within 5 seconds. Only viable for fast data sources. 4-8 hrs."
  - label: "{escape hatch}"
```

### Y8 — Scheduled Messages
```
question: "Your bot schedules messages ({file}:{line}). How should the target platform handle deferred delivery?"
header: "Y8 Schedule"
options:
  - label: "Functions timer + Cosmos DB (Recommended)"
    description: "Store in DB, Azure Functions timer polls and sends via proactive messaging. 16-24 hrs."
  - label: "Full scheduler plugin"
    description: "Reusable package with scheduleMessage()/cancelScheduledMessage(). 32-48 hrs."
  - label: "Power Automate delegation"
    description: "Offload to Power Automate flows. Requires license. 8-12 hrs."
  - label: "{escape hatch}"
```

Note: For Teams → Slack, use `chat.scheduleMessage` directly — native API.

### Y9 — Reminders
```
question: "Your bot sets reminders ({file}:{line}). How should the target platform handle reminder delivery?"
header: "Y9 Reminders"
options:
  - label: "Piggyback on scheduler (Recommended)"
    description: "Reuse Y8 scheduler with setReminder() sending to 1:1 chat. 4-8 hrs if scheduler exists."
  - label: "Power Automate + Planner"
    description: "Create Planner tasks with due date notifications. 8-12 hrs."
  - label: "{escape hatch}"
```

Note: For Teams → Slack, use `reminders.add` directly — native API.

### Y10 — Channel Archive
```
question: "Your bot archives channels ({file}:{line}). How should the target platform simulate channel archival?"
header: "Y10 Archive"
options:
  - label: "Rename + description (Recommended)"
    description: "Prefix with [ARCHIVED], update description. Cosmetic but non-destructive. 4-8 hrs."
  - label: "Rename + remove members"
    description: "Stronger enforcement but destructive — members must be re-invited to undo. 8-12 hrs."
  - label: "Team-level archive"
    description: "Archive entire Team. Only works if channel is in a dedicated Team. 2-4 hrs."
  - label: "{escape hatch}"
```

Note: For Teams → Slack, use `conversations.archive` directly — native API.

### Y11 — Channel Member Removal
```
question: "Your bot removes channel members ({file}:{line}). How should the target platform handle member removal?"
header: "Y11 Members"
options:
  - label: "Two-step Graph API (Recommended)"
    description: "List members to resolve membership-id, then delete. Simple and direct. 4-6 hrs."
  - label: "Build removeChannelMember() helper"
    description: "Wrapper that resolves membership ID internally. Cleaner API. 4-8 hrs."
  - label: "{escape hatch}"
```

Note: For Teams → Slack, use `conversations.kick` directly — native API.

### Y12 — Workflow Builder
```
question: "Your bot uses Workflow Builder ({file}:{line}). How should the target platform handle workflow automation?"
header: "Y12 Workflows"
options:
  - label: "Bot-driven orchestration (Recommended)"
    description: "Keep logic in the bot. No license dependency, full control. 16-40 hrs."
  - label: "Power Automate rebuild"
    description: "Rebuild in Power Automate. Custom steps need Premium license. 24-80 hrs."
  - label: "Hybrid approach"
    description: "Simple flows → Power Automate, complex → bot-driven. Two systems. Varies."
  - label: "{escape hatch}"
```

### Y13 — Global Shortcuts
```
question: "Your bot uses global shortcuts ({file}:{line}). How should the target platform expose quick actions?"
header: "Y13 Shortcuts"
options:
  - label: "Compose extension (Recommended)"
    description: "composeExtensions with commandBox context. Always opens task module. 8-12 hrs."
  - label: "Minimal-dismiss pattern"
    description: "Task module returns tiny 'Done' card for fire-and-forget actions. 4-8 hrs."
  - label: "Bot command replacement"
    description: "Replace shortcut with typed command. Simpler but less discoverable. 2-4 hrs."
  - label: "{escape hatch}"
```

Note: For Teams → Slack, map compose extensions to `app.shortcut` with a global shortcut callback.

### Y14 — Message Shortcuts
```
question: "Your bot uses message shortcuts ({file}:{line}). How should the target platform expose message actions?"
header: "Y14 MsgAction"
options:
  - label: "Action-based message extension (Recommended)"
    description: "composeExtensions with message context. Direct mapping. 4-8 hrs."
  - label: "{escape hatch}"
```

Note: For Teams → Slack, map action-based message extensions to `app.shortcut` with `message_shortcut` type.

### Y15 — Dynamic Selects
```
question: "Your bot uses dynamic select menus ({file}:{line}). How should the target platform handle server-filtered dropdowns?"
header: "Y15 Selects"
options:
  - label: "Pre-populated ChoiceSet (Recommended)"
    description: "Load all options at dialog open, client-side filtering. Works up to ~500 items. 2-4 hrs."
  - label: "Two-step dialog"
    description: "Step 1: text search. Step 2: filtered results as ChoiceSet. Works for any size. 8-12 hrs."
  - label: "Custom searchable task module"
    description: "Embed a web view with search-as-you-type UI. Full control. 16-24 hrs."
  - label: "{escape hatch}"
```

Note: For Teams → Slack, use `block_suggestion` with `external_data_source` for native dynamic selects.

### Y16 — App Home
```
question: "Your bot uses App Home ({file}:{line}). How should the target platform present the bot's home experience?"
header: "Y16 AppHome"
options:
  - label: "tab.fetch handler (Recommended)"
    description: "Personal tab fires on every open. Closest to AppHomeOpenedEvent. 4-8 hrs."
  - label: "install.add welcome only"
    description: "Send welcome message once on install. Simple but fires only once. 1-2 hrs."
  - label: "Static tab (web content)"
    description: "Full web page embedded as personal tab. Richer but needs hosting. 8-16 hrs."
  - label: "{escape hatch}"
```

Note: For Teams → Slack, map `tab.fetch` to `app_home_opened` event with `views.publish`.

### Y17 — View Hash
```
question: "Your bot uses view_hash for race conditions ({file}:{line}). How should the target platform protect against stale updates?"
header: "Y17 ViewHash"
options:
  - label: "Manual _version field (Recommended)"
    description: "Inject version counter into Action.Submit.data, reject stale. 2-4 hrs."
  - label: "Card versioning middleware"
    description: "SDK plugin auto-injecting and checking versions. 4-8 hrs."
  - label: "{escape hatch}"
```

Note: For Teams → Slack, use the native `view_hash` parameter in `views.update` — built-in.

### Y18 — All Channel Messages
```
question: "Your bot receives all channel messages without @mention ({file}:{line}). How should the target platform enable this?"
header: "Y18 RSC"
options:
  - label: "RSC permission (Recommended)"
    description: "Add ChannelMessage.Read.Group to manifest. Config-only, no code change. 1-2 hrs."
  - label: "Require @mention"
    description: "Change UX to require @mention. Simplifies permissions. 0 hrs."
  - label: "{escape hatch}"
```

Note: For Teams → Slack, Slack receives all channel messages by default when the bot is in the channel. No special config needed.

### Y19 — Socket Mode
```
question: "Your bot uses Socket Mode ({file}:{line}). The target platform requires inbound HTTPS. How do you want to handle transport?"
header: "Y19 Transport"
options:
  - label: "Deploy to Azure (Recommended)"
    description: "Host in Azure for production. Use Dev Tunnels for local dev. 4-8 hrs."
  - label: "Azure Relay"
    description: "Hybrid connection for strict on-premises firewalls. Adds latency. 8-16 hrs."
  - label: "{escape hatch}"
```

Note: For Teams → Slack, Slack supports Socket Mode for firewall-friendly deployments — a simpler story.

### Y20 — Built-in Retry
```
question: "Your bot uses Bolt's retryConfig ({file}:{line}). How should the target platform handle retry and resilience?"
header: "Y20 Retry"
options:
  - label: "Build RetryPlugin (Recommended)"
    description: "Drop-in plugin with exponential backoff, jitter, circuit breaker. Bad retry causes cascading failures. 12-16 hrs."
  - label: "Manual retry wrapper"
    description: "Hand-roll backoff around outbound calls. Simpler but easy to get wrong. 4-8 hrs."
  - label: "{escape hatch}"
```

### Y21 — Confirmation Dialogs
```
question: "Your bot uses confirmation dialogs on buttons ({file}:{line}). How should the target platform confirm destructive actions?"
header: "Y21 Confirm"
options:
  - label: "Action.ShowCard inline (Recommended)"
    description: "Inline expand with Yes/No buttons. Native Adaptive Card pattern. 2-4 hrs."
  - label: "Task module confirm"
    description: "Small dialog for confirmation. More prominent. 4-6 hrs."
  - label: "Build confirmAction() helper"
    description: "Template function generating confirm cards. Reusable. 4-8 hrs."
  - label: "{escape hatch}"
```

Note: For Teams → Slack, use the native `confirm` object on button elements — built-in.

### Y22 — App Directory
```
question: "Your bot is listed in an app directory. How should it be distributed on the target platform?"
header: "Y22 Distrib"
options:
  - label: "Org app catalog (Recommended)"
    description: "Publish to organization catalog. Requires Teams admin approval. 2-4 hrs."
  - label: "Admin sideload"
    description: "Upload directly via Teams Admin Center. Quick but no catalog listing. 1-2 hrs."
  - label: "Partner Center (public)"
    description: "Submit to Teams App Store. 1-2 week review. Requires Partner Network account. 8-16 hrs."
  - label: "{escape hatch}"
```

Note: For Teams → Slack, submit to the Slack App Directory via api.slack.com.

### Y23 — Unfurl Domain Wildcards
```
question: "Your bot uses wildcard domain matching for link unfurling ({file}:{line}). How should the target platform list domains?"
header: "Y23 Wildcards"
options:
  - label: "Manual enumeration (Recommended)"
    description: "List every subdomain in manifest. Fine for <10 subdomains. 1-2 hrs."
  - label: "Manifest generator script"
    description: "Script reads subdomains from config and generates manifest array. 4-8 hrs."
  - label: "{escape hatch}"
```

### Y24 — Multi-Step Modal Stacking
```
question: "Your bot uses views.push for modal stacking ({file}:{line}). How should the target platform handle multi-step forms?"
header: "Y24 Stacking"
options:
  - label: "Flatten into single dialog (Recommended)"
    description: "Single dialog with step routing in submit handler. Manageable for 2-3 steps. 8-16 hrs."
  - label: "Build StepDialog helper"
    description: "Reusable class managing step state, back/forward. Worth it if 3+ wizard flows. 16-24 hrs."
  - label: "Separate sequential dialogs"
    description: "Close current, open next. No back navigation. Degraded UX. 4-8 hrs."
  - label: "{escape hatch}"
```

Note: For Teams → Slack, use native `views.push` for stacking — up to 3 levels supported.

### R1 — True Ephemeral Messages
```
question: "Your bot relies on true ephemeral messages — a Teams platform gap. Teams has no visibility:'user' flag. How do you want to handle this?"
header: "R1 Ephemeral"
options:
  - label: "Accept & Redesign (Recommended)"
    description: "refresh.userIds for cards, 1:1 chat for text. Different but functional."
  - label: "Defer"
    description: "Drop ephemeral behavior entirely. Show messages to everyone."
  - label: "{escape hatch}"
```

Note: For Teams → Slack, this is a non-issue — Slack has native ephemeral support.

### R2 — Custom Emoji Reactions
```
question: "Your bot uses emoji reactions as workflow signals — Teams only has 6 fixed reactions. How do you want to handle this?"
header: "R2 Reactions"
options:
  - label: "Accept & Redesign (Recommended)"
    description: "Replace reaction workflows with Action.Submit card buttons. Better for audit trails."
  - label: "Map to 6 fixed reactions"
    description: "Map your most important reactions to like/heart/laugh/surprised/sad/angry. Lossy."
  - label: "{escape hatch}"
```

Note: For Teams → Slack, Slack supports unlimited custom emoji reactions — direct mapping.

### R3 — viewClosed / Cancel Notification
```
question: "Your bot uses viewClosed callbacks — Teams sends no notification on dialog dismiss. How do you want to handle this?"
header: "R3 Cancel"
options:
  - label: "Build Custom (Recommended)"
    description: "Timeout-based cleanup (5-min TTL) + explicit Cancel button inside the dialog."
  - label: "Defer"
    description: "Drop cancel cleanup entirely. Accept potential stale locks."
  - label: "{escape hatch}"
```

Note: For Teams → Slack, use `notify_on_close: true` in `views.open` — native support.

### R4 — Mid-Form Dynamic Updates
```
question: "Your bot uses blockAction inside modals for dynamic form updates — a Teams platform gap. How do you want to handle this?"
header: "R4 Dynamic"
options:
  - label: "Accept & Redesign (Recommended)"
    description: "Multi-step dialogs for dependent fields. Action.ToggleVisibility for simple show/hide."
  - label: "Build custom web-based task module"
    description: "Embed a full web form in the task module for complete control. Much more effort."
  - label: "{escape hatch}"
```

Note: For Teams → Slack, use `block_actions` inside modals with `views.update` — native support.

### R5 — Server-Side Field Validation
```
question: "Your bot uses ackWithErrors for inline field validation — a Teams platform gap. How do you want to handle this?"
header: "R5 Validate"
options:
  - label: "Build Custom (Recommended)"
    description: "Re-open dialog with pre-populated data + error messages in field labels."
  - label: "Client-side only"
    description: "Use isRequired/regex/maxLength. Covers simple cases only."
  - label: "{escape hatch}"
```

Note: For Teams → Slack, use `response_action: errors` in `view_submission` handler — native support.

### R6 — Dialog Stacking
```
question: "Your bot uses views.push for dialog stacking — a Teams platform gap. How do you want to handle this?"
header: "R6 Stacking"
options:
  - label: "Accept & Redesign (Recommended)"
    description: "Single dialog with step routing. Same approach as Y24. Simulate Back with a button."
  - label: "Build custom web-based task module"
    description: "Embed a web app with real navigation in the task module. Full control. High effort."
  - label: "{escape hatch}"
```

Note: For Teams → Slack, use native `views.push` — up to 3 levels.

### R7 — Scheduled Message API
```
question: "Your bot depends on chat.scheduleMessage — a Teams platform gap. Teams has no server-side scheduling. How do you want to handle this?"
header: "R7 ScheduleAPI"
options:
  - label: "Build Custom (Recommended)"
    description: "Self-managed scheduler from Y8 (Cosmos DB + Functions timer). Works, just boilerplate."
  - label: "Defer"
    description: "Drop scheduling entirely. Users trigger messages manually."
  - label: "{escape hatch}"
```

Note: For Teams → Slack, use native `chat.scheduleMessage` — direct mapping.

### R8 — Channel Archive
```
question: "Your bot archives individual channels — Teams can only archive entire Teams. How do you want to handle this?"
header: "R8 Archive"
options:
  - label: "Accept & Redesign (Recommended)"
    description: "Rename with [ARCHIVED] prefix. Good enough for 90% of cases."
  - label: "Rename + remove all members"
    description: "Stronger enforcement but destructive. Hard to undo."
  - label: "{escape hatch}"
```

Note: For Teams → Slack, use native `conversations.archive` — direct mapping.

### R9 — Retroactive Link Unfurling
```
question: "Your bot benefits from retroactive link unfurling — Teams only unfurls links in new messages. How do you want to handle this?"
header: "R9 Retroactive"
options:
  - label: "Defer (Recommended)"
    description: "No workaround exists. Don't waste time. New messages unfurl fine."
  - label: "Build manual preview command"
    description: "Bot command where users paste a URL to get a preview card. Niche."
  - label: "{escape hatch}"
```

### R10 — Firewall-Friendly Transport
```
question: "Your bot relies on Socket Mode for firewall-friendly transport — Teams requires inbound HTTPS. How do you want to handle this?"
header: "R10 Firewall"
options:
  - label: "Accept & Redesign (Recommended)"
    description: "Deploy to Azure (it's 2026). Dev Tunnels for local dev."
  - label: "Azure Relay"
    description: "Hybrid connection for strict on-premises requirements. Adds latency."
  - label: "{escape hatch}"
```

Note: For Teams → Slack, Slack's Socket Mode provides firewall-friendly transport natively.

## defaults table

When the developer picks "You Decide Everything" or "You Decide Everything Else", apply these defaults for all remaining decisions:

| Feature | Default Option | Strategy |
|---|---|---|
| Y1 | A | `refresh.userIds` (Slack→Teams) / `chat.postEphemeral` (Teams→Slack) |
| Y2 | A | Two API calls (Slack→Teams) / `reply_broadcast` (Teams→Slack) |
| Y3 | A | Graph API direct (Slack→Teams) / `conversations.replies` (Teams→Slack) |
| Y4/5/6 | B | `sendFile()` helper (Slack→Teams) / `files.uploadV2` (Teams→Slack) |
| Y7 | B | Cache-first with prefetch (Slack→Teams) / `link_shared` + `chat.unfurl` (Teams→Slack) |
| Y8 | A | Functions timer + Cosmos DB (Slack→Teams) / `chat.scheduleMessage` (Teams→Slack) |
| Y9 | A | Piggyback on Y8 scheduler (Slack→Teams) / `reminders.add` (Teams→Slack) |
| Y10 | A | Rename + description (Slack→Teams) / `conversations.archive` (Teams→Slack) |
| Y11 | A | Two-step Graph API (Slack→Teams) / `conversations.kick` (Teams→Slack) |
| Y12 | B | Bot-driven orchestration |
| Y13 | A | Compose extension (Slack→Teams) / `app.shortcut` (Teams→Slack) |
| Y14 | A | Action-based message extension (Slack→Teams) / `message_shortcut` (Teams→Slack) |
| Y15 | A | Pre-populated ChoiceSet (Slack→Teams) / `block_suggestion` (Teams→Slack) |
| Y16 | B | `tab.fetch` handler (Slack→Teams) / `views.publish` (Teams→Slack) |
| Y17 | A | Manual `_version` field (Slack→Teams) / `view_hash` (Teams→Slack) |
| Y18 | A | RSC permission (Slack→Teams) / Default in Slack (Teams→Slack) |
| Y19 | B | Deploy to Azure (Slack→Teams) / Socket Mode (Teams→Slack) |
| Y20 | B | `RetryPlugin` (Slack→Teams) / Bolt `retryConfig` (Teams→Slack) |
| Y21 | A | `Action.ShowCard` inline (Slack→Teams) / `confirm` object (Teams→Slack) |
| Y22 | B | Org app catalog (Slack→Teams) / Slack App Directory (Teams→Slack) |
| Y23 | A | Manual enumeration (Slack→Teams) / Wildcard support (Teams→Slack) |
| Y24 | A | Flatten into single dialog (Slack→Teams) / `views.push` (Teams→Slack) |
| R1 | — | Accept & Redesign (Slack→Teams) / Native (Teams→Slack) |
| R2 | — | Accept & Redesign (Slack→Teams) / Native (Teams→Slack) |
| R3 | — | Build Custom (Slack→Teams) / `notify_on_close` (Teams→Slack) |
| R4 | — | Accept & Redesign (Slack→Teams) / `block_actions` + `views.update` (Teams→Slack) |
| R5 | — | Build Custom (Slack→Teams) / `response_action: errors` (Teams→Slack) |
| R6 | — | Accept & Redesign (Slack→Teams) / `views.push` (Teams→Slack) |
| R7 | — | Build Custom (Slack→Teams) / `chat.scheduleMessage` (Teams→Slack) |
| R8 | — | Accept & Redesign (Slack→Teams) / `conversations.archive` (Teams→Slack) |
| R9 | — | Defer |
| R10 | — | Accept & Redesign (Slack→Teams) / Socket Mode (Teams→Slack) |

## instructions

Pair with:
- `MigrationDecisionMatrix.md` — source of truth for all decision options, effort estimates, and profile definitions
- All 22 bridge experts in `.experts/bridge/` — referenced in the Phase 3 output for implementation details
- `SlackToTeamsMigrationAnalysis.md` — cross-reference for feature status (G/Y/R)

Do a web search for:
- "Microsoft Teams Bot Framework SDK TypeScript latest changes 2026"
- "Slack Bolt SDK TypeScript latest changes 2026"

## research

Deep Research prompt:

"Write an interactive cross-platform bridging advisor for Slack↔Teams bot development. Cover codebase analysis (detecting both Slack and Teams API patterns), direction detection (which platform exists, which to add), bot profile classification (A-D by complexity), and per-feature decision walkthrough for 24 YELLOW and 10 RED platform gaps — with bidirectional defaults for each direction. Include question templates with effort estimates and a defaults table for one-click acceptance."
