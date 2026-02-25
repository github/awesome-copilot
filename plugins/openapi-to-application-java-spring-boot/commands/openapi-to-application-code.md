---
agent: 'agent'
description: 'Generate a complete, production-ready application from an OpenAPI specification'
model: 'GPT-4.1'
tools: ['codebase', 'edit/editFiles', 'search/codebase']
---

# Generate Application from OpenAPI Spec

Your goal is to generate a complete, working application from an OpenAPI specification using the active framework's conventions and best practices.

## Input Requirements

1. **OpenAPI Specification**: Provide either:
   - A URL to the OpenAPI spec (e.g., `https://api.example.com/openapi.json`)
   - A local file path to the OpenAPI spec
   - The full OpenAPI specification content pasted directly

2. **Project Details** (if not in spec):
   - Project name and description
   - Target framework and version
   - Package/namespace naming conventions
   - Authentication method (if not specified in OpenAPI)

## Generation Process

### Step 1: Analyze the OpenAPI Specification
- Validate the OpenAPI spec for completeness and correctness
- Identify all endpoints, HTTP methods, request/response schemas
- Extract authentication requirements and security schemes
- Note data model relationships and constraints
- Flag any ambiguities or incomplete definitions

### Step 2: Design Application Architecture
- Plan directory structure appropriate for the framework
- Identify controller/handler grouping by resource or domain
- Design service layer organization for business logic
- Plan data models and entity relationships
- Design configuration and initialization strategy

### Step 3: Generate Application Code
- Create project structure with build/package configuration files
- Generate models/DTOs from OpenAPI schemas
- Generate controllers/handlers with route mappings
- Generate service layer with business logic
- Generate repository/data access layer if applicable
- Add error handling, validation, and logging
- Generate configuration and startup code

### Step 4: Add Supporting Files
- Generate appropriate unit tests for services and controllers
- Create README with setup and running instructions
- Add .gitignore and environment configuration templates
- Generate API documentation files
- Create example requests/integration tests

## Output Structure

The generated application will include:

```
project-name/
├── README.md                      # Setup and usage instructions
├── [build-config]                 # Framework-specific build files (pom.xml, build.gradle, package.json, etc.)
├── src/
│   ├── main/
│   │   ├── [language]/
│   │   │   ├── controllers/       # HTTP endpoint handlers
│   │   │   ├── services/          # Business logic
│   │   │   ├── models/            # Data models and DTOs
│   │   │   ├── repositories/      # Data access (if applicable)
│   │   │   └── config/            # Application configuration
│   │   └── resources/             # Configuration files
│   └── test/
│       ├── [language]/
│       │   ├── controllers/       # Controller tests
│       │   └── services/          # Service tests
│       └── resources/             # Test configuration
├── .gitignore
├── .env.example                   # Environment variables template
└── docker-compose.yml             # Optional: Docker setup (if applicable)
```

## Best Practices Applied

- **Framework Conventions**: Follows framework-specific naming, structure, and patterns
- **Separation of Concerns**: Clear layers with controllers, services, and repositories
- **Error Handling**: Comprehensive error handling with meaningful responses
- **Validation**: Input validation and schema validation throughout
- **Logging**: Structured logging for debugging and monitoring
- **Testing**: Unit tests for services and controllers
- **Documentation**: Inline code documentation and setup instructions
- **Security**: Implements authentication/authorization from OpenAPI spec
- **Scalability**: Design patterns support growth and maintenance

## Next Steps

After generation:

1. Review the generated code structure and make customizations as needed
2. Install dependencies according to framework requirements
3. Configure environment variables and database connections
4. Run tests to verify generated code
5. Start the development server
6. Test endpoints using the provided examples

## Questions to Ask if Needed

- Should the application include database/ORM setup, or just in-memory/mock data?
- Do you want Docker configuration for containerization?
- Should authentication be JWT, OAuth2, API keys, or basic auth?
- Do you need integration tests or just unit tests?
- Any specific database technology preferences?
- Should the API include pagination, filtering, and sorting examples?
