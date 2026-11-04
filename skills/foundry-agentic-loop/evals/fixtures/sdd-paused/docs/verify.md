# Verify

| Check | Result | Evidence |
| --- | --- | --- |
| Contract tests | passed | `pytest tests/contract` 14 passed |
| E2E (10 seeded claims, c = 4) | failed | S3 and S7 return `queue: null` when `severity` is `medium` |
| Correlated trace | passed | backend, triage and `get_policy` spans share one operation ID |
