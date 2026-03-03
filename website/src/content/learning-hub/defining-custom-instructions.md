---
title: 'Defining Custom Instructions'
description: 'Learn how to create persistent, context-aware instructions that guide GitHub Copilot automatically across your codebase.'
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: '2025-12-02'
estimatedReadingTime: '8 minutes'
tags:
  - instructions
  - customization
  - fundamentals
relatedArticles:
  - ./what-are-agents-skills-instructions.md
  - ./creating-effective-skills.md
  - ./copilot-configuration-basics.md
prerequisites:
  - Basic understanding of GitHub Copilot features
---

Custom instructions are persistent configuration files that automatically guide GitHub Copilot's behavior when working with specific files or directories in your codebase. Unlike skills that require explicit invocation (by a user or an agent), instructions work silently in the background, ensuring Copilot consistently follows your team's standards, conventions, and architectural decisions.

This article explains how to create effective custom instructions, when to use them, and how they integrate with your development workflow.

## What Are Custom Instructions?

Custom instructions are markdown files (`.instructions.md`) that contain:

- **Coding standards**: Naming conventions, formatting rules, style guidelines
- **Framework-specific guidance**: Best practices for your tech stack
- **Architecture decisions**: Project structure, design patterns, conventions
- **Compliance requirements**: Security policies, regulatory constraints

**Key Points**:
- Instructions apply automatically when Copilot works on matching files
- They persist across all chat sessions and inline completions
- They can be scoped globally, per language, or per directory using glob patterns
- They help Copilot understand your codebase's unique context without manual prompting

### How Instructions Differ from Other Customizations

**Instructions vs Skills**:
- Instructions are always active for matching files; skills require explicit invocation (by users or agents)
- Instructions provide passive context; skills drive specific tasks with bundled resources
- Use instructions for standards that apply repeatedly; use skills for on-demand operations

**Instructions vs Agents**:
- Instructions are lightweight context; agents are specialized personas with tool access
- Instructions work with any Copilot interaction; agents require explicit selection
- Use instructions for coding standards; use agents for complex workflows with tooling needs

## Creating Your First Custom Instruction

Custom instructions follow a simple structure with YAML frontmatter and markdown content.

**Example**:

````markdown
---
description: 'TypeScript coding standards for React components'
applyTo: '**/*.tsx, **/*.ts'
---

# TypeScript React Development

Use functional components with TypeScript interfaces for all props.

## Naming Conventions

- Component files: PascalCase (e.g., `UserProfile.tsx`)
- Hook files: camelCase with `use` prefix (e.g., `useAuth.ts`)
- Type files: PascalCase with descriptive names (e.g., `UserTypes.ts`)

## Component Structure

Always define prop interfaces explicitly:

```typescript
interface UserProfileProps {
  userId: string;
  onUpdate: (user: User) => void;
}

export function UserProfile({ userId, onUpdate }: UserProfileProps) {
  // Implementation
}
```
````

## Best Practices

- Export types separately for reuse across components
- Use React.FC only when children typing is needed
- Prefer named exports over default exports

**Why This Works**:
- The `applyTo` glob pattern targets TypeScript/TSX files specifically
- Copilot reads these instructions whenever it generates or suggests code for matching files
- Standards are enforced consistently without developers needing to remember every rule
- New team members benefit from institutional knowledge automatically

## Scoping Instructions Effectively

The `applyTo` field determines which files receive the instruction's guidance.

### Common Scoping Patterns

**All TypeScript files**:
```yaml
applyTo: '**/*.ts, **/*.tsx'
```

**Specific directory**:
```yaml
applyTo: 'src/components/**/*.tsx'
```

**Test files only**:
```yaml
applyTo: '**/*.test.ts, **/*.spec.ts'
```

**Single technology**:
```yaml
applyTo: '**/*.py'
```

**Entire project**:
```yaml
applyTo: '**'
```

**Expected Result**:
When you work on a file matching the pattern, Copilot incorporates that instruction's context into suggestions and chat responses automatically.

## Real Examples from the Repository

The awesome-copilot-hub repository includes over 120 instruction files demonstrating real-world patterns.

### Security Standards

See [security-and-owasp.instructions.md](https://github.com/github/awesome-copilot/blob/main/instructions/security-and-owasp.instructions.md) for comprehensive security guidance:

```markdown
---
description: 'OWASP Top 10 security practices for all code'
applyTo: '**'
---

# Security and OWASP Best Practices

Always validate and sanitize user input before processing.

## Input Validation

- Whitelist acceptable input patterns
- Reject unexpected formats early
- Never trust client-side validation alone
- Use parameterized queries for database operations
```

This instruction applies to all files (`applyTo: '**'`), ensuring security awareness in every suggestion.

### Framework-Specific Guidance

See [reactjs.instructions.md](https://github.com/github/awesome-copilot/blob/main/instructions/reactjs.instructions.md) for React-specific patterns:

```markdown
---
description: 'React development best practices and patterns'
applyTo: '**/*.jsx, **/*.tsx'
---

# React Development Guidelines

Use functional components with hooks for all new components.

## State Management

- Use `useState` for local component state
- Use `useContext` for shared state across components
- Consider Redux only for complex global state
- Avoid prop drilling beyond 2-3 levels
```

This instruction targets only React component files, providing context-specific guidance.

### Testing Standards

See [playwright-typescript.instructions.md](https://github.com/github/awesome-copilot/blob/main/instructions/playwright-typescript.instructions.md) for test automation patterns:

````markdown
---
description: 'Playwright test automation with TypeScript'
applyTo: '**/*.spec.ts, **/tests/**/*.ts'
---

# Playwright Testing Standards

Write descriptive test names that explain the expected behavior.

## Test Structure

```typescript
test('should display error message when login fails', async ({ page }) => {
  await page.goto('/login');
  await page.fill('#username', 'invalid');
  await page.fill('#password', 'invalid');
  await page.click('#submit');
  
  await expect(page.locator('.error')).toBeVisible();
});
```
````

This instruction applies only to test files, ensuring test-specific context.

## Structuring Instruction Content

### Effective Organization

A well-structured instruction file includes:

1. **Clear title and overview**: What this instruction covers
2. **Specific guidelines**: Actionable rules, not vague suggestions
3. **Code examples**: Working snippets showing correct patterns
4. **Explanations**: Why certain approaches are preferred

### Writing Style Best Practices

- **Be specific**: "Use PascalCase for component names" instead of "name components well"
- **Show examples**: Include working code snippets demonstrating patterns
- **Explain reasoning**: Brief context helps Copilot understand intent
- **Stay concise**: Focus on what matters most; avoid exhaustive documentation

**Example - Vague vs Specific**:

❌ **Vague**: "Handle errors properly"

✅ **Specific**:
````markdown
## Error Handling

Wrap async operations in try-catch blocks and log errors:

```typescript
try {
  const data = await fetchUser(userId);
  return data;
} catch (error) {
  logger.error('Failed to fetch user', { userId, error });
  throw new UserNotFoundError(userId);
}
```
````

## Common Questions

**Q: How many instructions should I create?**

A: Start with 3-5 core instructions covering your most important standards (naming, structure, security). Add more as patterns emerge. Having 10-20 instructions for a medium-sized project is reasonable. Awesome Copilot repository contains over 120 to demonstrate the range of possibilities.

**Q: Do instructions slow down Copilot?**

A: No. Instructions are processed efficiently as part of Copilot's context window. Keep individual files focused (under 500 lines) for best results, and ensure that they are scoped appropriately.

**Q: Can instructions contradict each other?**

A: If multiple instructions apply to the same file, Copilot considers all of them. Avoid contradictions by keeping instructions focused and using specific `applyTo` patterns. More specific patterns take precedence mentally, but it's best to design complementary instructions.

**Q: How do I know if my instructions are working?**

A: Test by asking Copilot to generate code matching your patterns. If it follows your standards without explicit prompting, the instructions are effective. You can also reference the instruction explicitly in chat: "Following the TypeScript standards in my instructions, create a user component."

**Q: Should I document everything in instructions?**

A: No. Instructions are for persistent standards that apply repeatedly. Document one-off decisions in code comments. Use instructions for patterns you want Copilot to follow automatically.

## Best Practices

- **One purpose per file**: Create separate instructions for different concerns (security, testing, styling)
- **Use clear naming**: Name files descriptively: `react-component-standards.instructions.md`, not `rules.instructions.md`
- **Include examples**: Every guideline should have at least one code example
- **Keep it current**: Review instructions when dependencies or frameworks update
- **Test your instructions**: Generate code and verify Copilot follows the patterns
- **Link to documentation**: Reference official docs for detailed explanations
- **Use tables for rules**: Tabular format works well for naming conventions and comparisons

## Common Pitfalls to Avoid

- ❌ **Too generic**: "Write clean code" doesn't give Copilot actionable guidance  
  ✅ **Instead**: Provide specific patterns: "Extract functions longer than 20 lines into smaller, named functions"

- ❌ **Too verbose**: Including entire documentation pages overwhelms the context window  
  ✅ **Instead**: Distill key patterns and link to full documentation

- ❌ **Contradictory rules**: Different instructions suggesting opposite approaches  
  ✅ **Instead**: Design complementary instructions with clear scopes

- ❌ **Outdated patterns**: Instructions referencing deprecated APIs or old versions  
  ✅ **Instead**: Review and update instructions when dependencies change

- ❌ **Missing scope**: Using `applyTo: '**'` for language-specific guidelines  
  ✅ **Instead**: Scope to relevant files: `applyTo: '**/*.py'` for Python-specific rules

## Next Steps

Now that you understand custom instructions, you can:

- **Explore Repository Examples**: Browse [Instructions Directory](../../instructions/) - Over 120 real-world examples covering frameworks, languages, and domains
- **Learn About Skills**: [Creating Effective Skills](../creating-effective-skills/) - Discover when to use skills instead of instructions
- **Understand Agents**: [Building Custom Agents](../building-custom-agents/) - See how agents complement instructions for complex workflows
- **Configuration Basics**: [Copilot Configuration Basics](../copilot-configuration-basics/) - Learn how to organize and manage your customizations

**Suggested Reading Order**:
1. This article (defining custom instructions)
2. [Creating Effective Skills](../creating-effective-skills/) - Learn complementary customization type
3. [Building Custom Agents](../building-custom-agents/) - Decision framework for when to use each type
