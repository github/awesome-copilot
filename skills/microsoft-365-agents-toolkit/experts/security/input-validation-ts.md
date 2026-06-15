# input-validation-ts

## purpose

Validating user input from messages, Adaptive Card submissions, and task module forms in Teams bots to prevent injection, data corruption, and unexpected behavior.

## rules

1. Always validate `activity.value` server-side after Adaptive Card `Action.Submit` and `Action.Execute`. The JSON payload can be tampered with by clients -- never trust that field names, types, or values match the card definition. Use a schema validator like zod before processing. [learn.microsoft.com -- Cards actions](https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/cards/cards-actions)
2. Define zod schemas for every card action and dialog submission payload. Parse with `schema.safeParse(activity.value)` and handle validation failures with a user-friendly error message. Never use `schema.parse()` in handlers -- uncaught `ZodError` exceptions will crash the handler. [github.com/colinhacks/zod](https://github.com/colinhacks/zod)
3. Validate `activity.text` from user messages before using it in database queries, API calls, or AI prompts. Apply content length limits (Teams messages can be up to 28 KB), strip or escape control characters, and reject messages that exceed expected bounds. [learn.microsoft.com -- Message size limits](https://learn.microsoft.com/en-us/microsoftteams/limits-specifications-teams)
4. Use Adaptive Card input element validation properties (`isRequired`, `regex`, `errorMessage`) as a first layer of client-side validation. These provide immediate feedback to users but are NOT a security boundary -- the server must re-validate all inputs because clients can bypass card-level validation. [adaptivecards.io -- Input.Text](https://adaptivecards.io/explorer/Input.Text.html)
5. Be aware that `Input.ChoiceSet` values are always strings in `activity.value`, even when they appear numeric. A choice with `"value": "42"` arrives as the string `"42"`, not the number `42`. Always use explicit type coercion (`parseInt()`, `Number()`) or zod transforms (`z.coerce.number()`) when numeric values are expected. [adaptivecards.io -- Input.ChoiceSet](https://adaptivecards.io/explorer/Input.ChoiceSet.html)
6. Sanitize user input before rendering it in Adaptive Card `TextBlock` elements to prevent XSS-like injection. While Teams sanitizes most HTML, markdown rendering in cards can be abused with crafted links or misleading formatting. Strip or escape markdown syntax (`[]()`, `**`, `#`) in user-provided text displayed in cards. [learn.microsoft.com -- Format cards](https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/cards/cards-format)
7. When using AI function calling, validate that user-influenced parameters passed to tool functions do not enable command injection or unauthorized data access. If the LLM generates a function call with parameters derived from user input, validate those parameters against an allowlist or schema before execution. [OWASP -- Injection](https://owasp.org/www-community/Injection_Flaws)
8. Implement content length limits for all text inputs. Set `maxLength` on `Input.Text` elements in cards (client-side enforcement), and enforce the same limit server-side. Reject payloads larger than expected to prevent denial-of-service from oversized submissions. [adaptivecards.io -- Input.Text](https://adaptivecards.io/explorer/Input.Text.html)
9. Validate the `verb` or routing identifier in `activity.value.data` before dispatching card actions. An attacker could submit a crafted payload with an unexpected verb to reach unintended handlers. Verify that the verb matches a known set of registered actions. [github.com/microsoft/teams-ai](https://github.com/microsoft/teams-ai)
10. Log validation failures for security monitoring but never log the raw invalid input if it may contain PII or malicious payloads. Log the validation error type and field name, not the value. Use structured logging with Application Insights custom events for audit trails. [learn.microsoft.com -- Application Insights](https://learn.microsoft.com/en-us/azure/azure-monitor/app/api-custom-events-metrics)

## patterns

### Zod validation for Adaptive Card submissions

```typescript
import { z } from "zod";
import { App } from "@microsoft/teams.apps";

// Define schemas for each card action's expected payload
const feedbackSchema = z.object({
  verb: z.literal("submitFeedback"),
  userName: z.string().min(1).max(100),
  rating: z.coerce.number().int().min(1).max(5), // ChoiceSet values are strings!
  comments: z.string().max(2000).optional().default(""),
  followUp: z.enum(["true", "false"]), // Input.Toggle values are strings
});

const approvalSchema = z.object({
  verb: z.literal("approve"),
  requestId: z.string().uuid(),
  approverNote: z.string().max(500).optional().default(""),
});

// Type-safe handler with validation
const app = new App({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  tenantId: process.env.TENANT_ID,
});

app.on("card.action", async ({ activity, send }) => {
  const raw = activity.value?.action?.data;

  // Route by verb with validation
  if (raw?.verb === "submitFeedback") {
    const result = feedbackSchema.safeParse(raw);
    if (!result.success) {
      await send("Invalid submission. Please check your inputs and try again.");
      // Log error type, not the raw value
      console.error("Validation failed for submitFeedback:", result.error.issues.map(i => i.path.join(".")));
      return { status: 200, body: { statusCode: 200, type: "application/vnd.microsoft.activity.message", value: "Validation error." } };
    }
    const data = result.data;
    // Safe to use: data.userName, data.rating (number), data.comments, data.followUp
    await send(`Thanks ${data.userName}! Rating: ${data.rating}/5`);
    return { status: 200, body: { statusCode: 200, type: "application/vnd.microsoft.activity.message", value: "Feedback received!" } };
  }

  if (raw?.verb === "approve") {
    const result = approvalSchema.safeParse(raw);
    if (!result.success) {
      return { status: 200, body: { statusCode: 200, type: "application/vnd.microsoft.activity.message", value: "Invalid approval data." } };
    }
    // Process approval with validated data...
  }

  return { status: 200, body: { statusCode: 200, type: "application/vnd.microsoft.activity.message", value: "Unknown action." } };
});
```

### Message text validation and sanitization

```typescript
import { z } from "zod";
import { App } from "@microsoft/teams.apps";

// Schema for validating message text before processing
const messageSchema = z.object({
  text: z
    .string()
    .min(1, "Message cannot be empty")
    .max(4000, "Message too long")
    .transform((val) => val.trim()),
});

// Sanitize user text before embedding in Adaptive Card TextBlocks
function sanitizeForCard(text: string): string {
  return text
    .replace(/\[([^\]]*)\]\(([^)]*)\)/g, "$1") // Strip markdown links
    .replace(/[*_~`#]/g, "")                     // Strip markdown formatting
    .replace(/</g, "&lt;")                        // Escape HTML
    .replace(/>/g, "&gt;")
    .slice(0, 2000);                              // Enforce length limit
}

const app = new App({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  tenantId: process.env.TENANT_ID,
});

app.on("message", async ({ send, activity }) => {
  const result = messageSchema.safeParse({ text: activity.text });
  if (!result.success) {
    await send("I could not process your message. Please try a shorter message.");
    return;
  }

  const cleanText = result.data.text;

  // Safe to use in AI prompt
  // const aiResponse = await prompt.send(cleanText);

  // Safe to embed in a card
  const safeForCard = sanitizeForCard(cleanText);
  await send({
    type: "message",
    attachments: [{
      contentType: "application/vnd.microsoft.card.adaptive",
      content: {
        type: "AdaptiveCard",
        version: "1.5",
        body: [{ type: "TextBlock", text: `You said: ${safeForCard}`, wrap: true }],
      },
    }],
  });
});
```

### AI function parameter validation

```typescript
import { z } from "zod";
import { ChatPrompt } from "@microsoft/teams.ai";
import { OpenAIChatModel } from "@microsoft/teams.openai";

const model = new OpenAIChatModel({
  apiKey: process.env.OPENAI_API_KEY!,
  model: "gpt-4o",
});

// Allowlist of valid database table names the LLM can query
const ALLOWED_TABLES = ["tickets", "users", "projects"] as const;

const querySchema = z.object({
  table: z.enum(ALLOWED_TABLES),
  filter: z.string().max(200).regex(/^[a-zA-Z0-9\s=<>'"%_.-]+$/), // No SQL injection characters
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

const prompt = new ChatPrompt({
  model,
  instructions: "You help users query project data. Use the queryData function.",
}).function(
  "queryData",
  "Query a database table with filters",
  {
    type: "object",
    properties: {
      table: { type: "string", description: "Table name: tickets, users, or projects" },
      filter: { type: "string", description: "Filter expression" },
      limit: { type: "number", description: "Max rows to return (1-100)" },
    },
    required: ["table", "filter"],
  },
  async (params: { table: string; filter: string; limit?: number }) => {
    // Validate LLM-generated parameters before executing
    const result = querySchema.safeParse(params);
    if (!result.success) {
      return { error: "Invalid query parameters. Please try a different query." };
    }
    const { table, filter, limit } = result.data;
    // Now safe to use in a database query
    // return await db.query(table, filter, limit);
    return { table, filter, limit, results: [] };
  },
);
```

## pitfalls

- **Trusting client-side card validation**: Adaptive Card `isRequired`, `regex`, and `errorMessage` properties are enforced by the Teams client UI only. An attacker sending crafted HTTP requests to `/api/messages` can bypass all client-side validation. Always re-validate server-side.
- **ChoiceSet type coercion surprises**: All `Input.ChoiceSet` values arrive as strings. Comparing `activity.value.rating === 5` will always be `false` because the value is `"5"`. Use `z.coerce.number()` or explicit `parseInt()` to convert.
- **Input.Toggle boolean mismatch**: `Input.Toggle` sends `"true"` or `"false"` as strings (matching `valueOn`/`valueOff`), not actual booleans. Use `z.enum(["true", "false"]).transform(v => v === "true")` to convert to boolean.
- **Missing verb in action data**: If an `Action.Submit` has no `data` object or no `verb` key, the handler cannot route the action. An attacker could also submit a payload with a `verb` that matches a different handler. Validate verb presence and value.
- **Logging PII in validation errors**: Logging the full `activity.value` on validation failure may expose user PII (names, emails, free-text input). Log only the schema path and error type, not the submitted values.
- **Oversized payloads causing OOM**: Without content length limits, a malicious client could submit extremely large text values. While Teams has message size limits (~28 KB), card action payloads should still be validated for reasonable sizes.
- **Markdown injection in card display**: User-provided text rendered in `TextBlock` with `"markdown": true` (the default in some contexts) can include formatted links that disguise phishing URLs. Sanitize or disable markdown for user-supplied content.
- **AI function calling with unsanitized parameters**: The LLM may pass user-influenced strings directly to function parameters. If a function executes shell commands, SQL queries, or API calls, validate parameters against strict schemas and allowlists.

## references

- [Zod documentation](https://zod.dev/)
- [Teams: Cards and card actions](https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/cards/cards-actions)
- [Adaptive Cards Input.Text](https://adaptivecards.io/explorer/Input.Text.html)
- [Adaptive Cards Input.ChoiceSet](https://adaptivecards.io/explorer/Input.ChoiceSet.html)
- [Teams: Format cards in Teams](https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/cards/cards-format)
- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [Teams message size limits](https://learn.microsoft.com/en-us/microsoftteams/limits-specifications-teams)
- [Teams AI Library GitHub](https://github.com/microsoft/teams-ai)

## instructions

This expert covers input validation for Microsoft Teams bots built with the Teams AI SDK v2 in TypeScript. Use it when you need to:

- Validate `activity.value` from Adaptive Card `Action.Submit` and `Action.Execute` submissions
- Define zod schemas for card action payloads and dialog form data
- Sanitize `activity.text` from user messages before processing, storage, or AI prompts
- Handle type coercion for `Input.ChoiceSet` (always strings), `Input.Toggle` (string booleans), and `Input.Number`
- Prevent injection attacks in card rendering (markdown/XSS) and AI function calling (command injection)
- Implement server-side validation that mirrors and enforces card-level `isRequired` and `regex` constraints
- Set content length limits and validate payload sizes

Pair with `../teams/ui.adaptive-cards-ts.md` for understanding card action payloads that need validation, and `../teams/ai.function-calling-implementation-ts.md` for AI function parameter validation.

## research

Deep Research prompt:

"Write a micro expert on input validation for Teams bots (TypeScript). Cover validating activity.value from card actions and dialog submissions using zod, handling type coercion for ChoiceSet (string values), sanitizing activity.text for injection prevention, validating AI function calling parameters, server-side enforcement beyond client card validation (isRequired, regex), content length limits, and secure error logging without PII exposure. Include zod schema patterns and sanitization utility examples."
