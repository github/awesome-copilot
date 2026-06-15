# workflow.state-driven-events-ts

## purpose

Wire up state-driven workflow triggers from Teams-native operational signals — presence changes, Shifts events, and call queue changes — via Microsoft Graph subscriptions and change notifications.

## rules

1. **Use Graph change notifications (webhooks) for all state-driven triggers.** Subscribe to resource changes via `POST /subscriptions`. The bot receives HTTP POST callbacks when subscribed resources change. This is the foundation for presence, Shifts, and call queue triggers. [learn.microsoft.com -- Change notifications](https://learn.microsoft.com/en-us/graph/webhooks)
2. **Presence changes: subscribe to `/communications/presences/{userId}`.** Requires `Presence.Read.All` application permission. Notifications fire when a user's availability changes (Available, Away, Busy, DoNotDisturb, Offline). Use for break management and availability-based routing. [learn.microsoft.com -- Presence subscriptions](https://learn.microsoft.com/en-us/graph/api/subscription-post-subscriptions)
3. **Shifts events: subscribe to `/teams/{teamId}/schedule/shifts`.** Requires `Schedule.Read.All` or `Schedule.ReadWrite.All` application permission. Notifications fire when shifts are created, updated, or deleted. Use for schedule-based automation (shift start/end, coverage gaps). [learn.microsoft.com -- Shifts API](https://learn.microsoft.com/en-us/graph/api/resources/shift)
4. **Time-off requests: use `/teams/{teamId}/schedule/timeOffRequests`.** Subscribe to changes on time-off requests for automated approval workflows. Notifications include the request state (pending, approved, declined). [learn.microsoft.com -- TimeOff](https://learn.microsoft.com/en-us/graph/api/resources/timeoffrequest)
5. **Call queue membership: monitor via `/communications/callRecords`.** Direct call queue subscriptions are limited. Use call record notifications (`/communications/callRecords`) to detect when agents join/leave queues. Alternatively, poll `/communications/callQueues` at intervals. Requires `CallRecords.Read.All`. [learn.microsoft.com -- Call records](https://learn.microsoft.com/en-us/graph/api/resources/callrecords-api-overview)
6. **Validate webhook endpoints with the validation token handshake.** Graph sends a validation request with a `validationToken` query parameter on subscription creation. The endpoint must return the token as `text/plain` within 10 seconds. Without this, subscription creation fails. [learn.microsoft.com -- Webhook validation](https://learn.microsoft.com/en-us/graph/webhooks#notification-endpoint-validation)
7. **Decrypt rich notifications for presence data.** Presence subscriptions require `includeResourceData: true` and encryption. Provide `encryptionCertificate` (public key) and `encryptionCertificateId` in the subscription. Decrypt notification payloads with the corresponding private key. [learn.microsoft.com -- Rich notifications](https://learn.microsoft.com/en-us/graph/webhooks-with-resource-data)
8. **Renew subscriptions before expiry.** Maximum subscription lifetimes: presence = 60 minutes, Shifts = 4230 minutes (~3 days). Implement a renewal timer that calls `PATCH /subscriptions/{id}` with a new `expirationDateTime` before the current one expires.
9. **Bridge webhook notifications to proactive bot messages.** When a state change notification arrives, look up the relevant channel's conversation reference and send a proactive message. The notification handler is an HTTP endpoint; the proactive message uses the bot adapter.
10. **Implement escalation timers for time-bound workflows.** For break management: start a timer on presence change to "Away". If presence doesn't return to "Available" within the threshold (e.g., 15 min), send a reminder. At 20 min, escalate to manager. Use `setTimeout` or a durable task queue.
11. **Use the `clientState` field for subscription routing.** Set `clientState` to a unique identifier (e.g., `"presence-break-workflow"`) on each subscription. Verify it in incoming notifications to route to the correct workflow handler and reject spoofed callbacks.
12. **Handle notification batching.** Graph may batch multiple notifications into a single POST. The payload contains a `value` array of `changeNotification` objects. Process all entries, not just the first.

## patterns

### Subscribe to presence changes

```typescript
import { Client } from "@microsoft/microsoft-graph-client";
import { readFileSync } from "fs";

async function subscribeToPresence(
  graphClient: Client,
  userId: string,
  webhookUrl: string
) {
  const cert = readFileSync("./certs/public.pem", "utf-8")
    .replace(/-----BEGIN CERTIFICATE-----/, "")
    .replace(/-----END CERTIFICATE-----/, "")
    .replace(/\n/g, "");

  const subscription = await graphClient.api("/subscriptions").post({
    changeType: "updated",
    notificationUrl: webhookUrl,
    resource: `/communications/presences/${userId}`,
    expirationDateTime: new Date(Date.now() + 55 * 60 * 1000).toISOString(), // 55 min (max 60)
    clientState: "presence-break-workflow",
    includeResourceData: true,
    encryptionCertificate: cert,
    encryptionCertificateId: "break-workflow-cert-1",
  });

  return subscription.id;
}
```

### Webhook endpoint with validation and notification handling

```typescript
import express from "express";
import crypto from "crypto";
import { readFileSync } from "fs";

const router = express.Router();

router.post("/api/webhooks/graph", (req, res) => {
  // Validation handshake
  if (req.query.validationToken) {
    res.set("Content-Type", "text/plain");
    res.send(req.query.validationToken);
    return;
  }

  const notifications = req.body.value ?? [];

  // Acknowledge receipt quickly; Graph expects a 2xx within ~3 seconds
  res.sendStatus(202);

  // Process notifications asynchronously to avoid request timeouts
  setImmediate(() => {
    for (const notification of notifications) {
      if (notification.clientState !== "presence-break-workflow") {
        continue; // Ignore unknown subscriptions
      }

      // Decrypt resource data
      const decryptedData = decryptNotification(notification);
      handlePresenceChange(notification.resource, decryptedData);
    }
  });
});

function decryptNotification(notification: any): any {
  const symmetricKey = crypto.privateDecrypt(
    { key: readFileSync("./certs/private.pem"), padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
    Buffer.from(notification.encryptedContent.dataKey, "base64")
  );

  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    symmetricKey.subarray(0, 32),
    Buffer.alloc(16, 0) // IV
  );

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(notification.encryptedContent.data, "base64")),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString("utf-8"));
}
```

### Break management workflow (presence-driven)

```typescript
const breakTimers = new Map<string, NodeJS.Timeout>();
const REMINDER_MS = 15 * 60 * 1000;
const ESCALATION_MS = 20 * 60 * 1000;

async function handlePresenceChange(resource: string, data: any) {
  const userId = resource.split("/").pop()!;
  const availability = data.availability; // Available, Away, Busy, etc.

  if (availability === "Away") {
    // Start break tracking
    const reminderTimer = setTimeout(async () => {
      await sendProactiveMessage(userId, "channel", {
        text: `Reminder: ${data.displayName} has been on break for 15 minutes.`,
      });
    }, REMINDER_MS);

    const escalationTimer = setTimeout(async () => {
      await sendProactiveMessage(userId, "manager", {
        text: `Escalation: ${data.displayName} has exceeded 20-minute break limit.`,
      });
    }, ESCALATION_MS);

    breakTimers.set(`${userId}-reminder`, reminderTimer);
    breakTimers.set(`${userId}-escalation`, escalationTimer);

    // Remove from call queue
    await removeFromCallQueue(userId);

    // Log break start
    await createBreakRecord(userId, "started");
  }

  if (availability === "Available") {
    // Clear timers
    clearTimeout(breakTimers.get(`${userId}-reminder`));
    clearTimeout(breakTimers.get(`${userId}-escalation`));
    breakTimers.delete(`${userId}-reminder`);
    breakTimers.delete(`${userId}-escalation`);

    // Re-add to call queue
    await addToCallQueue(userId);

    // Log break end
    await updateBreakRecord(userId, "ended");
  }
}
```

### Subscribe to Shifts changes

```typescript
async function subscribeToShifts(
  graphClient: Client,
  teamId: string,
  webhookUrl: string
) {
  const subscription = await graphClient.api("/subscriptions").post({
    changeType: "created,updated,deleted",
    notificationUrl: webhookUrl,
    resource: `/teams/${teamId}/schedule/shifts`,
    expirationDateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // ~3 days
    clientState: "shifts-workflow",
  });

  return subscription.id;
}
```

### Subscription renewal timer

```typescript
async function renewSubscription(graphClient: Client, subscriptionId: string, lifetimeMs: number) {
  const renewBeforeMs = 5 * 60 * 1000; // 5 minutes before expiry

  setInterval(async () => {
    try {
      await graphClient.api(`/subscriptions/${subscriptionId}`).patch({
        expirationDateTime: new Date(Date.now() + lifetimeMs).toISOString(),
      });
    } catch (err: any) {
      if (err.statusCode === 404) {
        // Subscription lost — recreate
        console.error("Subscription expired, recreating...");
      }
    }
  }, lifetimeMs - renewBeforeMs);
}
```

## pitfalls

- **Presence subscriptions expire in 60 minutes max.** You must renew aggressively. A 55-minute renewal interval is recommended to account for clock drift and network latency.
- **Rich notifications require encryption setup upfront.** You cannot subscribe to presence with `includeResourceData: true` without providing encryption keys. Generate a self-signed certificate for development; use a proper cert in production.
- **Webhook must respond within 3 seconds.** Graph expects a 2xx response within 3 seconds. Do all processing asynchronously — immediately return 202, then process the notification. Blocking responses cause subscription deactivation after repeated timeouts.
- **Shifts API requires team-level scheduling enabled.** If Shifts is not enabled for the team, API calls return 404. Verify Shifts is provisioned before subscribing.
- **Call queue operations are limited.** There's no direct Graph subscription for call queue membership changes. The workaround is monitoring presence (agents go Busy when on calls) or call records. Direct queue add/remove requires Teams admin APIs or PowerShell.
- **In-memory timers don't survive restarts.** The break management timer pattern using `setTimeout` loses state on process restart. For production, use Azure Durable Functions timers, a Redis-backed job queue, or persist timer state to the backing store with a polling reconciliation loop.

## references

- https://learn.microsoft.com/en-us/graph/webhooks
- https://learn.microsoft.com/en-us/graph/webhooks-with-resource-data
- https://learn.microsoft.com/en-us/graph/api/subscription-post-subscriptions
- https://learn.microsoft.com/en-us/graph/api/resources/shift
- https://learn.microsoft.com/en-us/graph/api/resources/timeoffrequest
- https://learn.microsoft.com/en-us/graph/api/resources/callrecords-api-overview
- https://learn.microsoft.com/en-us/graph/api/resources/presence

## instructions

Use this expert when building workflows triggered by operational state changes: presence, Shifts, time-off, or call queues. Covers Graph change notification subscriptions, webhook validation, rich notification decryption, escalation timers, and call queue integration. Pair with `workflow.triggers-compose-ts.md` for the full trigger surface, `workflow.sharepoint-lists-ts.md` for persisting event records, and `runtime.proactive-messaging-ts.md` for sending state-change notifications to channels.

## research

Deep Research prompt:

"Write a micro expert on state-driven workflow triggers in Microsoft Teams using Graph change notifications (TypeScript). Cover: presence change subscriptions with rich notification decryption, Shifts API subscriptions, time-off request monitoring, call queue integration patterns, webhook endpoint validation, subscription renewal, escalation timers, and bridging notifications to proactive bot messages. Include a complete break management workflow example driven by presence changes."
