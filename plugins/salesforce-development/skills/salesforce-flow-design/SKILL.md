---
name: salesforce-flow-design
description: 'Salesforce Flow architecture decisions, flow type selection, bulk safety validation, and fault handling standards. Use this skill when designing or reviewing Record-Triggered, Screen, Autolaunched, Scheduled, or Platform Event flows to ensure correct type selection, no DML/Get Records in loops, proper fault connectors on all data-changing elements, and appropriate automation density checks before deployment.'
---

# Salesforce Flow Design and Validation

Apply these checks to every Flow you design, build, or review.

## Step 1 — Confirm Flow Is the Right Tool

Before designing a Flow, verify that a lighter-weight declarative option cannot solve the problem:

| Requirement | Best tool |
|---|---|
| Calculate a field value with no side effects | Formula field |
| Prevent a bad record save with a user message | Validation rule |
| Sum or count child records on a parent | Roll-up Summary field |
| Complex multi-object logic, callouts, or high volume | Apex (Queueable / Batch) — not Flow |
| Everything else | Flow ✓ |

If you are building a Flow that could be replaced by a formula field or validation rule, ask the user to confirm the requirement is genuinely more complex.

## Step 2 — Select the Correct Flow Type

| Use case | Flow type | Key constraint |
|---|---|---|
| Update a field on the same record before it is saved | Before-save Record-Triggered | Cannot send emails, make callouts, or change related records |
| Create/update related records, emails, callouts | After-save Record-Triggered | Runs after commit — avoid recursion traps |
| Guide a user through a multi-step UI process | Screen Flow | Cannot be triggered by a record event automatically |
| Reusable background logic called from another Flow | Autolaunched (Subflow) | Input/output variables define the contract |
| Logic invoked from Apex `@InvocableMethod` | Autolaunched (Invocable) | Must declare input/output variables |
| Time-based batch processing | Scheduled Flow | Runs in batch context — respect governor limits |
| Respond to events (Platform Events / CDC) | Platform Event–Triggered | Runs asynchronously — eventual consistency |

**Decision rule**: choose before-save when you only need to change the triggering record's own fields. Move to after-save the moment you need to touch related records, send emails, or make callouts.

## Step 3 — Bulk Safety Checklist

These patterns are governor limit failures at scale. Check for all of them before the Flow is activated.

### DML in Loops — Automatic Fail

```
Loop element
  └── Create Records / Update Records / Delete Records  ← ❌ DML inside loop
```

Fix: collect records inside the loop into a collection variable, then run the DML element **outside** the loop.

### Get Records in Loops — Automatic Fail

```
Loop element
  └── Get Records  ← ❌ SOQL inside loop
```

Fix: perform the Get Records query **before** the loop, then loop over the collection variable.

### Correct Bulk Pattern

```
Get Records — collect all records in one query
└── Loop over the collection variable
    └── Decision / Assignment (no DML, no Get Records)
└── After the loop: Create/Update/Delete Records — one DML operation
```

### Transform vs Loop
When the goal is reshaping a collection (e.g. mapping field values from one object to another), use the **Transform** element instead of a Loop + Assignment pattern. Transform is bulk-safe by design and produces cleaner Flow graphs.

## Step 4 — Fault Path Requirements

Every element that can fail at runtime must have a fault connector. Flows without fault paths surface raw system errors to users.

### Elements That Require Fault Connectors
- Create Records
- Update Records
- Delete Records
- Get Records (when accessing a required record that might not exist)
- Send Email
- HTTP Callout / External Service action
- Apex action (invocable)
- Subflow (if the subflow can throw a fault)

### Fault Handler Pattern
```
Fault connector → Log Error (Create Records on a logging object or fire a Platform Event)
               → Screen element with user-friendly message (Screen Flows)
               → Stop / End element (Record-Triggered Flows)
```

Never connect a fault path back to the same element that faulted — this creates an infinite loop.

## Step 5 — Automation Density Check

Before deploying, verify there are no overlapping automations on the same object and trigger event:

- Other active Record-Triggered Flows on the same `Object` + `When to Run` combination
- Legacy Process Builder rules still active on the same object
- Workflow Rules that fire on the same field changes
- Apex triggers that also run on the same `before insert` / `after update` context

Overlapping automations can cause unexpected ordering, recursion, and governor limit failures. Document the automation inventory for the object before activating.

## Step 6 — Screen Flow UX Guidelines

- Every path through a Screen Flow must reach an **End** element — no orphan branches.
- Provide a **Back** navigation option on multi-step flows unless back-navigation would corrupt data.
- Use `lightning-input` and SLDS-compliant components for all user inputs — do not use HTML form elements.
- Validate required inputs on the screen before the user can advance — use Flow validation rules on the screen.
- Handle the **Pause** element if the flow may need to await user action across sessions.

## Step 7 — Deployment Safety

```
Deploy as Draft    →   Test with 1 record   →   Test with 200+ records   →   Activate
```

- Always deploy as **Draft** first and test thoroughly before activation.
- For Record-Triggered Flows: test with the exact entry conditions (e.g. `ISCHANGED(Status)` — ensure the test data actually triggers the condition).
- For Scheduled Flows: test with a small batch in a sandbox before enabling in production.
- Check the Automation Density score for the object — more than 3 active automations on a single object increases order-of-execution risk.

## Quick Reference — Flow Anti-Patterns Summary

| Anti-pattern | Risk | Fix |
|---|---|---|
| DML element inside a Loop | Governor limit exception | Move DML outside the loop |
| Get Records inside a Loop | SOQL governor limit exception | Query before the loop |
| No fault connector on DML/email/callout element | Unhandled exception surfaced to user | Add fault path to every such element |
| Updating the triggering record in an after-save flow with no recursion guard | Infinite trigger loops | Add an entry condition or recursion guard variable |
| Looping directly on `$Record` collection | Incorrect behaviour at scale | Assign to a collection variable first, then loop |
| Process Builder still active alongside a new Flow | Double-execution, unexpected ordering | Deactivate Process Builder before activating the Flow |
| Screen Flow with no End element on all branches | Runtime error or stuck user | Ensure every branch resolves to an End element |
