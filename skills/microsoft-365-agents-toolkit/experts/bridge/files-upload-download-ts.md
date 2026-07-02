# files-upload-download-ts

## purpose

Bridges Slack file operations (files.upload, file events) and Teams file consent / OneDrive/SharePoint patterns for cross-platform bots targeting Slack, Teams, or both.

## rules

1. **Slack `files.upload` → Teams FileConsentCard + Graph API upload.** Slack bots upload files directly via `files.upload`. Teams bots cannot directly attach files to messages. Instead: (a) send a FileConsentCard asking the user for upload consent, (b) on consent, upload the file to the user's OneDrive via Graph API, (c) send a file info card with the download link. [learn.microsoft.com -- Send files](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/bots-filesv4)
2. **The `supportsFiles: true` manifest flag is required.** Without `"supportsFiles": true` in the bot's manifest entry, Teams will not show file consent cards or allow the bot to handle file-related activities. This flag only works in personal (1:1) scope. [learn.microsoft.com -- Bot manifest](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema#bots)
3. **Slack `files.sharedPublicURL` → Graph API `createLink` sharing link.** Slack creates a public URL for a file. In Teams/OneDrive, use the Graph API `POST /drives/{drive-id}/items/{item-id}/createLink` to create a sharing link with the desired permission scope (view, edit, anonymous). [learn.microsoft.com -- Create sharing link](https://learn.microsoft.com/en-us/graph/api/driveitem-createlink)
4. **Slack file events (`file_shared`, `file_created`) → `activity.attachments` in message handler.** When a user sends a file to a Teams bot, the file appears as an attachment on the incoming message activity. Check `activity.attachments` for items with `contentType` of `application/vnd.microsoft.teams.file.download.info`. [learn.microsoft.com -- Receive files](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/bots-filesv4#receive-files-in-personal-chat)
5. **Download user-uploaded files via the `downloadUrl` in the attachment.** Each file attachment includes a `content.downloadUrl` with a pre-authenticated URL. Use `fetch()` or `axios` to download the file content. The URL is short-lived — download immediately in the handler. [learn.microsoft.com -- File download](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/bots-filesv4)
6. **File upload in channels requires SharePoint, not OneDrive.** In personal chat, files go to the user's OneDrive. In channels, files go to the team's SharePoint document library. The Graph API path changes: `POST /drives/{drive-id}/root:/{folder}/{filename}:/content` where the drive is the channel's SharePoint drive. [learn.microsoft.com -- SharePoint files](https://learn.microsoft.com/en-us/graph/api/driveitem-put-content)
7. **Large files (>4 MB) require Graph resumable upload sessions.** Small files can use simple PUT to Graph API. Files larger than 4 MB must use a resumable upload session: `POST /drives/{drive-id}/items/{parent-id}:/filename:/createUploadSession`, then upload in 320 KB–60 MB chunks. Slack's `files.upload` handled this transparently. [learn.microsoft.com -- Resumable upload](https://learn.microsoft.com/en-us/graph/api/driveitem-createuploadsession)
8. **FileConsentCard flow is a 3-step protocol.** Step 1: Bot sends a FileConsentCard with filename and size. Step 2: User accepts or declines. Step 3: On accept, Teams sends a `fileConsent/invoke` activity with an `uploadInfo` containing the upload URL. On decline, Teams sends the same invoke with a `declined` action. Handle both cases. [learn.microsoft.com -- File consent](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/bots-filesv4#send-files-to-personal-chat)
9. **Slack `files.list` / `files.info` → Graph API drive item queries.** Slack has dedicated file listing APIs. In Teams, files are stored in OneDrive/SharePoint. Use Graph API: `GET /drives/{drive-id}/root/children` to list files, `GET /drives/{drive-id}/items/{item-id}` for file metadata. [learn.microsoft.com -- List items](https://learn.microsoft.com/en-us/graph/api/driveitem-list-children)
10. **File handling only works in personal (1:1) chat scope.** The `supportsFiles` manifest flag and FileConsentCard only work in personal bot conversations. For channel file operations, use Graph API directly without the consent card flow. This is a significant scope limitation compared to Slack where `files.upload` works in any channel. [learn.microsoft.com -- Bot files](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/bots-filesv4)
11. **Reverse direction (Teams → Slack):** For Teams → Slack, the reverse is simpler: Slack's `files.uploadV2` is a direct single-call API vs Teams' multi-step consent flow. Map OneDrive/SharePoint file URLs to `files.uploadV2` with a buffer, Graph `createLink` sharing links to `files.sharedPublicURL`, and `activity.attachments` file downloads to Slack `file_shared` event handling. The Slack API handles storage transparently.

## patterns

### Upload a file with FileConsentCard (replaces files.upload)

**Slack (before):**

```typescript
import { App } from "@slack/bolt";
import fs from "fs";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

app.command("/export", async ({ ack, command, client }) => {
  await ack();
  const csvData = await generateReport();

  // Direct file upload — Slack handles storage
  await client.files.uploadV2({
    channel_id: command.channel_id,
    filename: "report.csv",
    file: Buffer.from(csvData),
    title: "Monthly Report",
    initial_comment: "Here's your report!",
  });
});
```

**Teams (after):**

```typescript
import { App } from "@microsoft/teams.apps";
import { ConsoleLogger } from "@microsoft/teams.common";

const app = new App({
  logger: new ConsoleLogger("my-bot", { level: "info" }),
});

// Store pending uploads keyed by conversation
const pendingUploads = new Map<string, Buffer>();

// Step 1: Send FileConsentCard (replaces files.upload)
app.message(/^\/?export$/i, async ({ send, activity }) => {
  const csvData = await generateReport();
  const csvBuffer = Buffer.from(csvData);
  const convId = activity.conversation?.id ?? "";

  // Store the file content for later upload
  pendingUploads.set(convId, csvBuffer);

  // Send consent card — user must approve the upload
  await send({
    attachments: [{
      contentType: "application/vnd.microsoft.teams.card.file.consent",
      name: "report.csv",
      content: {
        description: "Monthly Report — click Accept to save to your OneDrive",
        sizeInBytes: csvBuffer.length,
        acceptContext: { filename: "report.csv" },
        declineContext: { filename: "report.csv" },
      },
    }],
  });
});

// Step 2: Handle consent response
app.on("fileConsent" as any, async ({ activity, send }) => {
  const action = activity.value?.action;
  const convId = activity.conversation?.id ?? "";

  if (action === "accept") {
    // Step 3: Upload file to the URL provided by Teams
    const uploadInfo = activity.value?.uploadInfo;
    const fileContent = pendingUploads.get(convId);

    if (uploadInfo && fileContent) {
      // Upload to OneDrive via the pre-signed URL
      await fetch(uploadInfo.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/octet-stream" },
        body: fileContent,
      });

      // Send confirmation with file card
      await send({
        attachments: [{
          contentType: "application/vnd.microsoft.teams.card.file.info",
          name: "report.csv",
          contentUrl: uploadInfo.contentUrl,
          content: {
            uniqueId: uploadInfo.uniqueId,
            fileType: "csv",
          },
        }],
      });
    }
    pendingUploads.delete(convId);
  } else {
    await send("File upload cancelled.");
    pendingUploads.delete(convId);
  }
});

async function generateReport(): Promise<string> {
  return "Name,Status\nServer1,OK\nServer2,Down";
}

app.start(3978);
```

### Receive and process user-uploaded files

**Slack (before):**

```typescript
import { App } from "@slack/bolt";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

app.event("file_shared", async ({ event, client }) => {
  const fileInfo = await client.files.info({ file: event.file_id });
  const file = fileInfo.file!;

  // Download file content using the private URL + bot token
  const response = await fetch(file.url_private!, {
    headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` },
  });
  const content = await response.text();

  await client.chat.postMessage({
    channel: event.channel_id,
    text: `Received ${file.name} (${file.size} bytes). Processing...`,
  });

  // Process the file content...
});
```

**Teams (after):**

```typescript
import { App } from "@microsoft/teams.apps";
import { ConsoleLogger } from "@microsoft/teams.common";

const app = new App({
  logger: new ConsoleLogger("my-bot", { level: "info" }),
});

// Files arrive as attachments on regular message activities
app.on("message", async ({ activity, send }) => {
  const fileAttachments = activity.attachments?.filter(
    (a: any) => a.contentType === "application/vnd.microsoft.teams.file.download.info"
  );

  if (fileAttachments?.length) {
    for (const attachment of fileAttachments) {
      const downloadUrl = attachment.content?.downloadUrl;
      const fileName = attachment.name;

      if (downloadUrl) {
        // Download using the pre-authenticated URL (no token needed)
        const response = await fetch(downloadUrl);
        const content = await response.text();

        await send(`Received ${fileName} (${content.length} chars). Processing...`);
        // Process the file content...
      }
    }
  }
});

app.start(3978);
```

### Reusable `sendFile()` helper (Y4/5/6 best practice)

Build a unified helper that auto-detects personal vs. channel context and handles chunking. This eliminates the 30-line FileConsentCard footgun.

```typescript
import { Client } from "@microsoft/microsoft-graph-client";

interface SendFileOptions {
  filename: string;
  content: Buffer;
  description?: string;
}

async function sendFile(
  ctx: { send: (msg: any) => Promise<any>; activity: any },
  graphClient: Client,
  options: SendFileOptions
): Promise<void> {
  const { filename, content, description } = options;
  const conversationType = ctx.activity.conversation?.conversationType;

  if (conversationType === "personal") {
    // Personal chat → FileConsentCard flow
    await ctx.send({
      attachments: [{
        contentType: "application/vnd.microsoft.teams.card.file.consent",
        name: filename,
        content: {
          description: description ?? filename,
          sizeInBytes: content.length,
          acceptContext: { filename, size: content.length },
          declineContext: { filename },
        },
      }],
    });
    // Store content for the fileConsent handler to pick up
    pendingUploads.set(ctx.activity.conversation?.id ?? "", { content, filename });
  } else {
    // Channel → Direct Graph API upload to SharePoint
    const teamId = ctx.activity.channelData?.teamsTeamId;
    const channelId = ctx.activity.channelData?.teamsChannelId;
    const driveId = await getChannelDriveId(graphClient, teamId, channelId);

    if (content.length <= 4 * 1024 * 1024) {
      // Small file: simple PUT
      await graphClient
        .api(`/drives/${driveId}/root:/${filename}:/content`)
        .put(content);
    } else {
      // Large file (>4 MB): resumable upload session
      const session = await graphClient
        .api(`/drives/${driveId}/root:/${filename}:/createUploadSession`)
        .post({ item: { name: filename } });

      const chunkSize = 320 * 1024; // 320 KB chunks
      for (let offset = 0; offset < content.length; offset += chunkSize) {
        const chunk = content.subarray(offset, offset + chunkSize);
        const end = Math.min(offset + chunkSize, content.length);
        await fetch(session.uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Range": `bytes ${offset}-${end - 1}/${content.length}`,
            "Content-Type": "application/octet-stream",
          },
          body: chunk,
        });
      }
    }

    await ctx.send(`File uploaded: ${filename}`);
  }
}

async function getChannelDriveId(
  graphClient: Client, teamId: string, channelId: string
): Promise<string> {
  const response = await graphClient
    .api(`/teams/${teamId}/channels/${channelId}/filesFolder`)
    .get();
  return response.parentReference.driveId;
}
```

**Key decisions:**
- Personal chat → FileConsentCard flow (requires `supportsFiles: true` in manifest)
- Channel → Direct Graph API upload to SharePoint (no consent card)
- Files >4 MB → Graph resumable upload session with 320 KB chunks

**Don't:** Store pending file buffers in memory for long periods. Upload promptly or stream to a temporary blob.

**Reverse (Teams → Slack):** Use `files.uploadV2({ channel_id, file: buffer, filename })` — single call, no consent step.

### File operation mapping table

| Slack API | Teams Equivalent | Notes |
|---|---|---|
| `files.uploadV2(channel, file)` | FileConsentCard → Graph PUT | 3-step consent flow; personal chat only |
| `files.sharedPublicURL(file)` | Graph `createLink(type, scope)` | Creates OneDrive/SharePoint sharing link |
| `files.info(file_id)` | Graph `GET /drives/{id}/items/{id}` | File metadata from OneDrive/SharePoint |
| `files.list(channel)` | Graph `GET /drives/{id}/root/children` | List drive items |
| `file_shared` event | `activity.attachments` check in message handler | No dedicated event; check attachments on each message |
| `file.url_private` + bot token | `attachment.content.downloadUrl` | Pre-authenticated URL; no token needed |
| Large file upload | Graph resumable upload session | Required for files > 4 MB |

## pitfalls

- **Missing `supportsFiles: true` in manifest**: Without this flag, Teams will not render FileConsentCards and file-related invoke activities will never fire. This is the #1 cause of "file upload doesn't work" during migration.
- **FileConsentCard only works in personal (1:1) chat**: Channel bots cannot use the consent card flow. For channel file operations, upload directly via Graph API to the team's SharePoint document library — which requires different Graph API permissions and paths.
- **Download URLs are short-lived**: The `downloadUrl` in file attachments is pre-authenticated but expires. Download the file immediately in the message handler. Do not store the URL for later use.
- **Large file upload requires chunking**: Files over 4 MB cannot use simple PUT. You must create an upload session and send chunks. Slack's `files.upload` handled this transparently — Teams requires explicit chunking logic.
- **Graph API permissions required**: File operations via Graph API require `Files.ReadWrite` (delegated) or `Files.ReadWrite.All` (application) permissions. These must be configured in the Azure AD app registration and consented by an admin for application permissions.
- **No file preview in bot messages**: Slack generates inline previews for uploaded images and documents. Teams file info cards show a file icon and name but not an inline preview. For image files, consider embedding the image URL directly in an Adaptive Card `Image` element instead.

## references

- https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/bots-filesv4
- https://learn.microsoft.com/en-us/graph/api/driveitem-put-content
- https://learn.microsoft.com/en-us/graph/api/driveitem-createuploadsession
- https://learn.microsoft.com/en-us/graph/api/driveitem-createlink
- https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema#bots
- https://github.com/microsoft/teams.ts
- https://api.slack.com/methods/files.uploadV2 — Slack files.upload
- https://api.slack.com/methods/files.sharedPublicURL — Slack file sharing

## instructions

Use this expert when adding cross-platform support in either direction for Slack file operations or Teams file consent / OneDrive/SharePoint patterns. It covers: `files.upload` to FileConsentCard + Graph upload, `files.sharedPublicURL` to Graph sharing links, file event handling via activity attachments, large file resumable uploads, and the personal-chat-only limitation. For Teams → Slack, the reverse is simpler: Slack's `files.uploadV2` is a direct single-call API vs Teams' multi-step consent flow. Pair with `../teams/graph.usergraph-appgraph-ts.md` for Graph API authentication patterns, `../teams/runtime.manifest-ts.md` for the `supportsFiles` manifest flag, and `interactive-responses-ts.md` for the consent card invoke handling pattern.

## research

Deep Research prompt:

"Write a micro expert for bridging Slack file operations (files.upload, files.sharedPublicURL, file_shared event, file download) and Teams file consent / OneDrive/SharePoint patterns in either direction for cross-platform bots. Cover FileConsentCard 3-step flow, OneDrive/SharePoint Graph API uploads, resumable upload sessions for large files, receiving files via activity attachments, the supportsFiles manifest flag, personal-chat-only limitation, Graph API permission requirements, and reverse-direction notes for Teams → Slack (simpler single-call API). Include TypeScript code examples and a mapping table."
