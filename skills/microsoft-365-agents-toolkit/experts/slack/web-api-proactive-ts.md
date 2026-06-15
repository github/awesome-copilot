# web-api-proactive-ts

## purpose

Slack Web API client usage and proactive messaging patterns in Bolt TypeScript apps — sending messages outside event handlers, user lookups, conversation management.

## rules

1. Access the Web API client via `client` in any listener context or via `app.client` for proactive messaging outside of handlers. The `client` in listeners is pre-configured with the correct token for the workspace; `app.client` uses the default token from the `App` constructor. [slack.dev/bolt-js/concepts/web-api](https://slack.dev/bolt-js/concepts/web-api)
2. Use `client.chat.postMessage({ channel, text })` to send messages to any channel or DM. The `channel` parameter accepts a channel ID, DM channel ID, or user ID (to open/reuse a DM). Always include `text` as a fallback even when using `blocks`. [api.slack.com/methods/chat.postMessage](https://api.slack.com/methods/chat.postMessage)
3. Use `client.chat.update({ channel, ts, text })` to edit an existing message. Both `channel` and `ts` (the message timestamp) are required to identify the message. Only messages posted by the bot can be updated. [api.slack.com/methods/chat.update](https://api.slack.com/methods/chat.update)
4. Use `client.chat.delete({ channel, ts })` to delete a bot-posted message. For user messages, use `chat.delete` with a user token that has `chat:write` scope. [api.slack.com/methods/chat.delete](https://api.slack.com/methods/chat.delete)
5. Post threaded replies by setting `thread_ts` to the parent message's `ts`. Set `reply_broadcast: true` to also post the reply to the channel as a "replied to a thread" message. [api.slack.com/methods/chat.postMessage](https://api.slack.com/methods/chat.postMessage)
6. Send ephemeral messages (visible only to one user) with `client.chat.postEphemeral({ channel, user, text })`. Ephemeral messages cannot be updated or deleted — they disappear when the user reloads. [api.slack.com/methods/chat.postEphemeral](https://api.slack.com/methods/chat.postEphemeral)
7. Schedule future messages with `client.chat.scheduleMessage({ channel, text, post_at })`. The `post_at` parameter is a Unix timestamp. Scheduled messages can be cancelled with `client.chat.deleteScheduledMessage()` before they post. [api.slack.com/methods/chat.scheduleMessage](https://api.slack.com/methods/chat.scheduleMessage)
8. Look up users with `client.users.info({ user })` or list workspace members with `client.users.list()`. For email-to-user mapping, use `client.users.lookupByEmail({ email })`. These require the `users:read` and `users:read.email` scopes respectively. [api.slack.com/methods/users.info](https://api.slack.com/methods/users.info)
9. Manage conversations with `client.conversations.list()`, `client.conversations.info({ channel })`, `client.conversations.members({ channel })`, and `client.conversations.history({ channel })`. Use cursor-based pagination for large result sets — check `response_metadata.next_cursor`. [api.slack.com/methods/conversations.list](https://api.slack.com/methods/conversations.list)
10. Upload files with `client.filesUploadV2({ channel_id, file, filename })`. The v2 method is required — the original `files.upload` is deprecated. For multiple files, pass an array to `file_uploads`. Requires `files:write` scope. [api.slack.com/methods/files.uploadV2](https://api.slack.com/methods/files.uploadV2)
11. For proactive messaging (no incoming event), store the target `channel` ID and bot `token` during installation or a prior interaction. Use `app.client` with an explicit `token` parameter since there is no listener context to infer the workspace. [slack.dev/bolt-js/concepts/web-api](https://slack.dev/bolt-js/concepts/web-api)
12. Handle rate limiting by catching errors with `code === 'slack_webapi_platform_error'` and checking for `retry_after` in the response headers. The `@slack/web-api` client has built-in retry logic with configurable `retryConfig`. [api.slack.com/docs/rate-limits](https://api.slack.com/docs/rate-limits)
13. Distinguish `say()`, `respond()`, and `client` for the right messaging pattern: `say()` posts to the event's channel (requires channel context); `respond()` uses the `response_url` (commands, actions, shortcuts — ephemeral by default, expires in 30 min); `client.chat.postMessage()` works anywhere with explicit channel and token. [slack.dev/bolt-js/concepts/commands](https://slack.dev/bolt-js/concepts/commands)

## patterns

### Proactive message from a cron job or external trigger

```typescript
import { App } from "@slack/bolt";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

// Send a daily standup reminder — no incoming Slack event needed
async function sendStandupReminder(channelId: string) {
  await app.client.chat.postMessage({
    token: process.env.SLACK_BOT_TOKEN!,
    channel: channelId,
    text: "Time for standup! What did you work on yesterday?",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: ":sunrise: *Daily Standup*\nPlease share your update in this thread.",
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Post Update" },
            action_id: "standup_post",
            style: "primary",
          },
        ],
      },
    ],
  });
}
```

### Update and delete messages

```typescript
import { App } from "@slack/bolt";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

app.action("approve_request", async ({ ack, body, client }) => {
  await ack();

  // Update the original message to reflect approval
  if (body.channel && body.message) {
    await client.chat.update({
      channel: body.channel.id,
      ts: body.message.ts,
      text: `Request approved by <@${body.user.id}>`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `:white_check_mark: *Approved* by <@${body.user.id}>`,
          },
        },
      ],
    });
  }
});

app.action("delete_message", async ({ ack, body, client }) => {
  await ack();

  if (body.channel && body.message) {
    await client.chat.delete({
      channel: body.channel.id,
      ts: body.message.ts,
    });
  }
});
```

### Threaded replies and ephemeral messages

```typescript
import { App } from "@slack/bolt";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

app.message("help", async ({ message, client }) => {
  // Reply in a thread
  await client.chat.postMessage({
    channel: message.channel,
    thread_ts: message.ts,
    text: "Here's what I can do...",
  });

  // Ephemeral hint visible only to the user
  if (message.subtype === undefined) {
    await client.chat.postEphemeral({
      channel: message.channel,
      user: message.user,
      text: "I replied with help in a thread above.",
    });
  }
});
```

### Cursor-based pagination for user list

```typescript
import { App } from "@slack/bolt";
import type { Member } from "@slack/web-api/dist/types/response/UsersListResponse";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

async function getAllMembers(): Promise<Member[]> {
  const members: Member[] = [];
  let cursor: string | undefined;

  do {
    const result = await app.client.users.list({
      token: process.env.SLACK_BOT_TOKEN!,
      limit: 200,
      cursor,
    });

    if (result.members) {
      members.push(...result.members);
    }
    cursor = result.response_metadata?.next_cursor || undefined;
  } while (cursor);

  return members;
}
```

## pitfalls

- **Using `app.client` without an explicit `token`**: Outside of listener contexts, `app.client` has no workspace-specific token. Always pass `token` explicitly for proactive messages in multi-workspace apps.
- **Sending `blocks` without `text` fallback**: Slack requires `text` as a fallback for notifications and accessibility. Messages with only `blocks` and no `text` show a blank notification on mobile.
- **Confusing channel ID with channel name**: All Web API methods require the **channel ID** (e.g., `C01234ABCDE`), not the channel name (e.g., `#general`). Use `conversations.list` to resolve names to IDs.
- **Deprecated `files.upload`**: The original `files.upload` method is deprecated. Use `client.filesUploadV2()` which handles the multi-step upload process automatically.
- **Ephemeral messages are fire-and-forget**: You cannot update or delete ephemeral messages. They vanish on reload. Do not use them for persistent information.
- **Pagination truncation**: Methods like `users.list`, `conversations.list`, and `conversations.history` return at most 100–200 results per call. Always paginate with `cursor` to avoid silently missing data.
- **Rate limits on bulk sends**: Sending messages to many channels in a loop can trigger Slack's rate limits (roughly 1 message per second per channel, 50+ messages per minute burst). Add delays or use `chat.scheduleMessage` to spread load.

## references

- https://api.slack.com/methods/chat.postMessage
- https://api.slack.com/methods/chat.update
- https://api.slack.com/methods/chat.delete
- https://api.slack.com/methods/chat.postEphemeral
- https://api.slack.com/methods/chat.scheduleMessage
- https://api.slack.com/methods/users.info
- https://api.slack.com/methods/users.lookupByEmail
- https://api.slack.com/methods/conversations.list
- https://api.slack.com/methods/files.uploadV2
- https://api.slack.com/docs/rate-limits
- https://slack.dev/bolt-js/concepts/web-api

## instructions

This expert covers Slack Web API client usage and proactive messaging in Bolt TypeScript. Use it when: sending messages outside of event handlers (cron jobs, webhooks, external triggers); updating or deleting existing messages; posting threaded replies or ephemeral messages; looking up users by ID or email; listing and paginating conversations or members; uploading files; scheduling messages for future delivery; or choosing between `say()`, `respond()`, and `client.chat.postMessage()`.

Pair with: `runtime.bolt-foundations-ts.md` for App setup and client initialization. `runtime.ack-rules-ts.md` when combining proactive messages with listener handlers. `ui.block-kit-ts.md` for constructing rich message payloads.

## research

Deep Research prompt:

"Write a micro expert on Slack Web API client usage and proactive messaging in Bolt TypeScript. Cover app.client vs listener context client, chat.postMessage/update/delete, threaded replies (thread_ts, reply_broadcast), ephemeral messages (chat.postEphemeral), scheduled messages (chat.scheduleMessage), user lookups (users.info, users.lookupByEmail, users.list with pagination), conversation management (conversations.list/info/members/history with cursor pagination), file uploads (filesUploadV2), proactive messaging patterns (cron jobs, external triggers, stored channel IDs), rate limiting and retry behavior, and the say() vs respond() vs client distinction. Source from @slack/bolt App.ts, @slack/web-api WebClient, and Slack API method docs."
