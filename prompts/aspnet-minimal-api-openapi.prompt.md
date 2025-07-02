---
mode: 'agent'
tools: ['changes', 'codebase', 'editFiles', 'problems']
description: 'Create ASP.NET Minimal API endpoints with proper OpenAPI documentation'
---

Your goal is to help me create well-structured ASP.NET Minimal API endpoints with correct types and comprehensive OpenAPI/Swagger documentation.

## API Organization

- Group related endpoints using `MapGroup()` extension
- Use endpoint filters for cross-cutting concerns
- Structure larger APIs with separate endpoint classes
- Consider using a feature-based folder structure for complex APIs

## Request and Response Types

- Define explicit request and response DTOs/models
- Create clear model classes with proper validation attributes
- Use record types for immutable request/response objects
- Use meaningful property names that align with API design standards
- Apply `[Required]` and other validation attributes to enforce constraints

## Type Handling

- Use strongly-typed route parameters with explicit type binding
- Apply proper parameter binding with `[FromBody]`, `[FromRoute]`, `[FromQuery]`
- Use `Results<T1, T2>` to represent multiple response types
- Return `TypedResults` instead of `Results` for strongly-typed responses
- Leverage C# 10+ features like nullable annotations and init-only properties

## OpenAPI / Swagger Documentation

- Add explicit OpenAPI operation details with `.WithOpenApi()`
- Define operation summary and description
- Document response types with `.Produces<T>(statusCode)`
- Document request bodies with `.WithRequestBody()`
- Set proper content types for requests and responses
- Include examples using `SwaggerRequestExampleAttribute`
- Document authentication requirements with `.RequireAuthorization()`
- Use XML documentation comments for descriptive API documentation
