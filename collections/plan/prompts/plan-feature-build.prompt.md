```prompt
---
mode: 'agent'
description: 'Complete feature implementation prompt that builds the entire feature in VS Code using AI tools (GitHub Copilot, Claude CLI, Gemini CLI, etc.) with full context from all workflow artifacts.'
---

# Feature Build Implementation Prompt

## Goal

Act as a senior full-stack engineer with expertise in the Epoch technology stack. Your task is to take the complete set of feature artifacts from the 6-step development workflow and implement the entire feature in VS Code. You will have access to all planning documents and must build a production-ready feature that follows all established patterns and standards.

## Context Integration

You will be provided with the complete artifact set from the development workflow:

### Planning Documents (Steps 1-2)
- **Epic PRD**: `/docs/ways-of-work/plan/{epic-name}/epic.md`
- **Epic Architecture**: `/docs/ways-of-work/plan/{epic-name}/arch.md`

### Feature Definition (Steps 3-6)
- **Feature PRD**: `/docs/ways-of-work/plan/{epic-name}/{feature-name}/prd.md`
- **UX Design Specification**: `/docs/ways-of-work/plan/{epic-name}/{feature-name}/design.md`
- **Implementation Plan**: `/docs/ways-of-work/plan/{epic-name}/{feature-name}/implementation-plan.md`
- **Test Strategy**: `/docs/ways-of-work/plan/{epic-name}/{feature-name}/test-strategy.md`

### Additional Context
- **Project Plan**: `/docs/ways-of-work/plan/{epic-name}/{feature-name}/project-plan.md`
- **GitHub Issues Checklist**: `/docs/ways-of-work/plan/{epic-name}/{feature-name}/github-issues-checklist.md`

## Technology Stack Requirements

### Core Technologies
- **TypeScript**: Strict mode with comprehensive type safety
- **Next.js**: App Router with latest patterns (not Pages Router)
- **React**: Modern hooks and patterns with Server Components where appropriate
- **Turborepo**: Monorepo structure with proper package organization
- **tRPC**: Type-safe API communication between frontend and backend
- **Stack Auth**: Authentication flows and user management
- **Drizzle ORM**: Database interactions with type-safe queries
- **PostgreSQL**: Primary database with proper schema design
- **Qdrant**: Vector database for AI/ML features
- **Docker**: Containerization for all services

### UI/UX Technologies
- **shadcn/ui**: Component library for consistent UI patterns
- **Tailwind CSS**: Utility-first styling with design system tokens
- **Radix UI**: Headless components for accessibility
- **Lucide React**: Icon library
- **Framer Motion**: Animations and micro-interactions

### Testing Technologies
- **Vitest**: Unit and integration testing
- **Playwright**: End-to-end testing with browser automation
- **Testing Library**: Component testing utilities
- **MSW**: API mocking for testing

### Development Tools
- **ESLint**: Code linting with project-specific rules
- **Prettier**: Code formatting
- **TypeScript**: Type checking
- **Docker Compose**: Local development environment

## Implementation Requirements

### 1. Database Implementation

**Database Schema Creation:**
- Create Drizzle schema files in `packages/db/src/schema/`
- Include proper relationships, indexes, and constraints
- Generate and run migrations
- Implement seed data if required

**Example Structure:**
```

packages/db/src/schema/
├── {feature-name}.ts
├── index.ts (export new schemas)
└── relations.ts (if complex relationships)

```

### 2. API Implementation

**tRPC Router Creation:**
- Create feature-specific routers in `apps/api/src/routers/`
- Implement all CRUD operations with proper validation
- Include authentication/authorization checks
- Add comprehensive error handling

**Example Structure:**
```

apps/api/src/routers/
├── {feature-name}.ts
└── index.ts (export new router)

```

### 3. Frontend Implementation

**Component Development:**
- Create feature components in appropriate packages
- Use shadcn/ui components as building blocks
- Implement responsive design patterns
- Add proper TypeScript interfaces

**Page Implementation:**
- Create Next.js App Router pages in `apps/web/src/app/`
- Implement proper loading states and error boundaries
- Add metadata and SEO optimization
- Include proper authentication guards

**Example Structure:**
```

apps/web/src/app/
├── {feature-name}/
│ ├── page.tsx
│ ├── loading.tsx
│ ├── error.tsx
│ └── components/
└── api/trpc/[trpc]/route.ts (if API routes needed)

packages/ui/src/components/
├── {feature-name}/
│ ├── {component-name}.tsx
│ ├── index.ts
│ └── {component-name}.stories.tsx (Storybook)

```

### 4. State Management

**Client State:**
- Implement Zustand stores for complex client state
- Use React Query/TanStack Query for server state
- Include proper TypeScript types for all state

**Server State:**
- Leverage tRPC's built-in caching and synchronization
- Implement optimistic updates where appropriate
- Add proper invalidation strategies

### 5. Testing Implementation

**Unit Tests:**
- Create Vitest tests for all utility functions and hooks
- Test components in isolation with Testing Library
- Achieve minimum 80% code coverage

**Integration Tests:**
- Test API endpoints with proper mocking
- Test component integration with real data flows
- Include authentication and authorization testing

**E2E Tests:**
- Implement Playwright tests based on test strategy
- Cover critical user journeys end-to-end
- Include accessibility testing with axe-core

**Example Test Structure:**
```

tests/
├── unit/
│ ├── {feature-name}/
│ └── **mocks**/
├── integration/
│ └── {feature-name}/
└── e2e/
└── {feature-name}/

````

### 6. Documentation

**Code Documentation:**
- Add comprehensive JSDoc comments
- Document complex business logic
- Include usage examples for reusable components

**README Updates:**
- Update relevant package READMEs
- Add feature documentation to main README
- Include setup and configuration instructions

## Quality Standards

### Code Quality
- **Type Safety**: 100% TypeScript coverage with strict mode
- **Linting**: Zero ESLint errors or warnings
- **Formatting**: Consistent Prettier formatting
- **Testing**: Minimum 80% test coverage
- **Performance**: Lighthouse scores >90 for all metrics

### Architecture Standards
- **Domain-Driven Design**: Proper separation of concerns
- **SOLID Principles**: Clean, maintainable code structure
- **Error Handling**: Comprehensive error boundaries and logging
- **Security**: Proper input validation and sanitization
- **Accessibility**: WCAG 2.1 AA compliance

### Deployment Standards
- **Docker**: Proper containerization for all services
- **Environment Config**: Proper environment variable management
- **CI/CD Ready**: Code ready for automated deployment
- **Monitoring**: Proper logging and error tracking integration

## Implementation Process

### Phase 1: Foundation Setup
1. **Database**: Create schema, migrations, and seed data
2. **API**: Implement tRPC routers with basic CRUD operations
3. **Types**: Create shared TypeScript interfaces and types

### Phase 2: Core Implementation
1. **Components**: Build UI components using shadcn/ui patterns
2. **Pages**: Implement Next.js pages with proper routing
3. **State**: Add client and server state management
4. **Integration**: Connect frontend to API with tRPC

### Phase 3: Quality & Testing
1. **Unit Tests**: Comprehensive component and utility testing
2. **Integration Tests**: API and data flow testing
3. **E2E Tests**: Critical user journey validation
4. **Performance**: Optimization and Lighthouse auditing

### Phase 4: Documentation & Deployment
1. **Documentation**: Code comments and README updates
2. **Docker**: Service containerization and compose configuration
3. **Validation**: Full feature testing and quality gates
4. **Deployment**: Production-ready deployment configuration

## Validation Checklist

Before marking the feature complete, ensure:

- [ ] All requirements from the PRD are implemented
- [ ] UX design specification is faithfully implemented
- [ ] Implementation plan technical requirements are met
- [ ] Test strategy is fully executed with passing tests
- [ ] Code follows all project standards and patterns
- [ ] TypeScript compilation passes with zero errors
- [ ] All linting and formatting checks pass
- [ ] Docker containers build and run successfully
- [ ] Documentation is complete and accurate
- [ ] Feature integrates properly with existing system
- [ ] Performance meets established benchmarks
- [ ] Accessibility requirements are met
- [ ] Security requirements are implemented

## Context Template

To use this prompt effectively, provide:

```markdown
## Feature Context

**Epic Name**: {epic-name}
**Feature Name**: {feature-name}

### Artifact Documents

1. **Epic PRD**: [Attach epic.md content]
2. **Epic Architecture**: [Attach arch.md content]
3. **Feature PRD**: [Attach prd.md content]
4. **UX Design**: [Attach design.md content]
5. **Implementation Plan**: [Attach implementation-plan.md content]
6. **Test Strategy**: [Attach test-strategy.md content]

### Additional Context

- **Project Plan**: [Attach project-plan.md if available]
- **Existing Codebase**: [Current state of relevant packages/apps]
- **Environment**: [Development environment specifics]
- **Timeline**: [Implementation deadline or sprint information]

### Special Requirements

- [Any additional constraints or requirements not captured in artifacts]
- [Integration points with existing features]
- [Performance or scalability considerations]
````

## Expected Output

Upon completion, the AI tool should have:

1. **Implemented** the complete feature across all layers (database, API, frontend)
2. **Created** comprehensive tests covering unit, integration, and E2E scenarios
3. **Updated** all relevant documentation and configuration files
4. **Validated** that the feature meets all quality standards and requirements
5. **Provided** a summary of what was built and how to run/test it

The feature should be production-ready and seamlessly integrated with the existing Epoch platform.

```

```
