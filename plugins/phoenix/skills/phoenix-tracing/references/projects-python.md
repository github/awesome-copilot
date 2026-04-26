# Phoenix Tracing: Projects (Python)

**Organize traces by application using projects (Phoenix's top-level grouping).**

## Overview

Projects group traces for a single application or experiment.

**Use for:** Environments (dev/staging/prod), A/B testing, versioning

## Setup

### Environment Variable (Recommended)

```bash
export PHOENIX_PROJECT_NAME="my-app-prod"
```

```python
import os
os.environ["PHOENIX_PROJECT_NAME"] = "my-app-prod"
from phoenix.otel import register
register()  # Uses "my-app-prod"
```

### Code

```python
from phoenix.otel import register
register(project_name="my-app-prod")
```

## Use Cases

**Environments:**

```python
# Dev, staging, prod
register(project_name="my-app-dev")
register(project_name="my-app-staging")
register(project_name="my-app-prod")
```

**A/B Testing:**

```python
# Compare models
register(project_name="chatbot-gpt4")
register(project_name="chatbot-claude")
```

**Versioning:**

```python
# Track versions
register(project_name="my-app-v1")
register(project_name="my-app-v2")
```

## Switching Projects (Python Notebooks Only)

```python
from openinference.instrumentation import dangerously_using_project
from phoenix.otel import register

register(project_name="my-app")

# Switch temporarily for evals
with dangerously_using_project("my-eval-project"):
    run_evaluations()
```

**⚠️ Only use in notebooks/scripts, not production.**
