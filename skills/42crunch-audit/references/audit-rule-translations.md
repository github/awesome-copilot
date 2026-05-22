# Audit Rule-ID Translation Table

Match each rule ID by suffix. When multiple suffixes match, use the most
specific one.

| Rule ID suffix (end of string) | Plain-English Title | Risk for developers |
|---|---|---|
| `string-pattern` | Missing input format constraint | Without a regex pattern, any string is accepted — enables format-bypass and injection attacks |
| `string-maxlength` | Missing maximum string length | Unbounded strings allow buffer-overflow-style abuse and log flooding |
| `numerical-max` | Missing numeric upper bound | Arbitrarily large numbers can cause integer overflow or resource exhaustion |
| `additionalproperties-true` | Schema allows extra/unknown fields | Mass-assignment risk — undocumented fields submitted by clients may be silently processed |
| `array-maxitems` | Response array has no item cap | API can return unlimited rows, causing data over-exposure and DoS via large payloads |
| `response-403` | 403 Forbidden response not documented | Clients can't reliably detect authorization failures; broken access control goes unnoticed |
| `response-404` | 404 Not Found response not documented | Clients can't distinguish "resource missing" from other errors |
| `response-406` | 406 Not Acceptable response not documented | Content negotiation failures are undocumented; clients may misinterpret errors |
| `response-429` | 429 Too Many Requests response not documented | Rate-limit responses are undocumented; clients cannot implement back-off |
| `response-default-undefined` | No default error response defined | Unhandled errors return undocumented responses; clients fail unpredictably |
| `header-schema-undefined` | Response header has no schema | Header values are unvalidated and undocumented; clients can't rely on them |
| `string-loosepattern` | Regex pattern is too permissive | Overly broad pattern allows values outside the intended format through |
| `sample-undefined` | No example values provided | Scan and test tools cannot auto-generate valid requests; all test coverage is blocked |
| `schema-example-improper` | Example value doesn't match its schema | Misleading documentation — example fails its own schema validation |
| `global-parameter-unused` | Reusable parameter defined but never referenced | Dead schema definition; creates maintenance confusion |
| `accept-empty-security-used` | Empty security override in use | One or more operations may bypass authentication; review intent carefully |

For any rule ID not in the table: derive a title by splitting the rule ID on
`-`, skipping the leading `v3`, and joining the remaining words as a sentence.
