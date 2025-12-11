---
description: 'Guidelines and best practices for Apex development on the Salesforce Platform'
applyTo: '**/*.cls, **/*.trigger'
---

# Apex Development

## General Instructions

- Always use the latest Apex features and best practices for the Salesforce Platform.
- Write clear and concise comments for each class and method, explaining the business logic and any complex operations.
- Handle edge cases and implement proper exception handling with meaningful error messages.
- Focus on bulkification - write code that handles collections of records, not single records.
- Be mindful of governor limits and design solutions that scale efficiently.
- Implement proper separation of concerns using service layers, domain classes, and selector classes.
- Document external dependencies, integration points, and their purposes in comments.

## Naming Conventions

- **Classes**: Use `PascalCase` for class names. Name classes descriptively to reflect their purpose.
  - Controllers: suffix with `Controller` (e.g., `AccountController`)
  - Trigger Handlers: suffix with `TriggerHandler` (e.g., `AccountTriggerHandler`)
  - Service Classes: suffix with `Service` (e.g., `AccountService`)
  - Selector Classes: suffix with `Selector` (e.g., `AccountSelector`)
  - Test Classes: suffix with `Test` (e.g., `AccountServiceTest`)
  - Batch Classes: suffix with `Batch` (e.g., `AccountCleanupBatch`)
  - Queueable Classes: suffix with `Queueable` (e.g., `EmailNotificationQueueable`)

- **Methods**: Use `camelCase` for method names. Use verbs to indicate actions.
  - Good: `getActiveAccounts()`, `updateContactEmail()`, `deleteExpiredRecords()`
  - Avoid abbreviations: `getAccs()` → `getAccounts()`

- **Variables**: Use `camelCase` for variable names. Use descriptive names.
  - Good: `accountList`, `emailAddress`, `totalAmount`
  - Avoid single letters except for loop counters: `a` → `account`

- **Constants**: Use `UPPER_SNAKE_CASE` for constants.
  - Good: `MAX_BATCH_SIZE`, `DEFAULT_EMAIL_TEMPLATE`, `ERROR_MESSAGE_PREFIX`

- **Triggers**: Name triggers as `ObjectName` + trigger event (e.g., `AccountTrigger`, `ContactTrigger`)

## Best Practices

### Bulkification

- **Always write bulkified code** - Design all code to handle collections of records, not individual records.
- Avoid SOQL queries and DML statements inside loops.
- Use collections (`List<>`, `Set<>`, `Map<>`) to process multiple records efficiently.

```apex
// Good Example - Bulkified
public static void updateAccountRating(List<Account> accounts) {
    for (Account acc : accounts) {
        if (acc.AnnualRevenue > 1000000) {
            acc.Rating = 'Hot';
        }
    }
    update accounts;
}

// Bad Example - Not bulkified
public static void updateAccountRating(Account account) {
    if (account.AnnualRevenue > 1000000) {
        account.Rating = 'Hot';
        update account; // DML in a method designed for single records
    }
}
```

### Maps for O(1) Lookup

- **Use Maps for efficient lookups** - Convert lists to maps for O(1) constant-time lookups instead of O(n) list iterations.
- Use `Map<Id, SObject>` constructor to quickly convert query results to a map.
- Ideal for matching related records, lookups, and avoiding nested loops.

```apex
// Good Example - Using Map for O(1) lookup
Map<Id, Account> accountMap = new Map<Id, Account>([
    SELECT Id, Name, Industry FROM Account WHERE Id IN :accountIds
]);

for (Contact con : contacts) {
    Account acc = accountMap.get(con.AccountId);
    if (acc != null) {
        con.Industry__c = acc.Industry;
    }
}

// Bad Example - Nested loop with O(n²) complexity
List<Account> accounts = [SELECT Id, Name, Industry FROM Account WHERE Id IN :accountIds];

for (Contact con : contacts) {
    for (Account acc : accounts) {
        if (con.AccountId == acc.Id) {
            con.Industry__c = acc.Industry;
            break;
        }
    }
}

// Good Example - Map for grouping records
Map<Id, List<Contact>> contactsByAccountId = new Map<Id, List<Contact>>();
for (Contact con : contacts) {
    if (!contactsByAccountId.containsKey(con.AccountId)) {
        contactsByAccountId.put(con.AccountId, new List<Contact>());
    }
    contactsByAccountId.get(con.AccountId).add(con);
}
```

### Governor Limits

- Be aware of Salesforce governor limits: SOQL queries (100), DML statements (150), heap size (6MB), CPU time (10s).
- **Monitor governor limits proactively** using `System.Limits` class to check consumption before hitting limits.
- Use efficient SOQL queries with selective filters and appropriate indexes.
- Implement **SOQL for loops** for processing large data sets.
- Use **Batch Apex** for operations on large data volumes (>50,000 records).
- Leverage **Platform Cache** to reduce redundant SOQL queries.

```apex
// Good Example - SOQL for loop for large data sets
public static void processLargeDataSet() {
    for (List<Account> accounts : [SELECT Id, Name FROM Account]) {
        // Process batch of 200 records
        processAccounts(accounts);
    }
}

// Good Example - Using WHERE clause to reduce query results
List<Account> accounts = [SELECT Id, Name FROM Account WHERE IsActive__c = true LIMIT 200];
```

### Security and Data Access

- **Always check CRUD/FLS permissions** before performing SOQL queries or DML operations.
- Use `WITH SECURITY_ENFORCED` in SOQL queries to enforce field-level security.
- Use `Security.stripInaccessible()` to remove fields the user cannot access.
- Implement `WITH SHARING` keyword for classes that enforce sharing rules.
- Use `WITHOUT SHARING` only when necessary and document the reason.
- Use `INHERITED SHARING` for utility classes to inherit the calling context.

```apex
// Good Example - Checking CRUD and using stripInaccessible
public with sharing class AccountService {
    public static List<Account> getAccounts() {
        if (!Schema.sObjectType.Account.isAccessible()) {
            throw new SecurityException('User does not have access to Account object');
        }

        List<Account> accounts = [SELECT Id, Name, Industry FROM Account WITH SECURITY_ENFORCED];

        SObjectAccessDecision decision = Security.stripInaccessible(
            AccessType.READABLE, accounts
        );

        return decision.getRecords();
    }
}

// Good Example - WITH SHARING for sharing rules
public with sharing class AccountController {
    // This class enforces record-level sharing
}
```

### Exception Handling

- Always use try-catch blocks for DML operations and callouts.
- Create custom exception classes for specific error scenarios.
- Log exceptions appropriately for debugging and monitoring.
- Provide meaningful error messages to users.

```apex
// Good Example - Proper exception handling
public class AccountService {
    public class AccountServiceException extends Exception {}

    public static void safeUpdate(List<Account> accounts) {
        try {
            if (!Schema.sObjectType.Account.isUpdateable()) {
                throw new AccountServiceException('User does not have permission to update accounts');
            }
            update accounts;
        } catch (DmlException e) {
            System.debug(LoggingLevel.ERROR, 'DML Error: ' + e.getMessage());
            throw new AccountServiceException('Failed to update accounts: ' + e.getMessage());
        }
    }
}
```

### SOQL Best Practices

- Use selective queries with indexed fields (`Id`, `Name`, `OwnerId`, custom indexed fields).
- Limit query results with `LIMIT` clause when appropriate.
- Use `LIMIT 1` when you only need one record.
- Avoid `SELECT *` - always specify required fields.
- Use relationship queries to minimize the number of SOQL queries.
- Order queries by indexed fields when possible.
- **Always use `String.escapeSingleQuotes()`** when using user input in SOQL queries to prevent SOQL injection attacks.
- **Check query selectivity** - Aim for >10% selectivity (filters reduce results to <10% of total records).
- Use **Query Plan** to verify query efficiency and index usage.
- Test queries with realistic data volumes to ensure performance.

```apex
// Good Example - Selective query with indexed fields
List<Account> accounts = [
    SELECT Id, Name, (SELECT Id, LastName FROM Contacts)
    FROM Account
    WHERE OwnerId = :UserInfo.getUserId()
    AND CreatedDate = THIS_MONTH
    LIMIT 100
];

// Good Example - LIMIT 1 for single record
Account account = [SELECT Id, Name FROM Account WHERE Name = 'Acme' LIMIT 1];

// Good Example - escapeSingleQuotes() to prevent SOQL injection
String searchTerm = String.escapeSingleQuotes(userInput);
List<Account> accounts = Database.query('SELECT Id, Name FROM Account WHERE Name LIKE \'%' + searchTerm + '%\'');

// Bad Example - Direct user input without escaping (SECURITY RISK)
List<Account> accounts = Database.query('SELECT Id, Name FROM Account WHERE Name LIKE \'%' + userInput + '%\'');

// Good Example - Selective query with indexed fields (high selectivity)
List<Account> accounts = [
    SELECT Id, Name FROM Account
    WHERE OwnerId = :UserInfo.getUserId()
    AND CreatedDate = TODAY
    LIMIT 100
];

// Bad Example - Non-selective query (scans entire table)
List<Account> accounts = [
    SELECT Id, Name FROM Account
    WHERE Description LIKE '%test%'  // Non-indexed field
];

// Check query performance in Developer Console:
// 1. Enable 'Use Query Plan' in Developer Console
// 2. Run SOQL query and review 'Query Plan' tab
// 3. Look for 'Index' usage vs 'TableScan'
// 4. Ensure selectivity > 10% for optimal performance
```

### Trigger Best Practices

- Use **one trigger per object** to maintain clarity and avoid conflicts.
- Implement trigger logic in handler classes, not directly in triggers.
- Use a trigger framework for consistent trigger management.
- Leverage trigger context variables: `Trigger.new`, `Trigger.old`, `Trigger.newMap`, `Trigger.oldMap`.
- Check trigger context: `Trigger.isBefore`, `Trigger.isAfter`, `Trigger.isInsert`, etc.

```apex
// Good Example - Trigger with handler pattern
trigger AccountTrigger on Account (before insert, before update, after insert, after update) {
    new AccountTriggerHandler().run();
}

// Handler Class
public class AccountTriggerHandler extends TriggerHandler {
    private List<Account> newAccounts;
    private List<Account> oldAccounts;
    private Map<Id, Account> newAccountMap;
    private Map<Id, Account> oldAccountMap;

    public AccountTriggerHandler() {
        this.newAccounts = (List<Account>) Trigger.new;
        this.oldAccounts = (List<Account>) Trigger.old;
        this.newAccountMap = (Map<Id, Account>) Trigger.newMap;
        this.oldAccountMap = (Map<Id, Account>) Trigger.oldMap;
    }

    public override void beforeInsert() {
        AccountService.setDefaultValues(newAccounts);
    }

    public override void afterUpdate() {
        AccountService.handleRatingChange(newAccountMap, oldAccountMap);
    }
}
```

### Code Quality Best Practices

- **Use `isEmpty()`** - Check if collections are empty using built-in methods instead of size comparisons.
- **Use Custom Labels** - Store user-facing text in Custom Labels for internationalization and maintainability.
- **Use Constants** - Define constants for hardcoded values, error messages, and configuration values.
- **Use `String.isBlank()` and `String.isNotBlank()`** - Check for null or empty strings properly.
- **Use `String.valueOf()`** - Safely convert values to strings to avoid null pointer exceptions.
- **Use safe navigation operator `?.`** - Access properties and methods safely without null pointer exceptions.
- **Use null-coalescing operator `??`** - Provide default values for null expressions.
- **Avoid using `+` for string concatenation in loops** - Use `String.join()` for better performance.
- **Use Collection methods** - Leverage `List.clone()`, `Set.addAll()`, `Map.keySet()` for cleaner code.
- **Use ternary operators** - For simple conditional assignments to improve readability.
- **Use switch expressions** - Modern alternative to if-else chains for better readability and performance.
- **Use SObject clone methods** - Properly clone SObjects when needed to avoid unintended references.

```apex
// Good Example - Switch expression (modern Apex)
String rating = switch on account.AnnualRevenue {
    when 0 { 'Cold'; }
    when 1, 2, 3 { 'Warm'; }
    when else { 'Hot'; }
};

// Good Example - Switch on SObjectType
String objectLabel = switch on record {
    when Account a { 'Account: ' + a.Name; }
    when Contact c { 'Contact: ' + c.LastName; }
    when else { 'Unknown'; }
};

// Bad Example - if-else chain
String rating;
if (account.AnnualRevenue == 0) {
    rating = 'Cold';
} else if (account.AnnualRevenue >= 1 && account.AnnualRevenue <= 3) {
    rating = 'Warm';
} else {
    rating = 'Hot';
}

// Good Example - SObject clone methods
Account original = new Account(Name = 'Acme', Industry = 'Technology');

// Shallow clone with ID and relationships
Account clone1 = original.clone(true, true);

// Shallow clone without ID or relationships
Account clone2 = original.clone(false, false);

// Deep clone with all relationships
Account clone3 = original.deepClone(true, true, true);

// Good Example - isEmpty() instead of size comparison
if (accountList.isEmpty()) {
    System.debug('No accounts found');
}

// Bad Example - size comparison
if (accountList.size() == 0) {
    System.debug('No accounts found');
}

// Good Example - Custom Labels for user-facing text
final String ERROR_MESSAGE = System.Label.Account_Update_Error;
final String SUCCESS_MESSAGE = System.Label.Account_Update_Success;

// Bad Example - Hardcoded strings
final String ERROR_MESSAGE = 'An error occurred while updating the account';

// Good Example - Constants for configuration values
public class AccountService {
    private static final Integer MAX_RETRY_ATTEMPTS = 3;
    private static final String DEFAULT_INDUSTRY = 'Technology';
    private static final String ERROR_PREFIX = 'AccountService Error: ';

    public static void processAccounts() {
        // Use constants
        if (retryCount > MAX_RETRY_ATTEMPTS) {
            throw new AccountServiceException(ERROR_PREFIX + 'Max retries exceeded');
        }
    }
}

// Good Example - isBlank() for null and empty checks
if (String.isBlank(account.Name)) {
    account.Name = DEFAULT_NAME;
}

// Bad Example - multiple null checks
if (account.Name == null || account.Name == '') {
    account.Name = DEFAULT_NAME;
}

// Good Example - String.valueOf() for safe conversion
String accountId = String.valueOf(account.Id);
String revenue = String.valueOf(account.AnnualRevenue);

// Good Example - Safe navigation operator (?.)
String ownerName = account?.Owner?.Name;
Integer contactCount = account?.Contacts?.size();

// Bad Example - Nested null checks
String ownerName;
if (account != null && account.Owner != null) {
    ownerName = account.Owner.Name;
}

// Good Example - Null-coalescing operator (??)
String accountName = account?.Name ?? 'Unknown Account';
Integer revenue = account?.AnnualRevenue ?? 0;
String industry = account?.Industry ?? DEFAULT_INDUSTRY;

// Bad Example - Ternary with null check
String accountName = account != null && account.Name != null ? account.Name : 'Unknown Account';

// Good Example - Combining ?. and ??
String email = contact?.Email ?? contact?.Account?.Owner?.Email ?? 'no-reply@example.com';

// Good Example - String concatenation in loops
List<String> accountNames = new List<String>();
for (Account acc : accounts) {
    accountNames.add(acc.Name);
}
String result = String.join(accountNames, ', ');

// Bad Example - String concatenation in loops
String result = '';
for (Account acc : accounts) {
    result += acc.Name + ', '; // Poor performance
}

// Good Example - Ternary operator
String status = isActive ? 'Active' : 'Inactive';

// Good Example - Collection methods
List<Account> accountsCopy = accountList.clone();
Set<Id> accountIds = new Set<Id>(accountMap.keySet());
```

### Recursion Prevention

- **Use static variables** to track recursive calls and prevent infinite loops.
- Implement a **circuit breaker** pattern to stop execution after a threshold.
- Document recursion limits and potential risks.

```apex
// Good Example - Recursion prevention with static variable
public class AccountTriggerHandler extends TriggerHandler {
    private static Boolean hasRun = false;

    public override void afterUpdate() {
        if (!hasRun) {
            hasRun = true;
            AccountService.updateRelatedContacts(Trigger.newMap.keySet());
        }
    }
}

// Good Example - Circuit breaker with counter
public class OpportunityService {
    private static Integer recursionCount = 0;
    private static final Integer MAX_RECURSION_DEPTH = 5;

    public static void processOpportunity(Id oppId) {
        recursionCount++;

        if (recursionCount > MAX_RECURSION_DEPTH) {
            System.debug(LoggingLevel.ERROR, 'Max recursion depth exceeded');
            return;
        }

        try {
            // Process opportunity logic
        } finally {
            recursionCount--;
        }
    }
}
```

### Method Visibility and Encapsulation

- **Use `private` by default** - Only expose methods that need to be public.
- Use `protected` for methods that subclasses need to access.
- Use `public` only for APIs that other classes need to call.
- **Use `final` keyword** to prevent method override when appropriate.
- Mark classes as `final` if they should not be extended.

```apex
// Good Example - Proper encapsulation
public class AccountService {
    // Public API
    public static void updateAccounts(List<Account> accounts) {
        validateAccounts(accounts);
        performUpdate(accounts);
    }

    // Private helper - not exposed
    private static void validateAccounts(List<Account> accounts) {
        for (Account acc : accounts) {
            if (String.isBlank(acc.Name)) {
                throw new IllegalArgumentException('Account name is required');
            }
        }
    }

    // Private implementation - not exposed
    private static void performUpdate(List<Account> accounts) {
        update accounts;
    }
}

// Good Example - Final keyword to prevent extension
public final class UtilityHelper {
    // Cannot be extended
    public static String formatCurrency(Decimal amount) {
        return '$' + amount.setScale(2);
    }
}

// Good Example - Final method to prevent override
public virtual class BaseService {
    // Can be overridden
    public virtual void process() {
        // Implementation
    }

    // Cannot be overridden
    public final void validateInput() {
        // Critical validation that must not be changed
    }
}
```

### Design Patterns

- **Service Layer Pattern**: Encapsulate business logic in service classes.
- **Circuit Breaker Pattern**: Prevent repeated failures by stopping execution after threshold.
- **Selector Pattern**: Create dedicated classes for SOQL queries.
- **Domain Layer Pattern**: Implement domain classes for record-specific logic.
- **Trigger Handler Pattern**: Use a consistent framework for trigger management.
- **Builder Pattern**: Use for complex object construction.
- **Strategy Pattern**: For implementing different behaviors based on conditions.

```apex
// Good Example - Service Layer Pattern
public class AccountService {
    public static void updateAccountRatings(Set<Id> accountIds) {
        List<Account> accounts = AccountSelector.selectByIds(accountIds);

        for (Account acc : accounts) {
            acc.Rating = calculateRating(acc);
        }

        update accounts;
    }

    private static String calculateRating(Account acc) {
        if (acc.AnnualRevenue > 1000000) {
            return 'Hot';
        } else if (acc.AnnualRevenue > 500000) {
            return 'Warm';
        }
        return 'Cold';
    }
}

// Good Example - Circuit Breaker Pattern
public class ExternalServiceCircuitBreaker {
    private static Integer failureCount = 0;
    private static final Integer FAILURE_THRESHOLD = 3;
    private static DateTime circuitOpenedTime;
    private static final Integer RETRY_TIMEOUT_MINUTES = 5;

    public static Boolean isCircuitOpen() {
        if (circuitOpenedTime != null) {
            // Check if retry timeout has passed
            if (DateTime.now() > circuitOpenedTime.addMinutes(RETRY_TIMEOUT_MINUTES)) {
                // Reset circuit
                failureCount = 0;
                circuitOpenedTime = null;
                return false;
            }
            return true;
        }
        return failureCount >= FAILURE_THRESHOLD;
    }

    public static void recordFailure() {
        failureCount++;
        if (failureCount >= FAILURE_THRESHOLD) {
            circuitOpenedTime = DateTime.now();
            System.debug(LoggingLevel.ERROR, 'Circuit breaker opened due to failures');
        }
    }

    public static void recordSuccess() {
        failureCount = 0;
        circuitOpenedTime = null;
    }

    public static HttpResponse makeCallout(String endpoint) {
        if (isCircuitOpen()) {
            throw new CircuitBreakerException('Circuit is open. Service unavailable.');
        }

        try {
            HttpRequest req = new HttpRequest();
            req.setEndpoint(endpoint);
            req.setMethod('GET');
            HttpResponse res = new Http().send(req);

            if (res.getStatusCode() == 200) {
                recordSuccess();
            } else {
                recordFailure();
            }
            return res;
        } catch (Exception e) {
            recordFailure();
            throw e;
        }
    }

    public class CircuitBreakerException extends Exception {}
}

// Good Example - Selector Pattern
public class AccountSelector {
    public static List<Account> selectByIds(Set<Id> accountIds) {
        return [
            SELECT Id, Name, AnnualRevenue, Rating
            FROM Account
            WHERE Id IN :accountIds
            WITH SECURITY_ENFORCED
        ];
    }

    public static List<Account> selectActiveAccountsWithContacts() {
        return [
            SELECT Id, Name, (SELECT Id, LastName FROM Contacts)
            FROM Account
            WHERE IsActive__c = true
            WITH SECURITY_ENFORCED
        ];
    }
}
```

### Configuration Management

#### Custom Metadata Types vs Custom Settings

- **Prefer Custom Metadata Types (CMT)** for configuration data that can be deployed.
- Use **Custom Settings** for user-specific or org-specific data that varies by environment.
- CMT is packageable, deployable, and can be used in validation rules and formulas.
- Custom Settings support hierarchy (Org, Profile, User) but are not deployable.

```apex
// Good Example - Using Custom Metadata Type
List<API_Configuration__mdt> configs = [
    SELECT Endpoint__c, Timeout__c, Max_Retries__c
    FROM API_Configuration__mdt
    WHERE DeveloperName = 'Production_API'
    LIMIT 1
];

if (!configs.isEmpty()) {
    String endpoint = configs[0].Endpoint__c;
    Integer timeout = Integer.valueOf(configs[0].Timeout__c);
}

// Good Example - Using Custom Settings (user-specific)
User_Preferences__c prefs = User_Preferences__c.getInstance(UserInfo.getUserId());
Boolean darkMode = prefs.Dark_Mode_Enabled__c;

// Good Example - Using Custom Settings (org-level)
Org_Settings__c orgSettings = Org_Settings__c.getOrgDefaults();
Integer maxRecords = Integer.valueOf(orgSettings.Max_Records_Per_Query__c);
```

#### Named Credentials and HTTP Callouts

- **Always use Named Credentials** for external API endpoints and authentication.
- Avoid hardcoding URLs, tokens, or credentials in code.
- Use `callout:NamedCredential` syntax for secure, deployable integrations.
- **Always check HTTP status codes** and handle errors gracefully.
- Set appropriate timeouts to prevent long-running callouts.
- Use `Database.AllowsCallouts` interface for Queueable and Batchable classes.

```apex
// Good Example - Using Named Credentials
public class ExternalAPIService {
    private static final String NAMED_CREDENTIAL = 'callout:External_API';
    private static final Integer TIMEOUT_MS = 120000; // 120 seconds

    public static Map<String, Object> getExternalData(String recordId) {
        HttpRequest req = new HttpRequest();
        req.setEndpoint(NAMED_CREDENTIAL + '/api/records/' + recordId);
        req.setMethod('GET');
        req.setTimeout(TIMEOUT_MS);
        req.setHeader('Content-Type', 'application/json');

        try {
            Http http = new Http();
            HttpResponse res = http.send(req);

            if (res.getStatusCode() == 200) {
                return (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
            } else if (res.getStatusCode() == 404) {
                throw new NotFoundException('Record not found: ' + recordId);
            } else if (res.getStatusCode() >= 500) {
                throw new ServiceUnavailableException('External service error: ' + res.getStatus());
            } else {
                throw new CalloutException('Unexpected response: ' + res.getStatusCode());
            }
        } catch (System.CalloutException e) {
            System.debug(LoggingLevel.ERROR, 'Callout failed: ' + e.getMessage());
            throw new ExternalAPIException('Failed to retrieve data', e);
        }
    }

    public class ExternalAPIException extends Exception {}
    public class NotFoundException extends Exception {}
    public class ServiceUnavailableException extends Exception {}
}

// Good Example - POST request with JSON body
public static String createExternalRecord(Map<String, Object> data) {
    HttpRequest req = new HttpRequest();
    req.setEndpoint(NAMED_CREDENTIAL + '/api/records');
    req.setMethod('POST');
    req.setTimeout(TIMEOUT_MS);
    req.setHeader('Content-Type', 'application/json');
    req.setBody(JSON.serialize(data));

    HttpResponse res = new Http().send(req);

    if (res.getStatusCode() == 201) {
        Map<String, Object> result = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
        return (String) result.get('id');
    } else {
        throw new CalloutException('Failed to create record: ' + res.getStatus());
    }
}
```

### Common Annotations

- `@AuraEnabled` - Expose methods to Lightning Web Components and Aura Components.
- `@AuraEnabled(cacheable=true)` - Enable client-side caching for read-only methods.
- `@InvocableMethod` - Make methods callable from Flow and Process Builder.
- `@InvocableVariable` - Define input/output parameters for invocable methods.
- `@TestVisible` - Expose private members to test classes only.
- `@SuppressWarnings('PMD.RuleName')` - Suppress specific PMD warnings.
- `@RemoteAction` - Expose methods for Visualforce JavaScript remoting (legacy).
- `@Future` - Execute methods asynchronously.
- `@Future(callout=true)` - Allow HTTP callouts in future methods.

```apex
// Good Example - AuraEnabled for LWC
public with sharing class AccountController {
    @AuraEnabled(cacheable=true)
    public static List<Account> getAccounts() {
        return [SELECT Id, Name FROM Account WITH SECURITY_ENFORCED LIMIT 10];
    }

    @AuraEnabled
    public static void updateAccount(Id accountId, String newName) {
        Account acc = new Account(Id = accountId, Name = newName);
        update acc;
    }
}

// Good Example - InvocableMethod for Flow
public class FlowActions {
    @InvocableMethod(label='Send Email Notification' description='Sends email to account owner')
    public static List<Result> sendNotification(List<Request> requests) {
        List<Result> results = new List<Result>();

        for (Request req : requests) {
            Result result = new Result();
            try {
                // Send email logic
                result.success = true;
                result.message = 'Email sent successfully';
            } catch (Exception e) {
                result.success = false;
                result.message = e.getMessage();
            }
            results.add(result);
        }
        return results;
    }

    public class Request {
        @InvocableVariable(required=true label='Account ID')
        public Id accountId;

        @InvocableVariable(label='Email Template')
        public String templateName;
    }

    public class Result {
        @InvocableVariable
        public Boolean success;

        @InvocableVariable
        public String message;
    }
}

// Good Example - TestVisible for testing private methods
public class AccountService {
    @TestVisible
    private static Boolean validateAccountName(String name) {
        return String.isNotBlank(name) && name.length() > 3;
    }
}
```

### Asynchronous Apex

- Use **@future** methods for simple asynchronous operations and callouts.
- Use **Queueable Apex** for complex asynchronous operations that require chaining.
- Use **Batch Apex** for processing large data volumes (>50,000 records).
  - Use `Database.Stateful` to maintain state across batch executions (e.g., counters, aggregations).
  - Without `Database.Stateful`, batch classes are stateless and instance variables reset between batches.
  - Be mindful of governor limits when using stateful batches.
- Use **Scheduled Apex** for recurring operations.
  - Create a separate **Schedulable class** to schedule batch jobs.
  - Never implement both `Database.Batchable` and `Schedulable` in the same class.
- Use **Platform Events** for event-driven architecture and decoupled integrations.
  - Publish events using `EventBus.publish()` for asynchronous, fire-and-forget communication.
  - Subscribe to events using triggers on platform event objects.
  - Ideal for integrations, microservices, and cross-org communication.
- **Optimize batch size** based on processing complexity and governor limits.
  - Default batch size is 200, but can be adjusted from 1 to 2000.
  - Smaller batches (50-100) for complex processing or callouts.
  - Larger batches (200) for simple DML operations.
  - Test with realistic data volumes to find optimal size.

```apex
// Good Example - Platform Events for decoupled communication
public class OrderEventPublisher {
    public static void publishOrderCreated(List<Order> orders) {
        List<Order_Created__e> events = new List<Order_Created__e>();

        for (Order ord : orders) {
            Order_Created__e event = new Order_Created__e(
                Order_Id__c = ord.Id,
                Order_Amount__c = ord.TotalAmount,
                Customer_Id__c = ord.AccountId
            );
            events.add(event);
        }

        // Publish events
        List<Database.SaveResult> results = EventBus.publish(events);

        // Check for errors
        for (Database.SaveResult result : results) {
            if (!result.isSuccess()) {
                for (Database.Error error : result.getErrors()) {
                    System.debug('Error publishing event: ' + error.getMessage());
                }
            }
        }
    }
}

// Good Example - Platform Event Trigger (Subscriber)
trigger OrderCreatedTrigger on Order_Created__e (after insert) {
    List<Task> tasksToCreate = new List<Task>();

    for (Order_Created__e event : Trigger.new) {
        Task t = new Task(
            Subject = 'Follow up on order',
            WhatId = event.Order_Id__c,
            Priority = 'High'
        );
        tasksToCreate.add(t);
    }

    if (!tasksToCreate.isEmpty()) {
        insert tasksToCreate;
    }
}

// Good Example - Batch size optimization based on complexity
public class ComplexProcessingBatch implements Database.Batchable<SObject>, Database.AllowsCallouts {
    public Database.QueryLocator start(Database.BatchableContext bc) {
        return Database.getQueryLocator([
            SELECT Id, Name FROM Account WHERE IsActive__c = true
        ]);
    }

    public void execute(Database.BatchableContext bc, List<Account> scope) {
        // Complex processing with callouts - use smaller batch size
        for (Account acc : scope) {
            // Make HTTP callout
            HttpResponse res = ExternalAPIService.getAccountData(acc.Id);
            // Process response
        }
    }

    public void finish(Database.BatchableContext bc) {
        System.debug('Batch completed');
    }
}

// Execute with smaller batch size for callout-heavy processing
Database.executeBatch(new ComplexProcessingBatch(), 50);

// Good Example - Simple DML batch with default size
public class SimpleDMLBatch implements Database.Batchable<SObject> {
    public Database.QueryLocator start(Database.BatchableContext bc) {
        return Database.getQueryLocator([
            SELECT Id, Status__c FROM Order WHERE Status__c = 'Draft'
        ]);
    }

    public void execute(Database.BatchableContext bc, List<Order> scope) {
        for (Order ord : scope) {
            ord.Status__c = 'Pending';
        }
        update scope;
    }

    public void finish(Database.BatchableContext bc) {
        System.debug('Batch completed');
    }
}

// Execute with larger batch size for simple DML
Database.executeBatch(new SimpleDMLBatch(), 200);

// Good Example - Queueable Apex
public class EmailNotificationQueueable implements Queueable, Database.AllowsCallouts {
    private List<Id> accountIds;

    public EmailNotificationQueueable(List<Id> accountIds) {
        this.accountIds = accountIds;
    }

    public void execute(QueueableContext context) {
        List<Account> accounts = [SELECT Id, Name, Email__c FROM Account WHERE Id IN :accountIds];

        for (Account acc : accounts) {
            sendEmail(acc);
        }

        // Chain another job if needed
        if (hasMoreWork()) {
            System.enqueueJob(new AnotherQueueable());
        }
    }

    private void sendEmail(Account acc) {
        // Email sending logic
    }

    private Boolean hasMoreWork() {
        return false;
    }
}

// Good Example - Stateless Batch Apex (default)
public class AccountCleanupBatch implements Database.Batchable<SObject> {
    public Database.QueryLocator start(Database.BatchableContext bc) {
        return Database.getQueryLocator([
            SELECT Id, Name FROM Account WHERE LastActivityDate < LAST_N_DAYS:365
        ]);
    }

    public void execute(Database.BatchableContext bc, List<Account> scope) {
        delete scope;
    }

    public void finish(Database.BatchableContext bc) {
        System.debug('Batch completed');
    }
}

// Good Example - Stateful Batch Apex (maintains state across batches)
public class AccountStatsBatch implements Database.Batchable<SObject>, Database.Stateful {
    private Integer recordsProcessed = 0;
    private Integer totalRevenue = 0;

    public Database.QueryLocator start(Database.BatchableContext bc) {
        return Database.getQueryLocator([
            SELECT Id, Name, AnnualRevenue FROM Account WHERE IsActive__c = true
        ]);
    }

    public void execute(Database.BatchableContext bc, List<Account> scope) {
        for (Account acc : scope) {
            recordsProcessed++;
            totalRevenue += (Integer) acc.AnnualRevenue;
        }
    }

    public void finish(Database.BatchableContext bc) {
        // State is maintained: recordsProcessed and totalRevenue retain their values
        System.debug('Total records processed: ' + recordsProcessed);
        System.debug('Total revenue: ' + totalRevenue);

        // Send summary email or create summary record
    }
}

// Good Example - Schedulable class to schedule a batch
public class AccountCleanupScheduler implements Schedulable {
    public void execute(SchedulableContext sc) {
        // Execute the batch with batch size of 200
        Database.executeBatch(new AccountCleanupBatch(), 200);
    }
}

// Schedule the batch to run daily at 2 AM
// Execute this in Anonymous Apex or in setup code:
// String cronExp = '0 0 2 * * ?';
// System.schedule('Daily Account Cleanup', cronExp, new AccountCleanupScheduler());
```

## Testing

- **Always achieve 100% code coverage** for production code (minimum 75% required).
- Write **meaningful tests** that verify business logic, not just code coverage.
- Use `@TestSetup` methods to create test data shared across test methods.
- Use `Test.startTest()` and `Test.stopTest()` to reset governor limits.
- Test **positive scenarios**, **negative scenarios**, and **bulk scenarios** (200+ records).
- Use `System.runAs()` to test different user contexts and permissions.
- Mock external callouts using `Test.setMock()`.
- Never use `@SeeAllData=true` - always create test data in tests.
- **Use the `Assert` class methods** for assertions instead of deprecated `System.assert*()` methods.
- Always add descriptive failure messages to assertions for clarity.

```apex
// Good Example - Comprehensive test class
@IsTest
private class AccountServiceTest {
    @TestSetup
    static void setupTestData() {
        List<Account> accounts = new List<Account>();
        for (Integer i = 0; i < 200; i++) {
            accounts.add(new Account(
                Name = 'Test Account ' + i,
                AnnualRevenue = i * 10000
            ));
        }
        insert accounts;
    }

    @IsTest
    static void testUpdateAccountRatings_Positive() {
        // Arrange
        List<Account> accounts = [SELECT Id FROM Account];
        Set<Id> accountIds = new Map<Id, Account>(accounts).keySet();

        // Act
        Test.startTest();
        AccountService.updateAccountRatings(accountIds);
        Test.stopTest();

        // Assert
        List<Account> updatedAccounts = [
            SELECT Id, Rating FROM Account WHERE AnnualRevenue > 1000000
        ];
        for (Account acc : updatedAccounts) {
            Assert.areEqual('Hot', acc.Rating, 'Rating should be Hot for high revenue accounts');
        }
    }

    @IsTest
    static void testUpdateAccountRatings_NoAccess() {
        // Create user with limited access
        User testUser = createTestUser();

        List<Account> accounts = [SELECT Id FROM Account LIMIT 1];
        Set<Id> accountIds = new Map<Id, Account>(accounts).keySet();

        Test.startTest();
        System.runAs(testUser) {
            try {
                AccountService.updateAccountRatings(accountIds);
                Assert.fail('Expected SecurityException');
            } catch (SecurityException e) {
                Assert.isTrue(true, 'SecurityException thrown as expected');
            }
        }
        Test.stopTest();
    }

    @IsTest
    static void testBulkOperation() {
        List<Account> accounts = [SELECT Id FROM Account];
        Set<Id> accountIds = new Map<Id, Account>(accounts).keySet();

        Test.startTest();
        AccountService.updateAccountRatings(accountIds);
        Test.stopTest();

        List<Account> updatedAccounts = [SELECT Id, Rating FROM Account];
        Assert.areEqual(200, updatedAccounts.size(), 'All accounts should be processed');
    }

    private static User createTestUser() {
        Profile p = [SELECT Id FROM Profile WHERE Name = 'Standard User' LIMIT 1];
        return new User(
            Alias = 'testuser',
            Email = 'testuser@test.com',
            EmailEncodingKey = 'UTF-8',
            LastName = 'Testing',
            LanguageLocaleKey = 'en_US',
            LocaleSidKey = 'en_US',
            ProfileId = p.Id,
            TimeZoneSidKey = 'America/Los_Angeles',
            UserName = 'testuser' + DateTime.now().getTime() + '@test.com'
        );
    }
}
```

## Common Code Smells and Anti-Patterns

- **DML/SOQL in loops** - Always bulkify your code to avoid governor limit exceptions.
- **Hardcoded IDs** - Use custom settings, custom metadata, or dynamic queries instead.
- **Deeply nested conditionals** - Extract logic into separate methods for clarity.
- **Large methods** - Keep methods focused on a single responsibility (max 30-50 lines).
- **Magic numbers** - Use named constants for clarity and maintainability.
- **Duplicate code** - Extract common logic into reusable methods or classes.
- **Missing null checks** - Always validate input parameters and query results.

```apex
// Bad Example - DML in loop
for (Account acc : accounts) {
    acc.Rating = 'Hot';
    update acc; // AVOID: DML in loop
}

// Good Example - Bulkified DML
for (Account acc : accounts) {
    acc.Rating = 'Hot';
}
update accounts;

// Bad Example - Hardcoded ID
Account acc = [SELECT Id FROM Account WHERE Id = '001000000000001'];

// Good Example - Dynamic query
Account acc = [SELECT Id FROM Account WHERE Name = :accountName LIMIT 1];

// Bad Example - Magic number
if (accounts.size() > 200) {
    // Process
}

// Good Example - Named constant
private static final Integer MAX_BATCH_SIZE = 200;
if (accounts.size() > MAX_BATCH_SIZE) {
    // Process
}
```

## Documentation and Comments

- Use JavaDoc-style comments for classes and methods.
- Include `@author` and `@date` tags for tracking.
- Include `@description`, `@param`, `@return`, and `@throws` tags.
- Include `@param`, `@return`, and `@throws` tags **only** when applicable.
- Do not use `@return void` for methods that return nothing.
- Document complex business logic and design decisions.
- Keep comments up-to-date with code changes.

```apex
/**
 * @author Your Name
 * @date 2025-01-01
 * @description Service class for managing Account records
 */
public with sharing class AccountService {

    /**
     * @author Your Name
     * @date 2025-01-01
     * @description Updates the rating for accounts based on annual revenue
     * @param accountIds Set of Account IDs to update
     * @throws AccountServiceException if user lacks update permissions
     */
    public static void updateAccountRatings(Set<Id> accountIds) {
        // Implementation
    }
}
```

## Deployment and DevOps

- Use **Salesforce CLI** for source-driven development.
- Leverage **scratch orgs** for development and testing.
- Implement **CI/CD pipelines** using tools like Salesforce CLI, GitHub Actions, or Jenkins.
- Use **unlocked packages** for modular deployments.
- Run **Apex tests** as part of deployment validation.
- Use **Salesforce Code Analyzer** to scan code for quality and security issues.

```bash
# Salesforce CLI commands (sf)
sf project deploy start                    # Deploy source to org
sf project deploy start --dry-run          # Validate deployment without deploying
sf apex run test --test-level RunLocalTests # Run local Apex tests
sf apex get test --test-run-id <id>        # Get test results
sf project retrieve start                  # Retrieve source from org

# Salesforce Code Analyzer commands
sf code-analyzer rules                     # List all available rules
sf code-analyzer rules --rule-selector eslint:Recommended  # List recommended ESLint rules
sf code-analyzer rules --workspace ./force-app             # List rules for specific workspace
sf code-analyzer run                       # Run analysis with recommended rules
sf code-analyzer run --rule-selector pmd:Recommended       # Run PMD recommended rules
sf code-analyzer run --rule-selector "Security"           # Run rules with Security tag
sf code-analyzer run --workspace ./force-app --target "**/*.cls"  # Analyze Apex classes
sf code-analyzer run --severity-threshold 3               # Run analysis with severity threshold
sf code-analyzer run --output-file results.html           # Output results to HTML file
sf code-analyzer run --output-file results.csv            # Output results to CSV file
sf code-analyzer run --view detail                        # Show detailed violation information
```

## Performance Optimization

- Use **selective SOQL queries** with indexed fields.
- Implement **lazy loading** for expensive operations.
- Use **asynchronous processing** for long-running operations.
- Monitor with **Debug Logs** and **Event Monitoring**.
- Use **ApexGuru** and **Scale Center** for performance insights.

### Platform Cache

- Use **Platform Cache** to store frequently accessed data and reduce SOQL queries.
- `Cache.OrgPartition` - Shared across all users and sessions in the org.
- `Cache.SessionPartition` - Specific to a user's session.
- Implement proper cache invalidation strategies.
- Handle cache misses gracefully with fallback to database queries.

```apex
// Good Example - Using Org Cache
public class AccountCacheService {
    private static final String CACHE_PARTITION = 'local.AccountCache';
    private static final Integer TTL_SECONDS = 3600; // 1 hour

    public static Account getAccount(Id accountId) {
        Cache.OrgPartition orgPart = Cache.Org.getPartition(CACHE_PARTITION);
        String cacheKey = 'Account_' + accountId;

        // Try to get from cache
        Account acc = (Account) orgPart.get(cacheKey);

        if (acc == null) {
            // Cache miss - query database
            acc = [
                SELECT Id, Name, Industry, AnnualRevenue
                FROM Account
                WHERE Id = :accountId
                LIMIT 1
            ];

            // Store in cache with TTL
            orgPart.put(cacheKey, acc, TTL_SECONDS);
        }

        return acc;
    }

    public static void invalidateCache(Id accountId) {
        Cache.OrgPartition orgPart = Cache.Org.getPartition(CACHE_PARTITION);
        String cacheKey = 'Account_' + accountId;
        orgPart.remove(cacheKey);
    }
}

// Good Example - Using Session Cache
public class UserPreferenceCache {
    private static final String CACHE_PARTITION = 'local.UserPrefs';

    public static Map<String, Object> getUserPreferences() {
        Cache.SessionPartition sessionPart = Cache.Session.getPartition(CACHE_PARTITION);
        String cacheKey = 'UserPrefs_' + UserInfo.getUserId();

        Map<String, Object> prefs = (Map<String, Object>) sessionPart.get(cacheKey);

        if (prefs == null) {
            // Load preferences from database or custom settings
            prefs = new Map<String, Object>{
                'theme' => 'dark',
                'language' => 'en_US'
            };
            sessionPart.put(cacheKey, prefs);
        }

        return prefs;
    }
}
```

## Build and Verification

- After adding or modifying code, verify the project continues to build successfully.
- Run all relevant Apex test classes to ensure no regressions.
- Use Salesforce CLI: `sf apex run test --test-level RunLocalTests`
- Ensure code coverage meets the minimum 75% requirement (aim for 100%).
- Use Salesforce Code Analyzer to check for code quality issues: `sf code-analyzer run --severity-threshold 2`
- Review violations and address them before deployment.
