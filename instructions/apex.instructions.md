---
description: 'Guidelines for building Apex applications on the Salesforce Platform'
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

### Governor Limits

- Be aware of Salesforce governor limits: SOQL queries (100), DML statements (150), heap size (6MB), CPU time (10s).
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

```apex
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

### Design Patterns

- **Service Layer Pattern**: Encapsulate business logic in service classes.
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
- Use **Platform Events** for event-driven architecture.

```apex
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
- Leverage **platform cache** to reduce database queries.
- Use **asynchronous processing** for long-running operations.
- Monitor with **Debug Logs** and **Event Monitoring**.
- Use **ApexGuru** and **Scale Center** for performance insights.

## Build and Verification

- After adding or modifying code, verify the project continues to build successfully.
- Run all relevant Apex test classes to ensure no regressions.
- Use Salesforce CLI: `sf apex run test --test-level RunLocalTests`
- Ensure code coverage meets the minimum 75% requirement (aim for 100%).
- Use Salesforce Code Analyzer to check for code quality issues: `sf code-analyzer run --severity-threshold 2`
- Review violations and address them before deployment.
