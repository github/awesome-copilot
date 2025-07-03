---
description: '.NET MAUI component and application patterns'
applyTo: '**/*.xaml, **/*.cs'
---

# .NET MAUI

## .NET MAUI Code Style and Structure

- Write idiomatic and efficient .NET MAUI and C# code.
- Follow .NET and .NET MAUI conventions.
- Prefer inline functions for smaller components but separate complex logic into code-behind or service classes.
- Async/await should be used where applicable to ensure non-blocking UI operations.

## Naming Conventions

- Follow PascalCase for component names, method names, and public members.
- Use camelCase for private fields and local variables.
- Prefix interface names with "I" (e.g., IUserService).

## .NET MAUI and .NET Specific Guidelines

- Utilize .NET MAUI's built-in features for component lifecycle (e.g. OnAppearing, OnDisappearing).
- Use data binding effectively with {Binding}.
- Structure .NET MAUI components and services following Separation of Concerns.
- Always use the latest version C#, currently C# 13 features like record types, pattern matching, and global usings.

## Error Handling and Validation

- Implement proper error handling for .NET MAUI pages and API calls.
- Use logging for error tracking in the backend and consider capturing UI-level errors in MAUI with tools like MAUI Community Toolkit's Logger.
- Implement validation using FluentValidation or DataAnnotations in forms.

## MAUI API and Performance Optimization

- Utilize MAUI's built-in features for component lifecycle (e.g. OnAppearing, OnDisappearing).
- Use asynchronous methods (async/await) for API calls or UI actions that could block the main thread.
- Optimize MAUI components by reducing unnecessary renders and using OnPropertyChanged() efficiently.
- Minimize the component render tree by avoiding re-renders unless necessary, using BatchBegin() and BatchCommit() where appropriate.

## Caching Strategies

- Implement in-memory caching for frequently used data, especially for MAUI apps. Use IMemoryCache for lightweight caching solutions.
- Consider Distributed Cache strategies (like Redis or SQL Server Cache) for larger applications that need shared state across multiple users or clients.
- Cache API calls by storing responses to avoid redundant calls when data is unlikely to change, thus improving the user experience.

## State Management Libraries

- Use dependency injection and the .NET MAUI Community Toolkit for state sharing across components.

## API Design and Integration

- Use HttpClient or other appropriate services to communicate with external APIs or your own backend.
- Implement error handling for API calls using try-catch and provide proper user feedback in the UI.

## Testing and Debugging

- Test components and services using xUnit, NUnit, or MSTest.
- Use Moq or NSubstitute for mocking dependencies during tests.

## Security and Authentication

- Implement Authentication and Authorization in the MAUI app where necessary using OAuth or JWT tokens for API authentication.
- Use HTTPS for all web communication and ensure proper CORS policies are implemented.

## API Documentation and Swagger

- Use Swagger/OpenAPI for API documentation for your backend API services.
- Ensure XML documentation for models and API methods for enhancing Swagger documentation.
