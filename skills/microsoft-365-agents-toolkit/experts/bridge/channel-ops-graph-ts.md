# channel-ops-graph-ts

## purpose

Bridges Slack channel operations (conversations.*) and Teams channel management via Microsoft Graph for cross-platform bots targeting Slack, Teams, or both.

## rules

1. **Slack `conversations.create` → Graph `POST /teams/{team-id}/channels`.** Slack creates channels in a flat workspace namespace. Teams channels always belong to a specific team — you must know the `team-id` first. The request body includes `displayName`, `description`, and `membershipType` (standard, private, shared). [learn.microsoft.com -- Create channel](https://learn.microsoft.com/en-us/graph/api/channel-post)
2. **Slack `conversations.archive` → no true archive in Teams.** Teams has no channel archive API. Workarounds: (a) delete the channel (destructive, 30-day soft delete), (b) rename the channel with a `[ARCHIVED]` prefix, (c) remove all members except owners, (d) for the entire team, use `POST /teams/{team-id}/archive`. Individual channel archival is not supported. [learn.microsoft.com -- Archive team](https://learn.microsoft.com/en-us/graph/api/team-archive)
3. **Slack `conversations.invite` → Graph `POST /teams/{team-id}/channels/{channel-id}/members`.** The request body must include the user's Azure AD Object ID (`@odata.type: '#microsoft.graph.aadUserConversationMember'`) and a `roles` array (`['owner']` or `[]` for member). Private channel membership is managed separately from standard channels. [learn.microsoft.com -- Add channel member](https://learn.microsoft.com/en-us/graph/api/channel-post-members)
4. **Slack `conversations.kick` → Graph `DELETE /teams/{team-id}/channels/{channel-id}/members/{membership-id}`.** You must first resolve the `membership-id` by listing channel members (`GET /teams/{team-id}/channels/{channel-id}/members`) and finding the member by their Azure AD Object ID. You cannot delete by user ID directly. [learn.microsoft.com -- Remove member](https://learn.microsoft.com/en-us/graph/api/channel-delete-members)
5. **Slack `conversations.setTopic` → Graph `PATCH /teams/{team-id}/channels/{channel-id}` with `description`.** Slack channels have a separate `topic` field. Teams channels use the `description` field as the closest equivalent. The channel name is updated via the `displayName` field. [learn.microsoft.com -- Update channel](https://learn.microsoft.com/en-us/graph/api/channel-patch)
6. **All channel operations require a `team-id`.** Slack has a flat channel namespace (every channel has a globally-unique `C-ID`). Teams channels are nested under teams. Most operations need both `team-id` and `channel-id`. Resolve team IDs via `GET /me/joinedTeams` or `GET /groups` with Teams filter. [learn.microsoft.com -- List joined teams](https://learn.microsoft.com/en-us/graph/api/user-list-joinedteams)
7. **Channel name restrictions differ from Slack.** Teams channel names cannot contain: `~ # % & * { } / \ : < > ? + | ' "`. Maximum length is 50 characters (Slack allows 80). Channel names must be unique within a team. Validate and sanitize names during migration. [learn.microsoft.com -- Channel limits](https://learn.microsoft.com/en-us/microsoftteams/limits-specifications-teams)
8. **Graph API requires application or delegated permissions.** Channel operations need `Channel.Create`, `ChannelMember.ReadWrite.All`, `Channel.Delete.All` (application permissions) or equivalent delegated permissions. These require Azure AD admin consent. Slack's bot token scopes (`channels:manage`, `channels:write.invites`) have no direct Azure AD equivalent. [learn.microsoft.com -- Graph permissions](https://learn.microsoft.com/en-us/graph/permissions-reference)
9. **Slack `conversations.list` → Graph `GET /teams/{team-id}/channels`.** List all channels in a team. For listing channels across teams, iterate over `GET /me/joinedTeams` first, then list channels per team. There is no single API to list all channels across all teams (unlike Slack's flat listing). [learn.microsoft.com -- List channels](https://learn.microsoft.com/en-us/graph/api/channel-list)
10. **Private channels have separate membership management.** Slack private channels (`is_private: true`) map to Teams private channels (`membershipType: 'private'`). Private channel members are managed via the channel members API, not the team membership. Adding a user to the team does NOT add them to private channels — you must add them to both. [learn.microsoft.com -- Private channels](https://learn.microsoft.com/en-us/microsoftteams/private-channels)
11. **Reverse direction (Teams → Slack):** For Teams → Slack, map Graph API channel operations to Slack's `conversations.*` API methods. `POST /teams/{team-id}/channels` maps to `conversations.create`. `POST /channels/{id}/members` maps to `conversations.invite`. `DELETE /channels/{id}/members/{id}` maps to `conversations.kick`. `PATCH /channels/{id}` with `description` maps to `conversations.setTopic`. Note that Slack has a flat channel namespace (no team-id required) and supports true channel archiving via `conversations.archive`.

## patterns

### Create channel + invite members

**Slack (before):**

```typescript
import { App } from "@slack/bolt";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

app.command("/create-channel", async ({ ack, command, client }) => {
  await ack();
  const [name, ...memberIds] = command.text.split(" ");

  // Create channel in flat namespace
  const channel = await client.conversations.create({
    name: name.toLowerCase().replace(/\s+/g, "-"),
    is_private: false,
  });

  // Invite members by Slack user ID
  if (memberIds.length > 0) {
    await client.conversations.invite({
      channel: channel.channel!.id!,
      users: memberIds.join(","), // comma-separated U-IDs
    });
  }

  await client.chat.postMessage({
    channel: command.channel_id,
    text: `Channel <#${channel.channel!.id}> created!`,
  });
});
```

**Teams (after):**

```typescript
import { App } from "@microsoft/teams.apps";
import { ConsoleLogger } from "@microsoft/teams.common";
import { Client } from "@microsoft/microsoft-graph-client";

const app = new App({
  logger: new ConsoleLogger("my-bot", { level: "info" }),
});

// Initialize Graph client (use app-only auth in production)
function getGraphClient(token: string): Client {
  return Client.init({
    authProvider: (done) => done(null, token),
  });
}

app.message(/^\/?create-channel (.+)$/i, async ({ send, activity }) => {
  const args = activity.text?.replace(/^\/?create-channel\s+/i, "").split(" ") ?? [];
  const [rawName, ...memberAadIds] = args;

  // Sanitize channel name for Teams restrictions
  const channelName = rawName
    .replace(/[~#%&*{}\/\\:<>?+|'"]/g, "")
    .substring(0, 50);

  // Teams channels require a team-id (no flat namespace)
  const teamId = activity.channelData?.team?.id;
  if (!teamId) {
    await send("This command must be run in a team context.");
    return;
  }

  const graphToken = await getAppOnlyToken();
  const graph = getGraphClient(graphToken);

  // Create channel under the team
  const channel = await graph.api(`/teams/${teamId}/channels`).post({
    displayName: channelName,
    description: `Created by bot on ${new Date().toISOString()}`,
    membershipType: "standard",
  });

  // Invite members by Azure AD Object ID (not Slack U-ID)
  for (const aadId of memberAadIds) {
    await graph.api(`/teams/${teamId}/channels/${channel.id}/members`).post({
      "@odata.type": "#microsoft.graph.aadUserConversationMember",
      "user@odata.bind": `https://graph.microsoft.com/v1.0/users('${aadId}')`,
      roles: [], // empty = member, ['owner'] = owner
    });
  }

  await send(`Channel **${channelName}** created with ${memberAadIds.length} members.`);
});

async function getAppOnlyToken(): Promise<string> {
  // Use @azure/identity ConfidentialClientApplication for production
  return "...";
}

app.start(3978);
```

### Set topic + archive channel

**Slack (before):**

```typescript
import { App } from "@slack/bolt";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

app.command("/set-topic", async ({ ack, command, client }) => {
  await ack();
  await client.conversations.setTopic({
    channel: command.channel_id,
    topic: command.text,
  });
  await client.chat.postMessage({
    channel: command.channel_id,
    text: `Topic updated to: ${command.text}`,
  });
});

app.command("/archive-channel", async ({ ack, command, client }) => {
  await ack();
  await client.conversations.archive({
    channel: command.channel_id,
  });
  // Channel is now archived — no more messages can be posted
});
```

**Teams (after):**

```typescript
import { App } from "@microsoft/teams.apps";
import { ConsoleLogger } from "@microsoft/teams.common";
import { Client } from "@microsoft/microsoft-graph-client";

const app = new App({
  logger: new ConsoleLogger("my-bot", { level: "info" }),
});

function getGraphClient(token: string): Client {
  return Client.init({ authProvider: (done) => done(null, token) });
}

// Set channel description (closest to Slack topic)
app.message(/^\/?set-topic (.+)$/i, async ({ send, activity }) => {
  const topic = activity.text?.replace(/^\/?set-topic\s+/i, "") ?? "";
  const teamId = activity.channelData?.team?.id;
  const channelId = activity.channelData?.channel?.id;

  if (!teamId || !channelId) {
    await send("This command must be run in a team channel.");
    return;
  }

  const graph = getGraphClient(await getAppOnlyToken());
  await graph.api(`/teams/${teamId}/channels/${channelId}`).patch({
    description: topic,
  });

  await send(`Channel description updated to: ${topic}`);
});

// Archive channel — no direct equivalent, rename with prefix
app.message(/^\/?archive-channel$/i, async ({ send, activity }) => {
  const teamId = activity.channelData?.team?.id;
  const channelId = activity.channelData?.channel?.id;

  if (!teamId || !channelId) {
    await send("This command must be run in a team channel.");
    return;
  }

  const graph = getGraphClient(await getAppOnlyToken());

  // Get current channel name
  const channel = await graph.api(`/teams/${teamId}/channels/${channelId}`).get();

  // Rename with archive prefix (best available workaround)
  await graph.api(`/teams/${teamId}/channels/${channelId}`).patch({
    displayName: `[ARCHIVED] ${channel.displayName}`.substring(0, 50),
    description: `Archived on ${new Date().toISOString()}. ${channel.description ?? ""}`,
  });

  await send("Channel marked as archived. Note: Teams does not support true channel archival.");
});

async function getAppOnlyToken(): Promise<string> {
  return "...";
}

app.start(3978);
```

### Channel operation mapping table

| Slack API | Graph API Equivalent | Notes |
|---|---|---|
| `conversations.create({ name })` | `POST /teams/{team-id}/channels` | Must specify team-id |
| `conversations.archive({ channel })` | *(no equivalent)* | Rename with prefix, or delete |
| `conversations.unarchive({ channel })` | *(no equivalent)* | Rename back |
| `conversations.invite({ channel, users })` | `POST /teams/{team-id}/channels/{id}/members` | One member per call; needs AAD Object ID |
| `conversations.kick({ channel, user })` | `DELETE /channels/{id}/members/{membership-id}` | Must resolve membership-id first |
| `conversations.setTopic({ channel, topic })` | `PATCH /channels/{id}` with `description` | Topic → description |
| `conversations.rename({ channel, name })` | `PATCH /channels/{id}` with `displayName` | 50 char limit |
| `conversations.list()` | `GET /teams/{team-id}/channels` | Per-team, not workspace-wide |
| `conversations.info({ channel })` | `GET /teams/{team-id}/channels/{id}` | Needs team-id |
| `conversations.members({ channel })` | `GET /teams/{team-id}/channels/{id}/members` | Returns AAD user objects |

## pitfalls

- **No flat channel namespace**: Slack's `C-ID` identifies a channel globally. Teams requires both `team-id` and `channel-id` for most operations. Bots must resolve or store the team context from `activity.channelData.team.id`.
- **Channel name validation**: Teams rejects names with special characters that Slack allows. Always sanitize channel names before creating. The `#` character — commonly used in Slack — is not allowed in Teams channel names.
- **Membership ID resolution for kicks**: You cannot remove a member by Azure AD Object ID alone. First list members, find the matching `conversationMember.id`, then delete by that membership ID. This is a two-API-call operation.
- **No true channel archive**: Slack's archive makes a channel read-only while preserving it. Teams has no equivalent. The rename-with-prefix workaround doesn't prevent new messages. True read-only requires deleting the channel (which has a 30-day recovery window).
- **Private channel membership is separate**: Adding a user to a team does NOT automatically add them to private channels. You must explicitly add them to each private channel. This differs from Slack where inviting to a private channel only requires the channel invite API.
- **Graph API rate limits**: Graph API has its own throttling (separate from Bot Framework). Bulk channel operations (creating many channels, inviting many users) should include retry logic with exponential backoff on HTTP 429 responses.
- **Admin consent required**: Application-level Graph permissions (`Channel.Create`, `ChannelMember.ReadWrite.All`) require Azure AD admin consent. This is a deployment-time concern — the bot code may work in dev but fail in production if admin consent hasn't been granted.

## references

- https://learn.microsoft.com/en-us/graph/api/channel-post
- https://learn.microsoft.com/en-us/graph/api/channel-post-members
- https://learn.microsoft.com/en-us/graph/api/channel-delete-members
- https://learn.microsoft.com/en-us/graph/api/channel-patch
- https://learn.microsoft.com/en-us/graph/api/team-archive
- https://learn.microsoft.com/en-us/graph/api/channel-list
- https://learn.microsoft.com/en-us/microsoftteams/limits-specifications-teams
- https://github.com/microsoft/teams.ts
- https://api.slack.com/methods/conversations.create — Slack conversations API

## instructions

Use this expert when adding cross-platform support in either direction for channel management operations. It covers: Slack `conversations.*` bridged to Graph API channel endpoints, `conversations.archive` workarounds in Teams, `conversations.invite` bridged to Graph member addition, `conversations.kick` with membership ID resolution, `conversations.setTopic` bridged to channel description update, team-id requirement, channel name restrictions, Graph API permission requirements, and reverse mapping from Graph channel operations back to Slack `conversations.*` methods. Pair with `../teams/graph.usergraph-appgraph-ts.md` for Graph API authentication, `identity-oauth-bridge-ts.md` for user ID mapping (Slack U-ID to AAD Object ID), and `rate-limiting-resilience-ts.md` for Graph API throttling patterns.

## research

Deep Research prompt:

"Write a micro expert for bridging Slack channel management operations (conversations.create, conversations.archive, conversations.invite, conversations.kick, conversations.setTopic, conversations.list) and Microsoft Teams channel management via the Graph API in either direction. Cover: team-id requirement, channel name restrictions, private channel membership, the lack of channel archive API in Teams, membership ID resolution for removal, Graph API permissions, rate limiting, and reverse mapping from Graph operations back to Slack conversations.* methods. Include TypeScript code examples and a mapping table."
