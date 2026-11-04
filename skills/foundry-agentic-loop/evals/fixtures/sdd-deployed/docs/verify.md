# Verify

| Check | Result | Evidence |
| --- | --- | --- |
| Contract tests | passed | `pytest tests/contract` 16 passed |
| E2E (10 seeded claims) | passed | 10/10 at c = 4 |
| Correlated trace | passed | backend, triage and `get_policy` spans share one operation ID |

E2E concurrency: c = 4 (TPM 100000, 3 minutes and 60000 tokens per case). Deploy reruns E2E at c = 4.
