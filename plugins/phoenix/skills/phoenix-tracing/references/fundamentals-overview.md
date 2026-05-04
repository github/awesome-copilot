# Overview and Traces & Spans

This document covers the fundamental concepts of OpenInference traces and spans in Phoenix.

## Overview

OpenInference is a set of semantic conventions for AI and LLM applications based on OpenTelemetry. Phoenix uses these conventions to capture, store, and analyze traces from AI applications.

**Key Concepts:**

- **Traces** represent end-to-end requests through your application
- **Spans** represent individual operations within a trace (LLM calls, retrievals, tool invocations)
- **Attributes** are key-value pairs attached to spans using flattened, dot-notation paths
- **Span Kinds** categorize the type of operation (LLM, RETRIEVER, TOOL, etc.)

## Traces and Spans

### Trace Hierarchy

A **trace** is a tree of **spans** representing a complete request:

```
Trace ID: abc123
├─ Span 1: CHAIN (root span, parent_id = null)
│  ├─ Span 2: RETRIEVER (parent_id = span_1_id)
│  │  └─ Span 3: EMBEDDING (parent_id = span_2_id)
│  └─ Span 4: LLM (parent_id = span_1_id)
│     └─ Span 5: TOOL (parent_id = span_4_id)
```

### Context Propagation

Spans maintain parent-child relationships via:

- `trace_id` - Same for all spans in a trace
- `span_id` - Unique identifier for this span
- `parent_id` - References parent span's `span_id` (null for root spans)

Phoenix uses these relationships to:

- Build the span tree visualization in the UI
- Calculate cumulative metrics (tokens, errors) up the tree
- Enable nested querying (e.g., "find CHAIN spans containing LLM spans with errors")

### Span Lifecycle

Each span has:

- `start_time` - When the operation began (Unix timestamp in nanoseconds)
- `end_time` - When the operation completed
- `status_code` - OK, ERROR, or UNSET
- `status_message` - Optional error message
- `attributes` - object with all semantic convention attributes
