---
name: salesforce-apex-quality
description: 'Apex code quality guardrails for Salesforce development. Enforces bulk-safety rules (no SOQL/DML in loops), sharing model requirements, CRUD/FLS security, SOQL injection prevention, PNB test coverage (Positive / Negative / Bulk), and modern Apex idioms. Use this skill when reviewing or generating Apex classes, trigger handlers, batch jobs, or test classes to catch governor limit risks, security gaps, and quality issues before deployment.'
---

# Salesforce Apex Quality Guardrails

Apply these checks to every Apex class, trigger, and test file you write or review.

## Step 1 — Governor Limit Safety Check

Scan for these patterns before declaring any Apex file acceptable:

### SOQL and DML in Loops — Automatic Fail

```apex
// ❌ NEVER — causes LimitException at scale
for (Account a : accounts) {
    List<Contact> contacts = [SELECT Id FROM Contact WHERE AccountId = :a.Id]; // SOQL in loop
    update a; // DML in loop
}

// ✅ ALWAYS — collect, then query/update once
Set<Id> accountIds = new Map<Id, Account>(accounts).keySet();
Map<Id, List<Contact>> contactsByAccount = new Map<Id, List<Contact>>();
for (Contact c : [SELECT Id, AccountId FROM Contact WHERE AccountId IN :accountIds]) {
    if (!contactsByAccount.containsKey(c.AccountId)) {
        contactsByAccount.put(c.AccountId, new List<Contact>());
    }
    contactsByAccount.get(c.AccountId).add(c);
}
update accounts; // DML once, outside the loop
```

Rule: if you see `[SELECT` or `Database.query`, `insert`, `update`, `delete`, `upsert`, `merge` inside a `for` loop body — stop and refactor before proceeding.

## Step 2 — Sharing Model Verification

Every class must declare its sharing intent explicitly. Undeclared sharing inherits from the caller — unpredictable behaviour.

| Declaration | When to use |
|---|---|
| `public with sharing class Foo` | Default for all service, handler, selector, and controller classes |
| `public without sharing class Foo` | Only when the class must run elevated (e.g. system-level logging, trigger bypass). Requires a code comment explaining why. |
| `public inherited sharing class Foo` | Framework entry points that should respect the caller's sharing context |

If a class does not have one of these three declarations, **add it before writing anything else**.

## Step 3 — CRUD / FLS Enforcement

Apex code that reads or writes records on behalf of a user must verify object and field access. The platform does **not** enforce FLS or CRUD automatically in Apex.

```apex
// Check before querying a field
if (!Schema.sObjectType.Contact.fields.Email.isAccessible()) {
    throw new System.NoAccessException();
}

// Or use WITH USER_MODE in SOQL (API 56.0+)
List<Contact> contacts = [SELECT Id, Email FROM Contact WHERE AccountId = :accId WITH USER_MODE];

// Or use Database.query with AccessLevel
List<Contact> contacts = Database.query('SELECT Id, Email FROM Contact', AccessLevel.USER_MODE);
```

Rule: any Apex method callable from a UI component, REST endpoint, or `@InvocableMethod` **must** enforce CRUD/FLS. Internal service methods called only from trusted contexts may use `with sharing` instead.

## Step 4 — SOQL Injection Prevention

```apex
// ❌ NEVER — concatenates user input into SOQL string
String soql = 'SELECT Id FROM Account WHERE Name = \'' + userInput + '\'';

// ✅ ALWAYS — bind variable
String soql = [SELECT Id FROM Account WHERE Name = :userInput];

// ✅ For dynamic SOQL with user-controlled field names — validate against a whitelist
Set<String> allowedFields = new Set<String>{'Name', 'Industry', 'AnnualRevenue'};
if (!allowedFields.contains(userInput)) {
    throw new IllegalArgumentException('Field not permitted: ' + userInput);
}
```

## Step 5 — Modern Apex Idioms

Prefer current language features (API 62.0 / Winter '25+):

| Old pattern | Modern replacement |
|---|---|
| `if (obj != null) { x = obj.Field__c; }` | `x = obj?.Field__c;` |
| `x = (y != null) ? y : defaultVal;` | `x = y ?? defaultVal;` |
| `System.assertEquals(expected, actual)` | `Assert.areEqual(expected, actual)` |
| `System.assert(condition)` | `Assert.isTrue(condition)` |
| `[SELECT ... WHERE ...]` with no sharing context | `[SELECT ... WHERE ... WITH USER_MODE]` |

## Step 6 — PNB Test Coverage Checklist

Every feature must be tested across all three paths. Missing any one of these is a quality failure:

### Positive Path
- Expected input → expected output.
- Assert the exact field values, record counts, or return values — not just that no exception was thrown.

### Negative Path
- Invalid input, null values, empty collections, and error conditions.
- Assert that exceptions are thrown with the correct type and message.
- Assert that no records were mutated when the operation should have failed cleanly.

### Bulk Path
- Insert/update/delete **200–251 records** in a single test transaction.
- Assert that all records processed correctly — no partial failures from governor limits.
- Use `Test.startTest()` / `Test.stopTest()` to isolate governor limit counters for async work.

### Test Class Rules
```apex
@isTest(SeeAllData=false)   // Required — no exceptions without a documented reason
private class AccountServiceTest {

    @TestSetup
    static void makeData() {
        // Create all test data here — use a factory if one exists in the project
    }

    @isTest
    static void givenValidInput_whenProcessAccounts_thenFieldsUpdated() {
        // Positive path
        List<Account> accounts = [SELECT Id FROM Account LIMIT 10];
        Test.startTest();
        AccountService.processAccounts(accounts);
        Test.stopTest();
        // Assert meaningful outcomes — not just no exception
        List<Account> updated = [SELECT Status__c FROM Account WHERE Id IN :accounts];
        Assert.areEqual('Processed', updated[0].Status__c, 'Status should be Processed');
    }
}
```

## Step 7 — Trigger Architecture Checklist

- [ ] One trigger per object. If a second trigger exists, consolidate into the handler.
- [ ] Trigger body contains only: context checks, handler invocation, and routing logic.
- [ ] No business logic, SOQL, or DML directly in the trigger body.
- [ ] If a trigger framework (Trigger Actions Framework, ff-apex-common, custom base class) is already in use — extend it. Do not create a parallel pattern.
- [ ] Handler class is `with sharing` unless the trigger requires elevated access.

## Quick Reference — Hardcoded Anti-Patterns Summary

| Pattern | Action |
|---|---|
| SOQL inside `for` loop | Refactor: query before the loop, operate on collections |
| DML inside `for` loop | Refactor: collect mutations, DML once after the loop |
| Class missing sharing declaration | Add `with sharing` (or document why `without sharing`) |
| `escape="false"` on user data (VF) | Remove — auto-escaping enforces XSS prevention |
| Empty `catch` block | Add logging and appropriate re-throw or error handling |
| String-concatenated SOQL with user input | Replace with bind variable or whitelist validation |
| Test with no assertion | Add a meaningful `Assert.*` call |
| `System.assert` / `System.assertEquals` style | Upgrade to `Assert.isTrue` / `Assert.areEqual` |
| Hardcoded record ID (`'001...'`) | Replace with queried or inserted test record ID |
