# Required and Recommended Attributes

This document covers the required attribute and highly recommended attributes for all OpenInference spans.

## Required Attribute

**Every span MUST have exactly one required attribute:**

```json
{
  "openinference.span.kind": "LLM"
}
```

## Highly Recommended Attributes

While not strictly required, these attributes are **highly recommended** on all spans as they:
- Enable evaluation and quality assessment
- Help understand information flow through your application
- Make traces more useful for debugging

### Input/Output Values

| Attribute | Type | Description |
|-----------|------|-------------|
| `input.value` | String | Input to the operation (prompt, query, document) |
| `output.value` | String | Output from the operation (response, result, answer) |

**Example:**
```json
{
  "openinference.span.kind": "LLM",
  "input.value": "What is the capital of France?",
  "output.value": "The capital of France is Paris."
}
```

**Why these matter:**
- **Evaluations**: Many evaluators (faithfulness, relevance, hallucination detection) require both input and output to assess quality
- **Information flow**: Seeing inputs/outputs makes it easy to trace how data transforms through your application
- **Debugging**: When something goes wrong, having the actual input/output makes root cause analysis much faster
- **Analytics**: Enables pattern analysis across similar inputs or outputs

**Phoenix Behavior:**
- Input/output displayed prominently in span details
- Evaluators can automatically access these values
- Search/filter traces by input or output content
- Export inputs/outputs for fine-tuning datasets

## Valid Span Kinds

There are exactly **9 valid span kinds** in OpenInference:

| Span Kind | Purpose | Common Use Case |
|-----------|---------|-----------------|
| `LLM` | Language model inference | OpenAI, Anthropic, local LLM calls |
| `EMBEDDING` | Vector generation | Text-to-vector conversion |
| `CHAIN` | Application flow orchestration | LangChain chains, custom workflows |
| `RETRIEVER` | Document/context retrieval | Vector DB queries, semantic search |
| `RERANKER` | Result reordering | Rerank retrieved documents |
| `TOOL` | External tool invocation | API calls, function execution |
| `AGENT` | Autonomous reasoning | ReAct agents, planning loops |
| `GUARDRAIL` | Safety/policy checks | Content moderation, PII detection |
| `EVALUATOR` | Quality assessment | Answer relevance, faithfulness scoring |
