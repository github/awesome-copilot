# workflow.triggers-compose-ts

## purpose

Unify workflow initiation at the Teams compose surface — message-driven, scheduled, and state-driven triggers all accessible from the compose box, message extensions, and bot commands.

## rules

1. **The compose box is the primary trigger surface.** Users should initiate workflows by typing commands, using message extension search, or submitting compose actions. Never require users to leave the channel to start a workflow.
2. **Use bot commands for direct workflow initiation.** Register keyword patterns (e.g., `/pto`, `/book`, `/standup`) via `app.message()` regex handlers. Commands capture inline parameters and immediately launch the workflow. This is the simplest trigger type.
3. **Use message extension action commands for form-based initiation.** Action commands open a task module (dialog) from the compose area or message context menu. The form collects structured input, and the submit handler creates the workflow record. Declare in manifest under `composeExtensions[].commands` with `type: "action"`. [learn.microsoft.com -- Action commands](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/action-commands/define-action-command)
4. **Use message extension search commands for record lookup.** Search commands let users type queries in the compose box extension and see matching records. Results insert as cards into the conversation. Use for "show customer ABC" or "lookup ticket 4821" patterns. [learn.microsoft.com -- Search commands](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/search-commands/define-search-command)
5. **Use `Action.Execute` on existing cards to trigger follow-on workflows.** A record card's action buttons can initiate new workflow steps (escalate, reassign, clone). This chains workflows together from the message surface without additional commands.
6. **Use proactive messaging for scheduled triggers.** Timer-based workflows (daily standup, weekly status) use `setInterval` or a job scheduler (node-cron, Azure Functions timer trigger) to send proactive messages at cadence. Store conversation references at bot install time. [learn.microsoft.com -- Proactive messaging](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages)
7. **Use Graph change notifications for state-driven triggers.** Subscribe to presence changes, Shifts events, or list updates via Graph webhooks. When a notification fires, the bot sends a proactive message to the relevant channel. See `workflow.state-driven-events-ts.md` for details.
8. **Manifest declares all trigger surfaces.** Bot commands go in `bots[].commandLists`. Message extension commands go in `composeExtensions[].commands`. Ensure the manifest declares every trigger the workflow uses. [learn.microsoft.com -- Manifest](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema)
9. **Provide command suggestions in the compose box.** Teams shows command suggestions when users type in the compose box if `bots[].commandLists` is populated. List the most common workflow triggers with descriptions so users can discover them without documentation.
10. **Combine trigger types for the same workflow.** A single workflow (e.g., standup) can be initiated by scheduled message (automatic), bot command (manual), or message extension action (ad-hoc). All paths should create the same record type and render the same card.

## patterns

### Bot command trigger with inline parameters

```typescript
// "/pto 2024-03-15 to 2024-03-20" triggers PTO workflow
app.message(/^\/pto\s+(.+)/i, async (ctx) => {
  const params = ctx.activity.text!.match(
    /\/pto\s+(\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})/i
  );

  if (!params) {
    await ctx.send("Usage: /pto YYYY-MM-DD to YYYY-MM-DD");
    return;
  }

  const record = await createPtoRecord({
    requester: ctx.activity.from!,
    startDate: params[1],
    endDate: params[2],
    conversationId: ctx.activity.conversation!.id,
  });

  await ctx.send({
    attachments: [{
      contentType: "application/vnd.microsoft.card.adaptive",
      content: buildPtoCard(record),
    }],
  });
});
```

### Message extension action command (form-based trigger)

```typescript
// Manifest: composeExtensions[].commands[] = { commandId: "createPto", type: "action", ... }

app.on("message.ext.submit", async (ctx) => {
  const { commandId } = ctx.activity.value ?? {};

  if (commandId === "createPto") {
    const { startDate, endDate, reason } = ctx.activity.value?.data ?? {};

    const record = await createPtoRecord({
      requester: ctx.activity.from!,
      startDate,
      endDate,
      reason,
      conversationId: ctx.activity.conversation!.id,
    });

    // Return card to insert into compose
    return {
      composeExtension: {
        type: "result",
        attachmentLayout: "list",
        attachments: [{
          contentType: "application/vnd.microsoft.card.adaptive",
          content: buildPtoCard(record),
          preview: {
            contentType: "application/vnd.microsoft.card.thumbnail",
            content: { title: `PTO: ${startDate} - ${endDate}` },
          },
        }],
      },
    };
  }
});
```

### Message extension search command (record lookup)

```typescript
app.on("message.ext.query", async (ctx) => {
  const { commandId } = ctx.activity.value ?? {};
  const query = ctx.activity.value?.queryOptions?.searchText ?? "";

  if (commandId === "lookupRecord") {
    const records = await searchWorkflowRecords(query);

    return {
      composeExtension: {
        type: "result",
        attachmentLayout: "list",
        attachments: records.map((r) => ({
          contentType: "application/vnd.microsoft.card.adaptive",
          content: buildRecordCard(r),
          preview: {
            contentType: "application/vnd.microsoft.card.thumbnail",
            content: {
              title: r.title,
              text: `${r.status} - ${r.requesterName}`,
            },
          },
        })),
      },
    };
  }
});
```

### Scheduled proactive trigger

```typescript
import cron from "node-cron";

// Store conversation references at bot install
const conversationRefs = new Map<string, any>();

app.on("install.add", async (ctx) => {
  conversationRefs.set(
    ctx.activity.conversation!.id,
    {
      channelId: ctx.activity.channelId,
      conversation: ctx.activity.conversation,
      serviceUrl: ctx.activity.serviceUrl,
    }
  );
});

// Daily standup at 9 AM
cron.schedule("0 9 * * 1-5", async () => {
  for (const [, ref] of conversationRefs) {
    await adapter.continueConversation(ref, async (turnContext) => {
      await turnContext.sendActivity({
        attachments: [{
          contentType: "application/vnd.microsoft.card.adaptive",
          content: buildStandupPromptCard(),
        }],
      });
    });
  }
});
```

### Manifest command list for discoverability

```json
{
  "bots": [{
    "commandLists": [{
      "scopes": ["team"],
      "commands": [
        { "title": "/pto", "description": "Request time off: /pto YYYY-MM-DD to YYYY-MM-DD" },
        { "title": "/book", "description": "Reserve equipment: /book [item name]" },
        { "title": "/standup", "description": "Start a standup check-in" },
        { "title": "/status", "description": "Show pending workflow items" }
      ]
    }]
  }],
  "composeExtensions": [{
    "commands": [
      {
        "id": "createPto",
        "type": "action",
        "title": "New PTO Request",
        "description": "Submit a time-off request",
        "fetchTask": true,
        "context": ["compose"]
      },
      {
        "id": "lookupRecord",
        "type": "query",
        "title": "Find Record",
        "description": "Search workflow records",
        "initialRun": false,
        "parameters": [{ "name": "search", "title": "Search", "description": "Search by name, ID, or status" }]
      }
    ]
  }]
}
```

## pitfalls

- **Bot command lists max 10 commands.** The manifest allows up to 10 commands per scope per bot. Prioritize the most common workflow triggers. Use message extension search for long-tail lookups.
- **Message extension action `fetchTask: true` is required for forms.** Without `fetchTask: true`, Teams won't open a task module. The bot must handle the `composeExtension/fetchTask` invoke and return the form definition.
- **Scheduled triggers require persistent conversation references.** If the bot restarts, in-memory references are lost. Persist them to the backing store (SharePoint List, Cosmos DB) at install time.
- **Command suggestions only appear after `@mention`.** In channels, bot command suggestions show after the user `@mentions` the bot. In personal/group chats, they appear on `/` or when clicking the bot icon. Educate users on discovery.
- **Message extension search has a 10-result limit in the flyout.** The compose extension search UI shows at most 10 results. Implement server-side filtering to return the most relevant matches.

## references

- https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/action-commands/define-action-command
- https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/search-commands/define-search-command
- https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages
- https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema

## instructions

Use this expert when unifying workflow triggers at the compose surface. Covers bot commands, message extension actions (form-based initiation), message extension search (record lookup), scheduled proactive triggers, and manifest configuration for discoverability. Pair with `workflow.state-driven-events-ts.md` for presence/Shifts/call queue triggers, `workflow.message-native-records-ts.md` for the cards those triggers produce, and `runtime.manifest-ts.md` for manifest details.

## research

Deep Research prompt:

"Write a micro expert on unifying workflow triggers at the Microsoft Teams compose surface (TypeScript). Cover: bot command patterns with regex handlers, message extension action commands for form-based workflow initiation, message extension search commands for record lookup, scheduled proactive messaging with node-cron, manifest command list configuration, and combining multiple trigger types for the same workflow. Include patterns for PTO, equipment booking, and daily standup triggers."
