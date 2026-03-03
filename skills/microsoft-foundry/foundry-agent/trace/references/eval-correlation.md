# Eval Correlation — Find Evaluation Results by Response or Conversation ID

Look up evaluation scores for a specific agent response using App Insights.

> **IMPORTANT:** The Foundry evaluation API does NOT support querying by response ID or conversation ID. App Insights `customEvents` is the ONLY way to correlate eval scores to specific responses. Always use this KQL approach when the user asks for eval results for a specific response or conversation.

## Prerequisites

- App Insights resource resolved (see [trace.md](../trace.md) Before Starting)
- A response ID (`gen_ai.response.id`) or conversation ID (`gen_ai.conversation.id`) from a previous trace query

## Search by Response ID

```kql
customEvents
| where timestamp > ago(30d)
| where name == "gen_ai.evaluation.result"
| where customDimensions["gen_ai.response.id"] == "<response_id>"
| extend
    evalName = tostring(customDimensions["gen_ai.evaluation.name"]),
    score = todouble(customDimensions["gen_ai.evaluation.score.value"]),
    label = tostring(customDimensions["gen_ai.evaluation.score.label"]),
    explanation = tostring(customDimensions["gen_ai.evaluation.explanation"]),
    responseId = tostring(customDimensions["gen_ai.response.id"]),
    conversationId = tostring(customDimensions["gen_ai.conversation.id"])
| project timestamp, evalName, score, label, explanation, responseId, conversationId
| order by evalName asc
```

## Search by Conversation ID

```kql
customEvents
| where timestamp > ago(30d)
| where name == "gen_ai.evaluation.result"
| where customDimensions["gen_ai.conversation.id"] == "<conversation_id>"
| extend
    evalName = tostring(customDimensions["gen_ai.evaluation.name"]),
    score = todouble(customDimensions["gen_ai.evaluation.score.value"]),
    label = tostring(customDimensions["gen_ai.evaluation.score.label"]),
    explanation = tostring(customDimensions["gen_ai.evaluation.explanation"]),
    responseId = tostring(customDimensions["gen_ai.response.id"])
| project timestamp, evalName, score, label, explanation, responseId
| order by responseId asc, evalName asc
```

## Present Results

Show eval scores as a table:

| Evaluator | Score | Label | Explanation |
|-----------|-------|-------|-------------|
| coherence | 5.0 | pass | Response is well-structured... |
| fluency | 4.0 | pass | Natural language flow... |
| relevance | 2.0 | fail | Response doesn't address... |

When showing alongside a span tree (see [Conversation Detail](conversation-detail.md)), attach eval scores to the span whose `gen_ai.response.id` matches.
