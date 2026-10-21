# AGENT Spans

AGENT spans represent autonomous reasoning blocks (ReAct agents, planning loops, multi-step decision making).

**Required:** `openinference.span.kind` = "AGENT"

## Example

```json
{
  "openinference.span.kind": "AGENT",
  "input.value": "Book a flight to New York for next Monday",
  "output.value": "I've booked flight AA123 departing Monday at 9:00 AM"
}
```
