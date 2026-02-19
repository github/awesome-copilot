---
name: project-workflow-analysis-blueprint-generator
description: 'Comprehensive technology-agnostic prompt generator for documenting end-to-end application workflows. Automatically detects project architecture patterns, technology stacks, and data flow patterns to generate detailed implementation blueprints covering entry points, service layers, data access, error handling, and testing approaches across multiple technologies including .NET, Java/Spring, React, and microservices architectures.'
---

# Project Workflow Documentation Generator

## Configuration Variables

```
${PROJECT_TYPE="Auto-detect|.NET|Java|Spring|Node.js|Python|React|Angular|Microservices|Other"}
<!-- Primary technology stack -->

${ENTRY_POINT="API|GraphQL|Frontend|CLI|Message Consumer|Scheduled Job|Custom"}
<!-- Starting point for the flow -->

${PERSISTENCE_TYPE="Auto-detect|SQL Database|NoSQL Database|File System|External API|Message Queue|Cache|None"}
<!-- Data storage type -->

${ARCHITECTURE_PATTERN="Auto-detect|Layered|Clean|CQRS|Microservices|MVC|MVVM|Serverless|Event-Driven|Other"}
<!-- Primary architecture pattern -->

${WORKFLOW_COUNT=1-5}
<!-- Number of workflows to document -->

${DETAIL_LEVEL="Standard|Implementation-Ready"}
<!-- Level of implementation detail to include -->

${INCLUDE_SEQUENCE_DIAGRAM=true|false}
<!-- Generate sequence diagram -->

${INCLUDE_TEST_PATTERNS=true|false}
<!-- Include testing approach -->
```

## Generated Prompt

```
"Analyze the codebase and document ${WORKFLOW_COUNT} representative end-to-end workflows 
that can serve as implementation templates for similar features. Use the following approach:
```

### Initial Detection Phase

```
${PROJECT_TYPE == "Auto-detect" ? 
  "Begin by examining the codebase structure to identify technologies:
   - Check for .NET solutions/projects, Spring configurations, Node.js/Express files, etc.
   - Identify the primary programming language(s) and frameworks in use
   - Determine the architectural patterns based on folder structure and key components" 
  : "Focus on ${PROJECT_TYPE} patterns and conventions"}
```

```
${ENTRY_POINT == "Auto-detect" ? 
  "Identify typical entry points by looking for:
   - API controllers or route definitions
   - GraphQL resolvers
   - UI components that initiate network requests
   - Message handlers or event subscribers
   - Scheduled job definitions" 
  : "Focus on ${ENTRY_POINT} entry points"}
```

```
${PERSISTENCE_TYPE == "Auto-detect" ? 
  "Determine persistence mechanisms by examining:
   - Database context/connection configurations
   - Repository implementations
   - ORM mappings
   - External API clients
   - File system interactions" 
  : "Focus on ${PERSISTENCE_TYPE} interactions"}
```

### Workflow Documentation Instructions

For each of the `${WORKFLOW_COUNT}` most representative workflow(s) in the system:

#### 1. Workflow Overview
   - Provide a name and brief description of the workflow
   - Explain the business purpose it serves
   - Identify the triggering action or event
   - List all files/classes involved in the complete workflow

#### 2. Entry Point Implementation

**API Entry Points:**
```
${ENTRY_POINT == "API" || ENTRY_POINT == "Auto-detect" ? 
  "- Document the API controller class and method that receives the request
   - Show the complete method signature including attributes/annotations
   - Include the full request DTO/model class definition
   - Document validation attributes and custom validators
   - Show authentication/authorization attributes and checks" : ""}
```

**GraphQL Entry Points:**
```
${ENTRY_POINT == "GraphQL" || ENTRY_POINT == "Auto-detect" ? 
  "- Document the GraphQL resolver class and method
   - Show the complete schema definition for the query/mutation
   - Include input type definitions
   - Show resolver method implementation with parameter handling" : ""}
```

**Frontend Entry Points:**
```
${ENTRY_POINT == "Frontend" || ENTRY_POINT == "Auto-detect" ? 
  "- Document the component that initiates the API call
   - Show the event handler that triggers the request
   - Include the API client service method
   - Show state management code related to the request" : ""}
```

**Message Consumer Entry Points:**
```
${ENTRY_POINT == "Message Consumer" || ENTRY_POINT == "Auto-detect" ? 
  "- Document the message handler class and method
   - Show message subscription configuration
   - Include the complete message model definition
   - Show deserialization and validation logic" : ""}
```

#### 3. Service Layer Implementation
   - Document each service class involved with their dependencies
   - Show the complete method signatures with parameters and return types
   - Include actual method implementations with key business logic
   - Document interface definitions where applicable
   - Show dependency injection registration patterns

**CQRS Patterns:**
```
${ARCHITECTURE_PATTERN == "CQRS" || ARCHITECTURE_PATTERN == "Auto-detect" ? 
  "- Include complete command/query handler implementations" : ""}
```

**Clean Architecture Patterns:**
```
${ARCHITECTURE_PATTERN == "Clean" || ARCHITECTURE_PATTERN == "Auto-detect" ? 
  "- Show use case/interactor implementations" : ""}
```

#### 4. Data Mapping Patterns
   - Document DTO to domain model mapping code
   - Show object mapper configurations or manual mapping methods
   - Include validation logic during mapping
   - Document any domain events created during mapping

#### 5. Data Access Implementation
   - Document repository interfaces and their implementations
   - Show complete method signatures with parameters and return types
   - Include actual query implementations
   - Document entity/model class definitions with all properties
   - Show transaction handling patterns

**SQL Database Patterns:**
```
${PERSISTENCE_TYPE == "SQL Database" || PERSISTENCE_TYPE == "Auto-detect" ? 
  "- Include ORM configurations, annotations, or Fluent API usage
   - Show actual SQL queries or ORM statements" : ""}
```

**NoSQL Database Patterns:**
```
${PERSISTENCE_TYPE == "NoSQL Database" || PERSISTENCE_TYPE == "Auto-detect" ? 
  "- Show document structure definitions
   - Include document query/update operations" : ""}
```

#### 6. Response Construction
   - Document response DTO/model class definitions
   - Show mapping from domain/entity models to response models
   - Include status code selection logic
   - Document error response structure and generation

#### 7. Error Handling Patterns
   - Document exception types used in the workflow
   - Show try/catch patterns at each layer
   - Include global exception handler configurations
   - Document error logging implementations
   - Show retry policies or circuit breaker patterns
   - Include compensating actions for failure scenarios

#### 8. Asynchronous Processing Patterns
   - Document background job scheduling code
   - Show event publication implementations
   - Include message queue sending patterns
   - Document callback or webhook implementations
   - Show how async operations are tracked and monitored

**Testing Approach (Optional):**
```
${INCLUDE_TEST_PATTERNS ? 
  "9. **Testing Approach**
     - Document unit test implementations for each layer
     - Show mocking patterns and test fixture setup
     - Include integration test implementations
     - Document test data generation approaches
     - Show API/controller test implementations" : ""}
```

**Sequence Diagram (Optional):**
```
${INCLUDE_SEQUENCE_DIAGRAM ? 
  "10. **Sequence Diagram**
      - Generate a detailed sequence diagram showing all components
      - Include method calls with parameter types
      - Show return values between components
      - Document conditional flows and error paths" : ""}
```

#### 11. Naming Conventions
Document consistent patterns for:
- Controller naming (e.g., `EntityNameController`)
- Service naming (e.g., `EntityNameService`)
- Repository naming (e.g., `IEntityNameRepository`)
- DTO naming (e.g., `EntityNameRequest`, `EntityNameResponse`)
- Method naming patterns for CRUD operations
- Variable naming conventions
- File organization patterns

#### 12. Implementation Templates
Provide reusable code templates for:
- Creating a new API endpoint following the pattern
- Implementing a new service method
- Adding a new repository method
- Creating new domain model classes
- Implementing proper error handling

### Technology-Specific Implementation Patterns

**.NET Implementation Patterns (if detected):**
```
${PROJECT_TYPE == ".NET" || PROJECT_TYPE == "Auto-detect" ? 
  "- Complete controller class with attributes, filters, and dependency injection
   - Service registration in Startup.cs or Program.cs
   - Entity Framework DbContext configuration
   - Repository implementation with EF Core or Dapper
   - AutoMapper profile configurations
   - Middleware implementations for cross-cutting concerns
   - Extension method patterns
   - Options pattern implementation for configuration
   - Logging implementation with ILogger
   - Authentication/authorization filter or policy implementations" : ""}
```

**Spring Implementation Patterns (if detected):**
```
${PROJECT_TYPE == "Java" || PROJECT_TYPE == "Spring" || PROJECT_TYPE == "Auto-detect" ? 
  "- Complete controller class with annotations and dependency injection
   - Service implementation with transaction boundaries
   - Repository interface and implementation
   - JPA entity definitions with relationships
   - DTO class implementations
   - Bean configuration and component scanning
   - Exception handler implementations
   - Custom validator implementations" : ""}
```

**React Implementation Patterns (if detected):**
```
${PROJECT_TYPE == "React" || PROJECT_TYPE == "Auto-detect" ? 
  "- Component structure with props and state
   - Hook implementation patterns (useState, useEffect, custom hooks)
   - API service implementation
   - State management patterns (Context, Redux)
   - Form handling implementations
   - Route configuration" : ""}
```

### Implementation Guidelines

Based on the documented workflows, provide specific guidance for implementing new features:

#### 1. Step-by-Step Implementation Process
- Where to start when adding a similar feature
- Order of implementation (e.g., model → repository → service → controller)
- How to integrate with existing cross-cutting concerns

#### 2. Common Pitfalls to Avoid
- Identify error-prone areas in the current implementation
- Note performance considerations
- List common bugs or issues encountered

#### 3. Extension Mechanisms
- Document how to plug into existing extension points
- Show how to add new behavior without modifying existing code
- Explain configuration-driven feature patterns

**Conclusion:**
Conclude with a summary of the most important patterns that should be followed when 
implementing new features to maintain consistency with the codebase."
