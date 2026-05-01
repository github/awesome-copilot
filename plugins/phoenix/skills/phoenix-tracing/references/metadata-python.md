# Phoenix Tracing: Custom Metadata (Python)

Add custom attributes to spans for richer observability.

## Install

```bash
pip install openinference-instrumentation
```

## Session

```python
from openinference.instrumentation import using_session

with using_session(session_id="my-session-id"):
    # Spans get: "session.id" = "my-session-id"
    ...
```

## User

```python
from openinference.instrumentation import using_user

with using_user("my-user-id"):
    # Spans get: "user.id" = "my-user-id"
    ...
```

## Metadata

```python
from openinference.instrumentation import using_metadata

with using_metadata({"key": "value", "experiment_id": "exp_123"}):
    # Spans get: "metadata" = '{"key": "value", "experiment_id": "exp_123"}'
    ...
```

## Tags

```python
from openinference.instrumentation import using_tags

with using_tags(["tag_1", "tag_2"]):
    # Spans get: "tag.tags" = '["tag_1", "tag_2"]'
    ...
```

## Combined (using_attributes)

```python
from openinference.instrumentation import using_attributes

with using_attributes(
    session_id="my-session-id",
    user_id="my-user-id",
    metadata={"environment": "production"},
    tags=["prod", "v2"],
    prompt_template="Answer: {question}",
    prompt_template_version="v1.0",
    prompt_template_variables={"question": "What is Phoenix?"},
):
    # All attributes applied to spans in this context
    ...
```

## On a Single Span

```python
span.set_attribute("metadata", json.dumps({"key": "value"}))
span.set_attribute("user.id", "user_123")
span.set_attribute("session.id", "session_456")
```

## As Decorators

All context managers can be used as decorators:

```python
@using_session(session_id="my-session-id")
@using_user("my-user-id")
@using_metadata({"env": "prod"})
def my_function():
    ...
```
