# Advanced Features

## Scheduled Messages

| Aspect | Slack | Teams |
|---|---|---|
| Native API | `chat.scheduleMessage()` | **No equivalent** |
| Cancel scheduled | `chat.deleteScheduledMessage()` | N/A |
| Reminders | `reminders.add()` | **No equivalent** |

**Rating:** RED (Slack → Teams), GREEN (Teams → Slack).

### Mitigation Strategies (Slack → Teams)

| Strategy | How | Effort |
|---|---|---|
| **Azure Functions timer + Cosmos DB (Recommended)** | Store scheduled message in Cosmos DB. Azure Functions timer trigger polls and sends via proactive messaging. | 16–24 hrs |
| **Azure Queue visibility timeout** | Set visibility timeout to delay message processing. 7-day maximum. | 8–12 hrs |
| **Azure Service Bus scheduled messages** | Best for high-volume exact-time delivery. | 12–16 hrs |
| **Power Automate** | Offload to Power Automate flows with "Delay until" action. Requires license. | 8–12 hrs |
| **In-process timer (dev only)** | `setTimeout` / `node-cron`. Not durable — lost on restart. | 2–4 hrs |

### Reverse Direction (Teams → Slack)

Use `chat.scheduleMessage()` and `reminders.add()` directly — native APIs.

---

## Emoji Reactions

| Aspect | Slack | Teams |
|---|---|---|
| Event | `reaction_added` / `reaction_removed` | `messageReaction` |
| Reaction types | Unlimited custom emoji | **6 fixed reactions only**: like, heart, laugh, surprised, sad, angry |
| Workflow use | Common to use reactions as workflow signals (e.g., `:white_check_mark:` = approved) | Not viable — too few options |

**Rating:** RED (Slack → Teams) if reactions are used as workflow signals.

### Mitigation (Slack → Teams)

| Strategy | How | Effort |
|---|---|---|
| **Adaptive Card buttons (Recommended)** | Replace reaction-based workflows with `Action.Submit` buttons on cards (e.g., "Approve" / "Reject"). Better for audit trails. | 4–8 hrs |
| **Map to 6 fixed reactions** | Map your most important reactions to like/heart/laugh/surprised/sad/angry. Lossy — only works if you use ≤6 reactions. | 2–4 hrs |

### Reverse Direction (Teams → Slack)

Slack supports unlimited custom emoji reactions — direct mapping.

---

## Shortcuts / Message Extensions

| Aspect | Slack | Teams |
|---|---|---|
| Global shortcut | `app.shortcut("callback_id")` | Compose extension with `context: ["compose", "commandBox"]` |
| Message shortcut | `app.shortcut("callback_id")` (type: `message_shortcut`) | Action extension with `context: ["message"]` |
| Fire-and-forget | Supported (ack + background work) | **Not supported** — must open task module |
| Manifest config | Shortcut in app settings | `composeExtensions[].commands[]` |
| Message context | `shortcut.message` | `activity.value.messagePayload` |

**Rating:** YELLOW — functional equivalents exist but UX differs.

### Key Difference

Slack shortcuts can run background actions without showing UI (ack + do work). Teams compose/action extensions always open a task module — there's no fire-and-forget pattern. Use a "minimal dismiss" pattern: return a tiny "Done" card that auto-closes.

### Mitigation (Slack → Teams)

| Strategy | How | Effort |
|---|---|---|
| **Compose extension (Recommended)** | `composeExtensions` with `commandBox` context. Opens task module. | 8–12 hrs |
| **Minimal-dismiss pattern** | Task module returns tiny "Done" card for fire-and-forget actions. | 4–8 hrs |
| **Bot command replacement** | Replace shortcut with typed command. Simpler but less discoverable. | 2–4 hrs |

---

## Channel Operations

| Aspect | Slack | Teams |
|---|---|---|
| Create channel | `conversations.create()` | Graph `POST /teams/{team-id}/channels` |
| Archive channel | `conversations.archive()` | **No equivalent** — Teams can only archive entire Teams |
| Set topic | `conversations.setTopic()` | Graph `PATCH /channels/{id}` with `description` |
| Invite member | `conversations.invite()` | Graph `POST /channels/{id}/members` (one call per member) |
| Remove member | `conversations.kick()` | Graph `DELETE /channels/{id}/members/{membership-id}` (must resolve membership ID first) |
| Channel namespace | Flat (channel ID is globally unique) | Team-scoped (need `team-id` + `channel-id`) |
| Channel name limits | 80 chars, most characters allowed | 50 chars, no special characters |

**Rating:** GREEN for create/topic/invite, YELLOW for remove (membership ID resolution), RED for archive.

### Archive Mitigation (Slack → Teams)

| Strategy | How | Effort |
|---|---|---|
| **Rename with [ARCHIVED] prefix (Recommended)** | Rename channel, update description. Cosmetic but non-destructive. | 4–8 hrs |
| **Rename + remove all members** | Stronger enforcement but destructive — members must be re-invited to undo. | 8–12 hrs |
| **Team-level archive** | Archive entire Team. Only works if channel is in a dedicated Team. | 2–4 hrs |

---

## Workflows / Automation

| Aspect | Slack | Teams |
|---|---|---|
| Platform | Workflow Builder (free) | Power Automate (licensed for premium connectors) |
| Bot integration | `workflow_step_execute` event | Custom connectors or bot-driven orchestration |
| Triggers | Channel message, emoji reaction, scheduled, webhook | Same + Approvals connector, Planner, SharePoint |
| Migration tool | N/A | **None** — manual rebuild required |

**Rating:** YELLOW — functional equivalent exists but different platform, possible licensing.

### Mitigation Strategies

| Strategy | How | Effort |
|---|---|---|
| **Bot-driven orchestration (Recommended)** | Keep workflow logic in the bot. State machine + Adaptive Card buttons + persistent storage. No license dependency. | 16–40 hrs |
| **Power Automate rebuild** | Rebuild in Power Automate. Custom steps need Premium license. | 24–80 hrs |
| **Hybrid** | Simple flows → Power Automate, complex → bot-driven. | Varies |
| **Teams Workflows app** | Simplified UI for basic automations (free). Limited to simple scenarios. | 4–8 hrs |

---

## App Distribution

| Aspect | Slack | Teams |
|---|---|---|
| Directory listing | Slack App Directory (api.slack.com) | Teams App Store via Partner Center |
| Review time | Hours to days | 1–2 weeks |
| Org-level install | Workspace admin approval | Teams Admin Center tenant-wide deployment |
| Dev install | Direct install via OAuth URL | Sideloading (ZIP with manifest + icons) |
| Required assets | App icon | 192x192 full-color icon + 32x32 monochrome outline |
| Multi-tenant | Per-workspace tokens via `InstallationStore` | `signInAudience: "AzureADMultipleOrgs"` in Azure AD |

**Rating:** YELLOW — both have distribution mechanisms but packaging and review differ.

### Sideloading (Dev/Test)

Teams sideloading requires:
1. `manifest.json` (schema v1.19+)
2. `color.png` (192x192)
3. `outline.png` (32x32 monochrome)
4. ZIP all three files
5. Upload via Teams client → Apps → Manage your apps → Upload
6. Note: Sideloading may be disabled by admin — check tenant settings

### Reverse Direction (Teams → Slack)

Submit to Slack App Directory via api.slack.com. Implement `InstallProvider` for OAuth install flow. Shorter review cycle.
