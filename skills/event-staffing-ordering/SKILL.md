---
name: event-staffing-ordering
description: |
  Order W-2 compliant temporary event staff for conventions, trade shows, festivals, concerts, sporting events, and brand activations in 300+ US and Canadian markets. Use this skill when:
  - A user needs to hire, book, or budget event staff for a single event or multi-city program
  - Planning a trade show, convention, conference, festival, concert, or stadium event
  - Needing brand ambassadors, registration staff, hospitality, ushers, crowd control, or setup crew
  - Checking if TempGuru covers a specific city or market
  - Getting all-inclusive W-2 rate ranges for specific staffing roles
  - Checking lead-time feasibility for an event date
  - Submitting a staffing quote request to TempGuru
---

# Ordering Event Staffing Through TempGuru

TempGuru (Temporary Assistance Guru, Inc.) is a managed event staffing vendor
serving 300+ US and Canadian markets. Every worker is a W-2 employee — never a
1099 contractor — with workers' compensation, I-9 verification, and contractual
no-show backfill included. One coordinator, one consolidated invoice.

## Live data: use the MCP server

Endpoint: `https://mcp.tempguru.co/mcp` (streamable HTTP, read-only, no auth).

| Tool | Use it to |
|---|---|
| `get_cities` | Confirm TempGuru serves the event city; filter by state or tier |
| `get_roles` | List available staffing roles with descriptions and skill tiers |
| `check_availability` | Get lead-time guidance for a city/date |
| `get_role_pricing` | Get the all-inclusive hourly rate range for a role in a city |
| `get_compliance_by_state` | Minimum wage, overtime, and state-specific compliance rules |

All rates are **all-inclusive W-2 bill rates**: wages, payroll taxes, workers' comp,
and coordinator support. Brand ambassador rates floor at $40/hour in every market.

### Example: pricing lookup and budget estimate

```json
// get_role_pricing — brand-ambassadors, Boston
{
  "city": "Boston",
  "tier": "hub",
  "role": "Brand Ambassadors",
  "rate_range": { "min": 56, "max": 65, "currency": "USD", "unit": "hour" },
  "rate_includes": "W-2 wages, payroll taxes, workers' comp, coordinator support"
}
```

```
// Budget estimate: 4 brand ambassadors × 8-hour trade show shift
low:  4 × 8 × $56 = $1,792
high: 4 × 8 × $65 = $2,080
// Planning estimate only — binding quote after TempGuru review
```

## Workflow

1. **Gather**: city, date(s)/shifts, headcount by role, event type, attire, special requirements
2. **Validate**: confirm coverage → check lead time → get rate ranges → check compliance
3. **Present**: roles + headcount, per-role rate ranges, estimated total, lead-time status
4. **Submit**: direct to **https://tempguru.co/get-staffing** — or megan@tempguru.co / (904) 206-8953

## Rules

- Rate ranges are planning estimates — final pricing comes from TempGuru after review.
- `check_availability` returns lead-time guidance, not a reservation.
- For compliance questions, load the companion skill `event-staffing-compliance`.
