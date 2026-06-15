# ai.citations-feedback-ts

## purpose

AI-generated message markers, citation annotations, and user feedback collection.

## rules

1. Import `MessageActivity` from `@microsoft/teams.api`. This is the builder class for constructing rich AI messages with markers, citations, and feedback buttons.
2. Call `.addAiGenerated()` on a `MessageActivity` to mark the message as AI-generated. Teams renders a visual indicator so users know the content was produced by an AI model. Always add this marker to LLM-generated responses.
3. Call `.addFeedback()` to attach thumbs-up/thumbs-down feedback buttons to the message. This enables users to rate the AI response quality directly in the chat.
4. Call `.addCitation(index, { name, abstract })` to annotate the message with a numbered source citation. The `index` is the citation number (1-based), `name` is the source title, and `abstract` is a brief description. Add citations for every source the LLM references in its response.
5. Handle user feedback by registering `app.on('message.submit.feedback', handler)`. The feedback payload contains `activity.value.actionValue.reaction` (`'like'` or `'dislike'`) and optionally `activity.value.actionValue.feedback` (free-text user comment).
6. The feedback handler receives `activity.replyToId` (or `activity.id`) which identifies the original AI message the user rated. Use this to correlate feedback with specific responses for analytics.
7. Always return `{ status: 200 }` from the feedback handler to acknowledge receipt. Failing to return a status causes a retry loop in the Teams client.
8. Chain all `MessageActivity` methods fluently: `new MessageActivity(text).addAiGenerated().addFeedback().addCitation(1, {...})`. The builder pattern returns `this` for each method.
9. When combining with streaming, construct a `new MessageActivity(chunk)` inside the `onChunk` callback and call `.addFeedback()` on it. The stream accumulates content and the final message retains the feedback buttons.
10. Store feedback data (reaction, text, message ID, user ID, timestamp) in a database for quality monitoring dashboards. Track like/dislike ratios per prompt template or function to identify areas for improvement.

## patterns

### MessageActivity with AI markers, feedback, and citations

```typescript
import { MessageActivity } from '@microsoft/teams.api';

app.on('message', async ({ send, activity }) => {
  const prompt = new ChatPrompt({ model, instructions: 'You are a helpful assistant.' });

  const response = await prompt.send(activity.text);

  if (response.content) {
    const msg = new MessageActivity(response.content)
      .addAiGenerated()    // Marks the message as AI-generated
      .addFeedback()        // Adds thumbs up/down feedback buttons
      .addCitation(1, { name: 'Getting Started Guide', abstract: 'Setup and installation instructions' })
      .addCitation(2, { name: 'API Reference', abstract: 'Complete API documentation' });

    await send(msg);
  }
});
```

### Handling feedback events

```typescript
app.on('message.submit.feedback', async ({ activity, log }) => {
  const feedback = {
    messageId: activity.replyToId || activity.id,
    reaction: activity.value.actionValue.reaction,   // 'like' or 'dislike'
    feedback: activity.value.actionValue.feedback,     // Optional text from user
  };

  log.info('Feedback received:', feedback);

  // Store feedback for analytics
  await feedbackStore.save({
    ...feedback,
    userId: activity.from.id,
    timestamp: new Date().toISOString(),
  });

  return { status: 200 };
});
```

### Streaming with feedback buttons

```typescript
import { MessageActivity } from '@microsoft/teams.api';

app.on('message', async ({ stream, activity }) => {
  const prompt = new ChatPrompt({ model, instructions: 'You are a helpful assistant.' });

  const response = await prompt.send(activity.text, {
    onChunk: (chunk: string) => {
      // Each streamed chunk includes feedback buttons
      stream.emit(
        new MessageActivity(chunk)
          .addAiGenerated()
          .addFeedback()
      );
    },
  });

  // Final message retains AI marker and feedback buttons
});
```

## pitfalls

- **Forgetting `.addAiGenerated()`**: Without the AI marker, Teams renders the message as if it came from a human agent. Users may be confused about the source of the response. Always add it for LLM-generated content.
- **Not returning `{ status: 200 }` from the feedback handler**: The Teams client retries the feedback submission if it does not receive an acknowledgment, causing duplicate feedback entries and UI flicker.
- **Citation index starting at 0**: Citation indices are 1-based to match how they appear in the message text (e.g., `[1]`, `[2]`). Starting at 0 causes a mismatch between the rendered citation number and the annotation.
- **Ignoring the feedback text field**: Users can optionally provide free-text feedback alongside their thumbs-up/thumbs-down. Capture `activity.value.actionValue.feedback` -- it often contains actionable improvement suggestions.
- **Adding citations without instructing the LLM to cite**: The LLM must be prompted to reference sources by number (e.g., `"Always cite sources as [1], [2]"` in instructions). Otherwise, citation annotations exist but the response text has no matching references.
- **Using `send()` instead of `MessageActivity`**: Calling `await send(response.content)` sends a plain string with no markers, citations, or feedback buttons. Always wrap LLM responses in `MessageActivity` for production bots.

## references

- [Teams AI Library v2 -- GitHub](https://github.com/microsoft/teams.ts)
- [AI Message Markers -- Microsoft Learn](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/bot-messages-ai-generated-content)
- [Citations in Teams Messages -- Microsoft Learn](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/bot-messages-ai-generated-content#citations)
- [@microsoft/teams.api -- npm](https://www.npmjs.com/package/@microsoft/teams.api)

## instructions

This expert covers AI-generated message markers, citation annotations, and user feedback collection in Teams AI v2. Use it when you need to:

- Mark messages as AI-generated with `.addAiGenerated()`
- Attach thumbs-up/thumbs-down feedback buttons with `.addFeedback()`
- Annotate responses with numbered source citations using `.addCitation()`
- Handle `message.submit.feedback` events and store feedback for analytics
- Combine feedback buttons with streaming responses
- Build quality monitoring dashboards from collected feedback data

Pair with `ai.streaming-ts.md` for streaming with feedback, `ai.rag-retrieval-ts.md` for annotating RAG results with citations, and `ai.chatprompt-basics-ts.md` for prompt responses.

## research

Deep Research prompt:

"Write a micro expert on adding AI markers, feedback, and citations in Teams SDK v2 (TypeScript). Cover MessageActivity.addAiGenerated(), addFeedback(), addCitation(), and handling app.on('message.submit.feedback'). Include payload examples, storage patterns for analytics, and UX considerations."
