# ai.conversational-query-ts

## purpose

Enable natural language retrieval over structured workflow state — translating user questions like "Who is on break?" or "Show PTO for March" into list/datastore queries and rendering results as interactive message-backed cards.

## rules

1. **NL queries go through AI function calling, not regex parsing.** Define tool/function schemas that accept structured parameters (status filter, date range, person). The LLM translates the user's natural language into function calls with the right parameters. This handles the infinite variation of how users phrase queries.
2. **Define focused query functions, not a generic "search" function.** Create specific functions: `queryPtoRequests(status?, dateRange?, requester?)`, `queryBreakStatus(teamId?)`, `queryEquipmentBookings(item?, dateRange?)`. Specific schemas give the LLM better guidance than a single catch-all. [learn.microsoft.com -- Function calling](https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/function-calling)
3. **Map function parameters to OData `$filter` expressions.** Each function parameter translates to a filter clause: `status: "pending"` → `fields/Status eq 'Pending'`, `dateRange: { start, end }` → `fields/StartDate ge '2024-03-01' and fields/StartDate le '2024-03-31'`. Build filters programmatically from the AI's structured output.
4. **Return structured data to the LLM, not raw JSON.** Format query results as a readable table or summary before passing back to the model. The LLM then generates a natural language response that can include counts, trends, and highlights. Don't dump raw Graph API responses into the prompt.
5. **Render query results as Adaptive Cards, not plain text.** After the LLM generates a summary, also render the actual records as interactive cards. The text answer provides context; the cards provide actionable records. Users get both "You have 3 pending PTO requests" and the cards to act on them.
6. **Support aggregate queries with server-side computation.** For "average break duration" or "how many PTO days used this quarter," compute aggregates in the function implementation (sum, count, average over fetched records). Return the computed result to the LLM for natural language rendering.
7. **Use `$top` and `$skip` for pagination.** When queries may return many results, default to `$top=10`. If the user asks "show all," paginate and summarize: "Showing 10 of 47 results. Say 'show more' to see the next page." Track pagination state per conversation.
8. **Include a `queryWorkflowRecords` function for cross-workflow queries.** In addition to workflow-specific functions, provide a general function that queries across all workflow lists. The LLM uses this when the user asks something like "what's overdue?" without specifying a workflow type.
9. **Ground AI responses in actual data.** Always include the source record count and date range in the response. "Based on 12 PTO requests from March 1-31..." prevents hallucination about records that don't exist.
10. **Cache frequent queries for low-latency responses.** Queries like "who is on break right now?" are likely repeated frequently. Cache results for 30-60 seconds to avoid hitting Graph API limits on every message.

## patterns

### Define query functions for ChatPrompt

```typescript
import { ChatPrompt } from "@anthropic-ai/sdk"; // or teams-ai equivalent

const queryFunctions = [
  {
    name: "queryPtoRequests",
    description: "Query PTO/time-off requests. Use when the user asks about PTO, time off, vacation, leave, or days off.",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["Pending", "Approved", "Rejected", "All"],
          description: "Filter by request status. Default: All",
        },
        requester: {
          type: "string",
          description: "Filter by requester name (partial match). Omit for all requesters.",
        },
        month: {
          type: "string",
          description: "Filter by month, e.g. '2024-03' for March 2024. Omit for all dates.",
        },
      },
    },
  },
  {
    name: "queryBreakStatus",
    description: "Query who is currently on break or break history. Use when the user asks about breaks, availability, or who is away.",
    parameters: {
      type: "object",
      properties: {
        currentOnly: {
          type: "boolean",
          description: "True to show only active breaks. False for break history.",
        },
        dateRange: {
          type: "object",
          properties: {
            start: { type: "string", description: "ISO date" },
            end: { type: "string", description: "ISO date" },
          },
        },
      },
    },
  },
  {
    name: "queryEquipmentBookings",
    description: "Query equipment reservations and availability. Use when the user asks about bookings, reservations, equipment, or availability.",
    parameters: {
      type: "object",
      properties: {
        item: { type: "string", description: "Equipment name or type to filter" },
        status: { type: "string", enum: ["Active", "Returned", "Overdue", "All"] },
        dateRange: {
          type: "object",
          properties: {
            start: { type: "string" },
            end: { type: "string" },
          },
        },
      },
    },
  },
];
```

### Implement query function with OData filter building

```typescript
async function queryPtoRequests(
  graphClient: Client,
  siteId: string,
  listId: string,
  params: { status?: string; requester?: string; month?: string }
): Promise<{ records: any[]; summary: string }> {
  const filters: string[] = [];

  if (params.status && params.status !== "All") {
    filters.push(`fields/Status eq '${params.status}'`);
  }

  if (params.month) {
    const start = `${params.month}-01`;
    const endDate = new Date(
      parseInt(params.month.split("-")[0]),
      parseInt(params.month.split("-")[1]),
      0
    );
    const end = endDate.toISOString().split("T")[0];
    filters.push(`fields/StartDate ge '${start}' and fields/StartDate le '${end}'`);
  }

  let query = graphClient
    .api(`/sites/${siteId}/lists/${listId}/items`)
    .expand("fields")
    .top(20)
    .orderby("fields/StartDate desc");

  if (filters.length > 0) {
    query = query.filter(filters.join(" and "));
  }

  const response = await query.get();
  const records = response.value.map((item: any) => ({
    id: item.id,
    requester: item.fields.Title,
    startDate: item.fields.StartDate,
    endDate: item.fields.EndDate,
    status: item.fields.Status,
    hoursRequested: item.fields.HoursRequested,
  }));

  // Filter requester client-side (OData doesn't support contains on all field types)
  const filtered = params.requester
    ? records.filter((r: any) =>
        r.requester.toLowerCase().includes(params.requester!.toLowerCase())
      )
    : records;

  // Build summary for LLM
  const summary = [
    `Found ${filtered.length} PTO request(s).`,
    params.status && params.status !== "All" ? `Status: ${params.status}.` : "",
    params.month ? `Month: ${params.month}.` : "",
    `Total hours: ${filtered.reduce((sum: number, r: any) => sum + (r.hoursRequested || 0), 0)}.`,
  ]
    .filter(Boolean)
    .join(" ");

  return { records: filtered, summary };
}
```

### Wire functions into the message handler

```typescript
app.message(async (ctx) => {
  const userMessage = ctx.activity.text ?? "";

  // Send to LLM with function definitions
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "You are a workflow assistant. Answer questions about PTO, breaks, equipment, and other workflow records. " +
          "Always use the provided functions to query real data. Never make up record counts or details.",
      },
      { role: "user", content: userMessage },
    ],
    tools: queryFunctions.map((f) => ({ type: "function", function: f })),
  });

  const choice = response.choices[0];

  if (choice.message.tool_calls?.length) {
    const toolCall = choice.message.tool_calls[0];
    const args = JSON.parse(toolCall.function.arguments);

    // Execute the query
    let result: { records: any[]; summary: string };
    switch (toolCall.function.name) {
      case "queryPtoRequests":
        result = await queryPtoRequests(graphClient, siteId, ptoListId, args);
        break;
      case "queryBreakStatus":
        result = await queryBreakStatus(graphClient, siteId, breakListId, args);
        break;
      case "queryEquipmentBookings":
        result = await queryEquipmentBookings(graphClient, siteId, equipListId, args);
        break;
      default:
        result = { records: [], summary: "Unknown query type." };
    }

    // Send result back to LLM for natural language response
    const followUp = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "Summarize the query results naturally. Include counts and key details." },
        { role: "user", content: userMessage },
        choice.message,
        {
          role: "tool",
          tool_call_id: toolCall.id,
          content: result.summary,
        },
      ],
    });

    const textResponse = followUp.choices[0].message.content ?? "";

    // Send text summary + record cards
    await ctx.send(textResponse);

    if (result.records.length > 0 && result.records.length <= 5) {
      // Inline cards for small result sets
      for (const record of result.records) {
        await ctx.send({
          attachments: [{
            contentType: "application/vnd.microsoft.card.adaptive",
            content: buildRecordCard(record),
          }],
        });
      }
    } else if (result.records.length > 5) {
      // Summary card for large result sets
      await ctx.send({
        attachments: [{
          contentType: "application/vnd.microsoft.card.adaptive",
          content: buildRecordListCard(result.records.slice(0, 10)),
        }],
      });
    }
  } else {
    // No function call — direct response
    await ctx.send(choice.message.content ?? "I couldn't find relevant records for that query.");
  }
});
```

### Aggregate query example

```typescript
async function queryBreakStatus(
  graphClient: Client,
  siteId: string,
  listId: string,
  params: { currentOnly?: boolean; dateRange?: { start: string; end: string } }
): Promise<{ records: any[]; summary: string }> {
  const filters: string[] = [];

  if (params.currentOnly) {
    filters.push("fields/Status eq 'Active'");
  }

  if (params.dateRange) {
    filters.push(
      `fields/StartTime ge '${params.dateRange.start}' and fields/StartTime le '${params.dateRange.end}'`
    );
  }

  let query = graphClient
    .api(`/sites/${siteId}/lists/${listId}/items`)
    .expand("fields")
    .top(50);

  if (filters.length) query = query.filter(filters.join(" and "));

  const response = await query.get();
  const records = response.value.map((item: any) => item.fields);

  // Compute aggregates
  const activeBreaks = records.filter((r: any) => r.Status === "Active");
  const completedBreaks = records.filter((r: any) => r.Status === "Ended");
  const avgDuration =
    completedBreaks.length > 0
      ? completedBreaks.reduce((sum: number, r: any) => sum + (r.DurationMinutes || 0), 0) /
        completedBreaks.length
      : 0;

  const summary = [
    `Currently on break: ${activeBreaks.length} people.`,
    activeBreaks.map((r: any) => r.EmployeeName).join(", ") || "None.",
    completedBreaks.length > 0
      ? `Average break duration today: ${avgDuration.toFixed(1)} minutes.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return { records, summary };
}
```

## pitfalls

- **LLM may call the wrong function.** Provide clear, non-overlapping descriptions. "Who is available?" could match breaks or equipment. Use `description` fields to disambiguate and add examples in the system prompt.
- **OData `$filter` doesn't support `contains()` on all column types.** SharePoint Lists OData implementation is limited compared to full OData. `contains()` works on text columns but not choice or person columns. Fall back to client-side filtering when needed.
- **Don't pass raw Graph API responses to the LLM.** They contain metadata, `@odata` annotations, and nested objects that waste tokens and confuse the model. Extract only the fields you need into a clean summary string.
- **Pagination state must be conversation-scoped.** If user A asks "show more" in a channel, it should continue user A's query, not user B's. Key pagination state on `(conversationId, userId)`.
- **Token limits on large result sets.** If a query returns 50 records, the summary string passed to the LLM might be too long. Summarize with counts and top-N details rather than listing every record.
- **Cache invalidation matters for "right now" queries.** "Who is on break?" expects real-time accuracy. Cache TTL should be short (30s max) for current-state queries. Historical queries can cache longer.

## references

- https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/function-calling
- https://learn.microsoft.com/en-us/graph/api/listitem-list
- https://learn.microsoft.com/en-us/graph/query-parameters
- https://platform.openai.com/docs/guides/function-calling

## instructions

Use this expert when implementing natural language retrieval over structured workflow data. Covers AI function calling design for query translation, OData filter building from function parameters, aggregate computation, result rendering as cards, and pagination. Pair with `workflow.sharepoint-lists-ts.md` for the underlying data store, `ai.function-calling-design-ts.md` for function schema best practices, `ai.function-calling-implementation-ts.md` for execution patterns, and `workflow.message-native-records-ts.md` for rendering results as interactive record cards.

## research

Deep Research prompt:

"Write a micro expert on natural language querying over structured workflow state in Microsoft Teams (TypeScript). Cover: AI function calling to translate NL to SharePoint List OData queries, function schema design for PTO/break/equipment queries, OData filter building, aggregate computation (averages, counts, trends), result rendering as Adaptive Cards, pagination, caching, and grounding AI responses in actual data. Include complete patterns from user message through LLM function call through query execution through card rendering."
