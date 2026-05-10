# Python SDK Annotation Patterns

Add feedback to spans, traces, documents, and sessions using the Python client.

## Client Setup

```python
from phoenix.client import Client
client = Client()  # Default: http://localhost:6006
```

## Span Annotations

Add feedback to individual spans:

```python
client.spans.add_span_annotation(
    span_id="abc123",
    annotation_name="quality",
    annotator_kind="HUMAN",
    label="high_quality",
    score=0.95,
    explanation="Accurate and well-formatted",
    metadata={"reviewer": "alice"},
    sync=True
)
```

## Document Annotations

Rate individual documents in RETRIEVER spans:

```python
client.spans.add_document_annotation(
    span_id="retriever_span",
    document_position=0,  # 0-based index
    annotation_name="relevance",
    annotator_kind="LLM",
    label="relevant",
    score=0.95
)
```

## Trace Annotations

Feedback on entire traces:

```python
client.traces.add_trace_annotation(
    trace_id="trace_abc",
    annotation_name="correctness",
    annotator_kind="HUMAN",
    label="correct",
    score=1.0
)
```

## Span Notes

Notes are a special type of annotation for free-form text — useful for open coding, where reviewers leave qualitative observations on a span before any rubric exists. Later, those notes can be aggregated and distilled into structured labels or scores.

Notes are **append-only**: each call auto-generates a UUIDv4 identifier, so multiple notes naturally accumulate on the same span. Structured annotations are keyed by `(name, span_id, identifier)` — you can have many same-named annotations on one span by supplying distinct identifiers (e.g. one per reviewer); writing the same `(name, span_id, identifier)` overwrites the existing entry.

```python
client.spans.add_span_note(
    span_id="abc123def456",
    note="Unexpected token in response, needs review",
)
```

## Session Annotations

Feedback on multi-turn conversations:

```python
client.sessions.add_session_annotation(
    session_id="session_xyz",
    annotation_name="user_satisfaction",
    annotator_kind="HUMAN",
    label="satisfied",
    score=0.85
)
```

## RAG Pipeline Example

```python
from phoenix.client import Client
from phoenix.client.resources.spans import SpanDocumentAnnotationData

client = Client()

# Document relevance (batch)
client.spans.log_document_annotations(
    document_annotations=[
        SpanDocumentAnnotationData(
            name="relevance", span_id="retriever_span", document_position=i,
            annotator_kind="LLM", result={"label": label, "score": score}
        )
        for i, (label, score) in enumerate([
            ("relevant", 0.95), ("relevant", 0.80), ("irrelevant", 0.10)
        ])
    ]
)

# LLM response quality
client.spans.add_span_annotation(
    span_id="llm_span",
    annotation_name="faithfulness",
    annotator_kind="LLM",
    label="faithful",
    score=0.90
)

# Overall trace quality
client.traces.add_trace_annotation(
    trace_id="trace_123",
    annotation_name="correctness",
    annotator_kind="HUMAN",
    label="correct",
    score=1.0
)
```

## API Reference

- [Python Client API](https://arize-phoenix.readthedocs.io/projects/client/en/latest/)
