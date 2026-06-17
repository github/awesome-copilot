# Python IoT Edge Module Template

Use this template to structure implementation proposals and reviews.

## 0) Official Python Baseline

- Official references reviewed from <https://www.python.org/> and <https://docs.python.org/3/>.
- Language and stdlib usage validated against <https://docs.python.org/3/reference/> and <https://docs.python.org/3/library/>.
- Best practices reviewed from `references/python-official-best-practices.md`.

## 1) Module Summary

- Module name:
- Business capability:
- Inputs:
- Outputs:
- Trigger conditions:

## 2) Message Contract

- Schema version:
- Required fields:
- Optional fields:
- Error payload contract:

## 3) Runtime Configuration

- Python version:
- Base image:
- Environment variables:
- Desired properties:
- Resource limits:

## 4) Resilience

- Retry policy:
- Backoff policy:
- Queueing strategy:
- Idempotency approach:
- Timeout and circuit-breaker behavior:

## 5) Security

- Secret source (never inline):
- Identity and permissions:
- Command authorization model:
- Audit log requirements:

## 6) Observability

- Health signals:
- Business metrics:
- Error metrics:
- Correlation/trace requirements:
- Alert thresholds:

## 7) Validation Matrix

- Happy path tests:
- Malformed payload tests:
- Network interruption tests:
- Throughput and latency tests:
- Rollback validation:
