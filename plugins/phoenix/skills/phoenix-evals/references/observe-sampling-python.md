# Observe: Sampling Strategies

How to efficiently sample production traces for review.

## Strategies

### 1. Failure-Focused (Highest Priority)

```python
errors = spans_df[spans_df["status_code"] == "ERROR"]
negative_feedback = spans_df[spans_df["feedback"] == "negative"]
```

### 2. Outliers

```python
long_responses = spans_df.nlargest(50, "response_length")
slow_responses = spans_df.nlargest(50, "latency_ms")
```

### 3. Stratified (Coverage)

```python
# Sample equally from each category
by_query_type = spans_df.groupby("metadata.query_type").apply(
    lambda x: x.sample(min(len(x), 20))
)
```

### 4. Metric-Guided

```python
# Review traces flagged by automated evaluators
flagged = spans_df[eval_results["label"] == "hallucinated"]
borderline = spans_df[(eval_results["score"] > 0.3) & (eval_results["score"] < 0.7)]
```

## Building a Review Queue

```python
def build_review_queue(spans_df, max_traces=100):
    queue = pd.concat([
        spans_df[spans_df["status_code"] == "ERROR"],
        spans_df[spans_df["feedback"] == "negative"],
        spans_df.nlargest(10, "response_length"),
        spans_df.sample(min(30, len(spans_df))),
    ]).drop_duplicates("span_id").head(max_traces)
    return queue
```

## Sample Size Guidelines

| Purpose | Size |
| ------- | ---- |
| Initial exploration | 50-100 |
| Error analysis | 100+ (until saturation) |
| Golden dataset | 100-500 |
| Judge calibration | 100+ per class |

**Saturation:** Stop when new traces show the same failure patterns.

## Trace-Level Sampling

When you need whole requests (all spans per trace), use `get_traces`:

```python
from phoenix.client import Client
from datetime import datetime, timedelta

client = Client()

# Recent traces with full span trees
traces = client.traces.get_traces(
    project_identifier="my-app",
    limit=100,
    include_spans=True,
)

# Time-windowed sampling (e.g., last hour)
traces = client.traces.get_traces(
    project_identifier="my-app",
    start_time=datetime.now() - timedelta(hours=1),
    limit=50,
    include_spans=True,
)

# Filter by session (multi-turn conversations)
traces = client.traces.get_traces(
    project_identifier="my-app",
    session_id="user-session-abc",
    include_spans=True,
)

# Sort by latency to find slowest requests
traces = client.traces.get_traces(
    project_identifier="my-app",
    sort="latency_ms",
    order="desc",
    limit=50,
)
```
