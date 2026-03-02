---
title: 'Before/After Customization Examples'
description: 'See real-world transformations showing how custom agents, skills, and instructions dramatically improve GitHub Copilot effectiveness.'
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: '2025-12-12'
estimatedReadingTime: '12 minutes'
tags:
  - customization
  - examples
  - fundamentals
  - best-practices
relatedArticles:
  - ./what-are-agents-skills-instructions.md
  - ./creating-effective-skills.md
  - ./defining-custom-instructions.md
---

The power of GitHub Copilot customization becomes clear when you see concrete examples of how agents, skills, and instructions transform everyday development workflows. This article presents real-world scenarios showing the dramatic difference between default Copilot behavior and customized experiences that align with your team's standards, tools, and practices.

> Note: The following examples illustrate typical before-and-after scenarios. The actual before and after code may vary depending on the model used and any other context present at generation time.

## Example 1: API Client Code Generation

### Before: Generic API Code

Without customization, GitHub Copilot generates generic HTTP request code that may not follow your team's patterns:

```typescript
// user-api.ts
async function getUser(userId: string) {
  // Default Copilot suggestion
  const response = await fetch(`https://api.example.com/users/${userId}`);
  const data = await response.json();
  return data;
}
```

**Problems**:
- No error handling or retry logic
- Doesn't use existing HTTP client utilities
- Missing type safety
- No logging or telemetry
- Hardcoded base URL

### After: With Custom Instructions

Create `.github/instructions/typescript-api.md`:

````markdown
---
description: 'API client patterns for our application'
applyTo: '**/*-api.ts, **/services/**/*.ts'
---

When generating API client code:
- Always use the HttpClient class from `@/lib/http-client`
- Include proper TypeScript types for request/response
- Add structured error handling with our ApiError class
- Include retry logic for transient failures
- Use environment-based configuration for base URLs
- Add telemetry using our logger utility
- Never hardcode API endpoints

Example pattern:
```typescript
import { httpClient } from '@/lib/http-client';
import { ApiError } from '@/lib/errors';
import { logger } from '@/lib/logger';

async function fetchResource<T>(endpoint: string): Promise<T> {
  try {
    const response = await httpClient.get<T>(endpoint);
    logger.debug('API call successful', { endpoint });
    return response.data;
  } catch (error) {
    logger.error('API call failed', { endpoint, error });
    throw new ApiError('Failed to fetch resource', error);
  }
}
```
````

Now Copilot generates code aligned with your team's patterns:

```typescript
// user-api.ts
import { httpClient } from '@/lib/http-client';
import { ApiError } from '@/lib/errors';
import { logger } from '@/lib/logger';

interface User {
  id: string;
  name: string;
  email: string;
}

async function getUser(userId: string): Promise<User> {
  try {
    const response = await httpClient.get<User>(`/users/${userId}`);
    logger.debug('User fetched successfully', { userId });
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch user', { userId, error });
    throw new ApiError('Unable to retrieve user data', error);
  }
}
```

**Benefits**:
- Automatically uses your team's HTTP client
- Includes proper error handling and logging
- Type-safe with your interfaces
- Follows team conventions consistently
- No manual corrections needed

## Example 2: Test Generation

### Before: Basic Test Structure

Default Copilot test suggestions are often generic and miss project-specific patterns:

```typescript
// user-service.test.ts
import { UserService } from './user-service';

describe('UserService', () => {
  it('should get user by id', async () => {
    const service = new UserService();
    const user = await service.getUserById('123');
    expect(user).toBeDefined();
  });
});
```

**Problems**:
- No test fixtures or factories
- Missing setup/teardown
- Doesn't use testing utilities
- No mocking strategy
- Incomplete assertions

### After: With Custom Testing Skill

Create a skill folder `.github/skills/generate-tests/` with a `SKILL.md`:

````markdown
---
name: generate-tests
description: 'Generate comprehensive test suites using our testing patterns, including fixtures, setup/teardown, and thorough assertions'
---

# generate-tests

Generate a comprehensive test suite for the selected code following these patterns:

**Setup Requirements**:
- Use our test factory functions from `@/test/factories`
- Set up database transactions with `setupTestDb()` and `cleanupTestDb()`
- Mock external services using our mock utilities from `@/test/mocks`

**Test Structure**:
- Group related tests in `describe` blocks
- Use descriptive test names that explain behavior: "should [action] when [condition]"
- Include setup/teardown in `beforeEach`/`afterEach`
- Test happy path, edge cases, and error scenarios

**Assertions**:
- Use specific assertions, not just `.toBeDefined()`
- Verify all relevant properties of returned objects
- Check error messages and types for failure cases
- Assert side effects (database changes, API calls, events)

See [references/test-patterns.md](references/test-patterns.md) for standard patterns and [templates/test-template.ts](templates/test-template.ts) for a starter structure.

**Example Pattern**:
```typescript
import { setupTestDb, cleanupTestDb } from '@/test/setup';
import { createUser, createPost } from '@/test/factories';
import { mockApiClient } from '@/test/mocks';

describe('UserService', () => {
  beforeEach(async () => {
    await setupTestDb();
  });

  afterEach(async () => {
    await cleanupTestDb();
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const user = await createUser({ name: 'Alice' });
      const service = new UserService();
      
      const result = await service.getUserById(user.id);
      
      expect(result).toEqual({
        id: user.id,
        name: 'Alice',
        email: expect.any(String)
      });
    });

    it('should throw NotFoundError when user does not exist', async () => {
      const service = new UserService();
      
      await expect(service.getUserById('nonexistent'))
        .rejects.toThrow(NotFoundError);
    });
  });
});
```

Generate tests following this pattern for the selected code.
````

Now when you select code and use `/generate-tests`, or when an agent detects a testing need, Copilot produces comprehensive test suites:

```typescript
// user-service.test.ts
import { setupTestDb, cleanupTestDb } from '@/test/setup';
import { createUser, createPost } from '@/test/factories';
import { mockApiClient } from '@/test/mocks';
import { UserService } from './user-service';
import { NotFoundError } from '@/lib/errors';

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    await setupTestDb();
    service = new UserService();
  });

  afterEach(async () => {
    await cleanupTestDb();
  });

  describe('getUserById', () => {
    it('should return user with all properties when found', async () => {
      const user = await createUser({ 
        name: 'Alice Johnson',
        email: 'alice@example.com'
      });
      
      const result = await service.getUserById(user.id);
      
      expect(result).toEqual({
        id: user.id,
        name: 'Alice Johnson',
        email: 'alice@example.com',
        createdAt: expect.any(Date)
      });
    });

    it('should throw NotFoundError when user does not exist', async () => {
      await expect(service.getUserById('nonexistent-id'))
        .rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError with correct message', async () => {
      await expect(service.getUserById('invalid'))
        .rejects.toThrow('User not found');
    });
  });

  describe('getUserPosts', () => {
    it('should return all posts for a user', async () => {
      const user = await createUser();
      const post1 = await createPost({ userId: user.id, title: 'First Post' });
      const post2 = await createPost({ userId: user.id, title: 'Second Post' });
      
      const result = await service.getUserPosts(user.id);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ title: 'First Post' });
      expect(result[1]).toMatchObject({ title: 'Second Post' });
    });

    it('should return empty array when user has no posts', async () => {
      const user = await createUser();
      
      const result = await service.getUserPosts(user.id);
      
      expect(result).toEqual([]);
    });
  });
});
```

**Benefits**:
- Richer test coverage including edge cases
- Uses team's testing utilities and patterns
- Proper setup/teardown
- Comprehensive assertions
- Ready to run without modifications

## Example 3: Infrastructure as Code with Terraform

### Before: Basic Terraform Resources

Default suggestions lack organization, security best practices, and team conventions:

```hcl
# main.tf
resource "azurerm_resource_group" "rg" {
  name     = "my-rg"
  location = "eastus"
}

resource "azurerm_storage_account" "data" {
  name                     = "mystorage"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  # Defaults used; public network access allowed
}
```

**Problems**:
- No consistent naming aligned to Azure conventions
- Missing tags
- Public network access not blocked; no private endpoint or network rules
- No diagnostic settings for auditing
- Hardcoded values without variables

### After: With Terraform Custom Agent

Use a custom agent from the repository [`agents/terraform-azure-implement.agent.md`](https://github.com/github/awesome-copilot/blob/main/agents/terraform-azure-implement.agent.md) (click through to see full definition).

Now Copilot has access to a custom agent that enforces your organization's Terraform best practices for Azure.

```hcl
# storage.tf
# Azure Storage Account for application data with secure networking and diagnostics

locals {
  storage_account_name = lower(replace("${var.environment}-${var.project_name}-st-app-data", "-", ""))

  common_tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
    Owner       = var.owner_team
    CostCenter  = var.cost_center
  }
}

resource "azurerm_resource_group" "rg" {
  name     = "${var.environment}-${var.project_name}-rg"
  location = var.location

  tags = merge(local.common_tags, { Name = "${var.environment}-${var.project_name}-rg" })
}

resource "azurerm_storage_account" "app_data" {
  name                     = local.storage_account_name
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "ZRS"
  min_tls_version          = "TLS1_2"
  public_network_access_enabled = false

  tags = merge(local.common_tags, {
    Name        = local.storage_account_name
    Description = "Application data storage account"
  })
}

resource "azurerm_log_analytics_workspace" "law" {
  name                = "${var.environment}-${var.project_name}-law"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  sku                 = "PerGB2018"
  retention_in_days   = 30

  tags = local.common_tags
}

resource "azurerm_monitor_diagnostic_setting" "sa_diagnostics" {
  name                           = "${local.storage_account_name}-diag"
  target_resource_id             = azurerm_storage_account.app_data.id
  log_analytics_workspace_id     = azurerm_log_analytics_workspace.law.id

  enabled_log {
    category = "StorageRead"
  }

  enabled_log {
    category = "StorageWrite"
  }

  enabled_log {
    category = "StorageDelete"
  }

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}

output "storage_account_name" {
  description = "Name of the application data Storage Account"
  value       = azurerm_storage_account.app_data.name
}

output "storage_account_id" {
  description = "ID of the application data Storage Account"
  value       = azurerm_storage_account.app_data.id
}
```

**Benefits**:
- Secure-by-default configuration (encryption at rest, TLS 1.2+)
- Follows Azure naming and tagging conventions
- Public access blocked with diagnostics enabled
- Clean separation of resources and outputs
- Ready to extend with private endpoints and CMK if required

## Example 4: Code Review Comments

### Before: Manual Review Process

Developers manually review pull requests and write comments, which can be time-consuming and inconsistent:

**Manual Process**:
1. Read through code changes
2. Think about potential issues
3. Write detailed feedback
4. Format code suggestions
5. Ensure constructive tone

Time investment: 20-30 minutes per PR

### After: With Code Review Skill

Create a skill folder `skills/review-pr/` with a `SKILL.md`:

````markdown
---
name: review-pr
description: 'Generate comprehensive code review with actionable feedback, covering correctness, security, performance, and maintainability'
---

# review-pr

Analyze the current git diff and provide a structured code review with:

**Structure**:
1. **Summary**: Brief overview of changes
2. **Positive Feedback**: What's done well
3. **Issues Found**: Problems categorized by severity (Critical/Major/Minor)
4. **Suggestions**: Specific improvements with code examples
5. **Questions**: Clarifications needed

**Review Focus**:
- Code correctness and logic errors
- Security vulnerabilities
- Performance implications
- Test coverage
- Code style and maintainability
- Error handling
- Documentation needs

**Tone**:
- Be constructive and helpful
- Explain the "why" behind suggestions
- Offer specific fixes, not just critique
- Acknowledge good patterns

**Format**:
Use markdown with code blocks for suggestions. For each issue, provide:
- Clear description of the problem
- Why it matters
- Suggested fix with code example

See [references/review-checklist.md](references/review-checklist.md) for the standard review checklist.

Example format:
## 🔴 Critical Issues

### Missing Input Validation
**Problem**: The `processUser` function doesn't validate the email format.
**Impact**: Could lead to invalid data in the database.
**Fix**:
```typescript
function processUser(user: User) {
  if (!isValidEmail(user.email)) {
    throw new ValidationError('Invalid email format');
  }
  // ... rest of function
}
```
````

Using this skill on a PR (via `/review-pr` or agent invocation) generates structured, actionable feedback:

````markdown
## Summary
This PR adds user authentication with JWT tokens. The implementation includes login, token generation, and middleware for protected routes.

## 🎉 Positive Feedback
- Good separation of concerns with separate auth service and middleware
- Comprehensive error handling in the login flow
- Clear function naming that makes the code self-documenting

## 🔴 Critical Issues

### 1. Hardcoded Secret Key
**Problem**: The JWT secret is hardcoded in `auth.service.ts`:
```typescript
const secret = 'my-secret-key'; // ❌ Hardcoded
```
**Impact**: Security vulnerability - secrets should never be in source code.
**Fix**:
```typescript
const secret = process.env.JWT_SECRET;
if (!secret) {
  throw new Error('JWT_SECRET environment variable is required');
}
```

### 2. Missing Password Hashing Salt Rounds
**Problem**: Password hashing uses default bcrypt rounds which may be too low.
**Impact**: Weak password protection if defaults are insufficient.
**Fix**:
```typescript
const SALT_ROUNDS = 12; // Explicit configuration
const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
```

## ⚠️ Major Issues

### 3. No Token Expiration Validation
**Problem**: The auth middleware doesn't check token expiration explicitly.
**Impact**: Expired tokens might be accepted if JWT library doesn't verify.
**Fix**: Add explicit expiration check in the middleware.

## 💡 Suggestions

### 4. Consider Adding Refresh Tokens
The current implementation uses only access tokens. Consider implementing refresh tokens for better security and user experience:
- Short-lived access tokens (15 minutes)
- Longer-lived refresh tokens (7 days)
- Token rotation on refresh

### 5. Add Rate Limiting
The login endpoint should have rate limiting to prevent brute force attacks:
```typescript
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again later'
});

app.post('/login', loginLimiter, authController.login);
```

## ❓ Questions
1. What's the intended token expiration time for production?
2. Should we implement token revocation for logout functionality?
3. Are there plans for multi-factor authentication in the future?
````

**Benefits**:
- Consistent review quality
- Faster review process (5-10 minutes)
- Structured, actionable feedback
- Includes code examples for fixes
- Identifies security issues systematically
- Maintains constructive tone

## Key Takeaways

These examples demonstrate how customization transforms GitHub Copilot from a general-purpose assistant into a team-specific expert:

1. **Instructions** embed your team's patterns into every suggestion automatically
2. **Skills** standardize workflows with bundled resources and enable agent discovery
3. **Agents** bring specialized expertise for complex domains
4. **Combination** of all three creates a comprehensive development assistant

The investment in creating customizations pays dividends through:
- Faster development with fewer manual corrections
- Consistent code quality across the team
- Automatic adherence to best practices
- Reduced onboarding time for new team members
- Better security and maintainability


