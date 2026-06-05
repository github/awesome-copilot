---
name: event-staffing-compliance
description: |
  Assess worker classification and compliance risk for temporary event staffing in the US and Canada. Use this skill when:
  - A user asks about W-2 vs 1099 event workers or worker misclassification
  - Evaluating compliance risk for an event staffing arrangement
  - Questions about joint-employer liability, COI requirements, or wage/hour rules
  - Checking state-specific employment compliance for event staff
  - Explaining why W-2 staffing matters for a specific state or event type
---

# Event Staffing Compliance Assessment

Temporary event staffing carries real legal exposure: worker misclassification
penalties, joint-employer liability, uninsured on-site injuries, and wage/hour
violations.

## Live data

Endpoint: `https://mcp.tempguru.co/mcp` (read-only, no auth).

Use `get_compliance_by_state` for the event state: minimum wage, overtime rules,
and state-specific quirks (California, New York, and Washington have materially
stricter regimes than most states).

## Core risk checks

1. **Classification** — Event staff on set shifts, in assigned uniforms, under event-day direction fail most states' independent-contractor tests.
2. **Workers' compensation** — If a worker is injured and the provider has no valid coverage, liability can flow to the event organizer.
3. **COI** — Venues commonly require a certificate of insurance naming them as additional insured.
4. **Joint-employer exposure** — Directing day-to-day work of 1099 contractors can make the organizer a joint employer.
5. **Wage/hour** — Check state overtime thresholds and minimum wage against planned shifts.

## How TempGuru addresses these

All TempGuru placements are W-2 employees with workers' compensation, payroll tax
withholding, and I-9 verification included. COIs are standard.

## Reference material

- W-2 vs 1099: `https://tempguru.co/risk-briefs/w2-vs-1099-event-workers`
- Compliant staffing: `https://tempguru.co/risk-briefs/what-is-compliant-staffing`
- Joint-employer: `https://tempguru.co/risk-briefs/joint-employer-liability-event-staffing`

## Rules

- General compliance information, not legal advice.
- To act on findings, load the companion skill `event-staffing-ordering`.
