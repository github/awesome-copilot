---
name: salesforce-component-standards
description: 'Quality standards for Salesforce Lightning Web Components (LWC), Aura components, and Visualforce pages. Covers SLDS 2 compliance, accessibility (WCAG 2.1 AA), data access pattern selection, component communication rules, XSS prevention, CSRF enforcement, FLS/CRUD in AuraEnabled methods, view state management, and Jest test requirements. Use this skill when building or reviewing any Salesforce UI component to enforce platform-specific security and quality standards.'
---

# Salesforce Component Quality Standards

Apply these checks to every LWC, Aura component, and Visualforce page you write or review.

## Section 1 — LWC Quality Standards

### 1.1 Data Access Pattern Selection

Choose the right data access pattern before writing JavaScript controller code:

| Use case | Pattern | Why |
|---|---|---|
| Read a single record reactively (follows navigation) | `@wire(getRecord, { recordId, fields })` | Lightning Data Service — cached, reactive |
| Standard CRUD form for a single object | `<lightning-record-form>` or `<lightning-record-edit-form>` | Built-in FLS, CRUD, and accessibility |
| Complex server query or filtered list | `@wire(apexMethodName, { param })` on a `cacheable=true` method | Allows caching; wire re-fires on param change |
| User-triggered action, DML, or non-cacheable server call | Imperative `apexMethodName(params).then(...).catch(...)` | Required for DML — wired methods cannot be `@AuraEnabled` without `cacheable=true` |
| Cross-component communication (no shared parent) | Lightning Message Service (LMS) | Decoupled, works across DOM boundaries |
| Multi-object graph relationships | GraphQL `@wire(gql, { query, variables })` | Single round-trip for complex related data |

### 1.2 Security Rules

| Rule | Enforcement |
|---|---|
| No raw user data in `innerHTML` | Use `{expression}` binding in the template — the framework auto-escapes. Never use `this.template.querySelector('.el').innerHTML = userValue` |
| Apex `@AuraEnabled` methods enforce CRUD/FLS | Use `WITH USER_MODE` in SOQL or explicit `Schema.sObjectType` checks |
| No hardcoded org-specific IDs in component JavaScript | Query or pass as a prop — never embed record IDs in source |
| `@api` properties from parent: validate before use | A parent can pass anything — validate type and range before using as a query parameter |

### 1.3 SLDS 2 and Styling Standards

- **Never** hardcode colours: `color: #FF3366` → use `color: var(--slds-c-button-brand-color-background)` or a semantic SLDS token.
- **Never** override SLDS classes with `!important` — compose with custom CSS properties.
- Use `<lightning-*>` base components wherever they exist: `lightning-button`, `lightning-input`, `lightning-datatable`, `lightning-card`, etc.
- Base components include built-in SLDS 2, dark mode, and accessibility — avoid reimplementing their behaviour.
- If using custom CSS, test in both **light mode** and **dark mode** before declaring done.

### 1.4 Accessibility Requirements (WCAG 2.1 AA)

Every LWC component must pass all of these before it is considered done:

- [ ] All form inputs have `<label>` or `aria-label` — never use placeholder as the only label
- [ ] All icon-only buttons have `alternative-text` or `aria-label` describing the action
- [ ] All interactive elements are reachable and operable by keyboard (Tab, Enter, Space, Escape)
- [ ] Colour is not the only means of conveying status — pair with text, icon, or `aria-*` attributes
- [ ] Error messages are associated with their input via `aria-describedby`
- [ ] Focus management is correct in modals — focus moves into the modal on open and back on close

### 1.5 Component Communication Rules

| Direction | Mechanism |
|---|---|
| Parent → Child | `@api` property or calling a `@api` method |
| Child → Parent | `CustomEvent` — `this.dispatchEvent(new CustomEvent('eventname', { detail: data }))` |
| Sibling / unrelated components | Lightning Message Service (LMS) |
| Never use | `document.querySelector`, `window.*`, or Pub/Sub libraries |

For Flow screen components:
- Events that need to reach the Flow runtime must set `bubbles: true` and `composed: true`.
- Expose `@api value` for two-way binding with the Flow variable.

### 1.6 JavaScript Performance Rules

- **No side effects in `connectedCallback`**: it runs on every DOM attach — avoid DML, heavy computation, or rendering state mutations here.
- **Guard `renderedCallback`**: always use a boolean guard to prevent infinite render loops.
- **Avoid reactive property traps**: setting a reactive property inside `renderedCallback` causes a re-render — use it only when necessary and guarded.
- **Do not store large datasets in component state** — paginate or stream large results instead.

### 1.7 Jest Test Requirements

Every component that handles user interaction or retrieves Apex data must have a Jest test:

```javascript
// Minimum test coverage expectations
it('renders the component with correct title', async () => { ... });
it('calls apex method and displays results', async () => { ... });  // Wire mock
it('dispatches event when button is clicked', async () => { ... });
it('shows error state when apex call fails', async () => { ... }); // Error path
```

Use `@salesforce/sfdx-lwc-jest` mocking utilities:
- `wire` adapter mocking: `setImmediate` + `emit({ data, error })`
- Apex method mocking: `jest.mock('@salesforce/apex/MyClass.myMethod', ...)`

---

## Section 2 — Aura Component Standards

### 2.1 When to Use Aura vs LWC

- **New components: always LWC** unless the target context is Aura-only (e.g. extending `force:appPage`, using Aura-specific events in a legacy managed package).
- **Migrating Aura to LWC**: prefer LWC, migrate component-by-component; LWC can be embedded inside Aura components.

### 2.2 Aura Security Rules

- `@AuraEnabled` controller methods must declare `with sharing` and enforce CRUD/FLS — Aura does **not** enforce them automatically.
- Never use `{!v.something}` with unescaped user data in `<div>` unbound helpers — use `<ui:outputText value="{!v.text}" />` or `<c:something>` to escape.
- Validate all inputs from component attributes before using them in SOQL / Apex logic.

### 2.3 Aura Event Design

- **Component events** for parent-child communication — lowest scope.
- **Application events** only when component events cannot reach the target — they broadcast to the entire app and can be a performance and maintenance problem.
- For hybrid LWC + Aura stacks: use Lightning Message Service to decouple communication — do not rely on Aura application events reaching LWC components.

---

## Section 3 — Visualforce Security Standards

### 3.1 XSS Prevention

```xml
<!-- ❌ NEVER — renders raw user input as HTML -->
<apex:outputText value="{!userInput}" escape="false" />

<!-- ✅ ALWAYS — auto-escaping on -->
<apex:outputText value="{!userInput}" />
<!-- Default escape="true" — platform HTML-encodes the output -->
```

Rule: `escape="false"` is never acceptable for user-controlled data. If rich text must be rendered, sanitise server-side with a whitelist before output.

### 3.2 CSRF Protection

Use `<apex:form>` for all postback actions — the platform injects a CSRF token automatically into the form. Do **not** use raw `<form method="POST">` HTML elements, which bypass CSRF protection.

### 3.3 SOQL Injection Prevention in Controllers

```apex
// ❌ NEVER
String soql = 'SELECT Id FROM Account WHERE Name = \'' + ApexPages.currentPage().getParameters().get('name') + '\'';
List<Account> results = Database.query(soql);

// ✅ ALWAYS — bind variable
String nameParam = ApexPages.currentPage().getParameters().get('name');
List<Account> results = [SELECT Id FROM Account WHERE Name = :nameParam];
```

### 3.4 View State Management Checklist

- [ ] View state is under 135 KB (check in browser developer tools or the Salesforce View State tab)
- [ ] Fields used only for server-side calculations are declared `transient`
- [ ] Large collections are not persisted across postbacks unnecessarily
- [ ] `readonly="true"` is set on `<apex:page>` for read-only pages to skip view-state serialisation

### 3.5 FLS / CRUD in Visualforce Controllers

```apex
// Before reading a field
if (!Schema.sObjectType.Account.fields.Revenue__c.isAccessible()) {
    ApexPages.addMessage(new ApexPages.Message(ApexPages.Severity.ERROR, 'You do not have access to this field.'));
    return null;
}

// Before performing DML
if (!Schema.sObjectType.Account.isDeletable()) {
    throw new System.NoAccessException();
}
```

Standard controllers enforce FLS for bound fields automatically. **Custom controllers do not** — FLS must be enforced manually.

---

## Quick Reference — Component Anti-Patterns Summary

| Anti-pattern | Technology | Risk | Fix |
|---|---|---|---|
| `innerHTML` with user data | LWC | XSS | Use template bindings `{expression}` |
| Hardcoded hex colours | LWC/Aura | Dark-mode / SLDS 2 break | Use SLDS CSS custom properties |
| Missing `aria-label` on icon buttons | LWC/Aura/VF | Accessibility failure | Add `alternative-text` or `aria-label` |
| No guard in `renderedCallback` | LWC | Infinite rerender loop | Add `hasRendered` boolean guard |
| Application event for parent-child | Aura | Unnecessary broadcast scope | Use component event instead |
| `escape="false"` on user data | Visualforce | XSS | Remove — use default escaping |
| Raw `<form>` postback | Visualforce | CSRF vulnerability | Use `<apex:form>` |
| No `with sharing` on custom controller | VF / Apex | Data exposure | Add `with sharing` declaration |
| FLS not checked in custom controller | VF / Apex | Privilege escalation | Add `Schema.sObjectType` checks |
| SOQL concatenated with URL param | VF / Apex | SOQL injection | Use bind variables |
